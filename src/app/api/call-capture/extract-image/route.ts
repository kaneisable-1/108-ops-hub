import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { sendDiscord, sendSMS, getSalesPhones } from '@/lib/notifications'
import type { AITriageResult } from '@/types'

const GHL_API_BASE = 'https://services.leadconnectorhq.com'

const VISION_SYSTEM_PROMPT = `You are the AI triage system for 108 Performance, a premier baseball and softball training academy in Knoxville, TN. You are analyzing a screenshot of a lead message (text, DM, form submission, etc). Extract all contact and athlete information visible in the image.

108 Performance Services:
- 108 Experience (2-5 day fly-in intensive, $2,000-$4,000)
- Tri Star (monthly local training, $499/mo)
- Virtual Training (remote video analysis)
- Virtual Pro (advanced remote)
- College Prep (recruiting preparation)
- Draft Prep (MLB draft preparation)
- Pro Experience (professional player training)
- Coaches Experience (coach training)
- Coaches Mentorship (ongoing coach development)
- Tour Experience (group events)
- Powered by 108 (facility licensing)
- Partnership (business partnerships)
- Performance Institute (academy enrollment)

Classification Rules:
- HOT: Ready to book, mentions specific dates/program, expresses urgency
- WARM: Has questions, interested but not committed
- COLD: Just browsing, very early stage

Queue Rules:
- call_now: HOT leads, parents asking to book
- follow_up: WARM leads, has questions
- nurture: COLD leads, early stage
- not_a_fit: Wrong sport, too far away

Return ONLY valid JSON matching the schema below.`

const VISION_USER_PROMPT = `Look at this screenshot and extract all lead/contact information visible. Return JSON with this exact structure:
{
  "extracted": {
    "contact_name": string | null,
    "contact_phone": string | null,
    "contact_email": string | null,
    "athlete_name": string | null,
    "athlete_age": number | null,
    "athlete_position": string | null,
    "athlete_level": "youth" | "middle_school" | "high_school" | "college" | "pro" | null,
    "location": string | null
  },
  "classification": {
    "temperature": "hot" | "warm" | "cold",
    "fit_score": "good_fit" | "maybe" | "not_a_fit",
    "service_match": string,
    "intent": "ready_to_book" | "has_questions" | "just_browsing" | "price_shopping"
  },
  "routing": {
    "queue": "call_now" | "follow_up" | "nurture" | "not_a_fit",
    "priority": number (1-100, higher = more urgent),
    "reason": string
  },
  "content": {
    "summary": string (2-3 sentence summary of what's visible),
    "suggested_response": string (personalized response for sales team),
    "objections": string[],
    "questions": string[]
  },
  "tags": string[]
}`

// Search GHL for existing contact by phone
async function searchGHLContactByPhone(phone: string): Promise<{ id: string; name: string } | null> {
  const apiKey = process.env.GHL_API_KEY
  const locationId = process.env.GHL_LOCATION_ID
  if (!apiKey || !locationId || !phone) return null

  try {
    const url = `${GHL_API_BASE}/contacts/?locationId=${locationId}&query=${encodeURIComponent(phone)}&limit=1`
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Version: '2021-07-28',
      },
    })

    if (res.ok) {
      const data = await res.json()
      const contact = data.contacts?.[0]
      if (contact) {
        return {
          id: contact.id,
          name: [contact.firstName, contact.lastName].filter(Boolean).join(' ') || 'Unknown',
        }
      }
    }
    return null
  } catch {
    return null
  }
}

// Create GHL contact
async function createGHLContact(triage: AITriageResult): Promise<string> {
  const apiKey = process.env.GHL_API_KEY
  const locationId = process.env.GHL_LOCATION_ID
  const fallbackId = `manual_${Date.now()}`
  if (!apiKey || !locationId) return fallbackId

  try {
    const res = await fetch(`${GHL_API_BASE}/contacts/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        Version: '2021-07-28',
      },
      body: JSON.stringify({
        locationId,
        firstName: triage.extracted.contact_name?.split(' ')[0] || '',
        lastName: triage.extracted.contact_name?.split(' ').slice(1).join(' ') || '',
        phone: triage.extracted.contact_phone || '',
        email: triage.extracted.contact_email || '',
        tags: ['108-lead-intel', `temp-${triage.classification.temperature}`],
        source: 'Call Capture - Screenshot',
      }),
    })

    if (res.ok) {
      const data = await res.json()
      return data.contact?.id || fallbackId
    }
    return fallbackId
  } catch {
    return fallbackId
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const imageFile = formData.get('image') as File | null

    if (!imageFile) {
      return NextResponse.json({ error: 'Image is required' }, { status: 400 })
    }

    // Convert to base64
    const bytes = await imageFile.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')
    const mediaType = imageFile.type || 'image/png'

    // Call Claude Vision API
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        system: VISION_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType,
                  data: base64,
                },
              },
              {
                type: 'text',
                text: VISION_USER_PROMPT,
              },
            ],
          },
        ],
      }),
    })

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text()
      console.error('Anthropic Vision API error:', errText)
      return NextResponse.json({ error: 'AI vision processing failed' }, { status: 500 })
    }

    const anthropicData = await anthropicRes.json()
    const responseText = anthropicData.content[0]?.text || ''

    // Parse the JSON from Claude's response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
    }

    const triage: AITriageResult = JSON.parse(jsonMatch[0])

    // Search for existing GHL contact by phone
    let existing_contact: { id: string; name: string } | null = null
    let ghl_contact_id: string

    if (triage.extracted.contact_phone) {
      existing_contact = await searchGHLContactByPhone(triage.extracted.contact_phone)
    }

    if (existing_contact) {
      ghl_contact_id = existing_contact.id
    } else {
      ghl_contact_id = await createGHLContact(triage)
    }

    // Save to Supabase
    const supabase = await createServiceRoleClient()
    const { data: insertedLead, error: dbError } = await supabase
      .from('leads')
      .insert({
        ghl_contact_id,
        contact_name: triage.extracted.contact_name,
        contact_phone: triage.extracted.contact_phone,
        contact_email: triage.extracted.contact_email,
        athlete_name: triage.extracted.athlete_name,
        athlete_age: triage.extracted.athlete_age,
        athlete_position: triage.extracted.athlete_position,
        athlete_level: triage.extracted.athlete_level,
        location: triage.extracted.location,
        lead_temperature: triage.classification.temperature,
        fit_score: triage.classification.fit_score,
        service_match: triage.classification.service_match,
        intent: triage.classification.intent,
        queue: triage.routing.queue,
        priority: triage.routing.priority,
        ai_summary: triage.content.summary,
        original_message: '[Screenshot upload]',
        suggested_response: triage.content.suggested_response,
        channel: 'text',
        tags: triage.tags,
        status: 'new',
      })
      .select('id')
      .single()

    if (dbError) {
      console.error('Supabase insert error:', dbError)
    }

    const lead_id = insertedLead?.id || null

    // Notifications for hot leads
    if (triage.classification.temperature === 'hot') {
      await sendDiscord({
        content: `\u{1F525} **HOT LEAD via Screenshot Capture**`,
        embeds: [
          {
            title: triage.extracted.contact_name || 'New Lead',
            color: 0xff4444,
            fields: [
              { name: 'Phone', value: triage.extracted.contact_phone || 'N/A', inline: true },
              { name: 'Athlete', value: triage.extracted.athlete_name || 'N/A', inline: true },
              { name: 'Service', value: triage.classification.service_match || 'Unknown', inline: true },
              { name: 'Summary', value: triage.content.summary },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
        recipientLabel: 'hot-leads-channel',
        relatedEntityType: 'lead',
        relatedEntityId: lead_id || undefined,
      })

      await sendSMS({
        phones: getSalesPhones(),
        message: `\u{1F525} HOT LEAD: ${triage.extracted.contact_name || 'Unknown'} - ${triage.content.summary.slice(0, 140)}`,
        relatedEntityType: 'lead',
        relatedEntityId: lead_id || undefined,
      })
    }

    return NextResponse.json({
      triage,
      ghl_contact_id,
      lead_id,
      existing_contact,
    })
  } catch (err) {
    console.error('Screenshot capture error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
