import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import type { AITriageResult } from '@/types'

const TRIAGE_SYSTEM_PROMPT = `You are the AI triage system for 108 Performance, a premier baseball and softball training academy in Knoxville, TN. Analyze the provided lead message and extract structured information.

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
- HOT: Ready to book, mentions specific dates/program, expresses urgency, says "I want to sign up"
- WARM: Has questions, interested but not committed, asking about pricing/availability
- COLD: Just browsing, very early stage, no specific interest

Queue Rules:
- call_now: HOT leads, parents asking to book, mentions travel plans
- follow_up: WARM leads, has questions, needs nurturing
- nurture: COLD leads, early stage, info seekers
- not_a_fit: Wrong sport, too far away, not serious

Return ONLY valid JSON matching this exact schema:`

const TRIAGE_USER_PROMPT = (text: string) => `Analyze this lead message and return a JSON object:

MESSAGE:
${text}

Return JSON with this exact structure:
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
    "summary": string (2-3 sentence summary),
    "suggested_response": string (personalized response for sales team),
    "objections": string[],
    "questions": string[]
  },
  "tags": string[]
}`

const VISION_USER_PROMPT = `Analyze this screenshot of a lead message (DM, text, social media profile, or conversation). Extract all visible contact and athlete information, then return a JSON object.

If there is also text context provided, use both the image and text together.

Return JSON with this exact structure:
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
    "summary": string (2-3 sentence summary),
    "suggested_response": string (personalized response for sales team),
    "objections": string[],
    "questions": string[]
  },
  "tags": string[]
}`

// Build Claude API messages content array based on inputs
function buildMessageContent(text?: string, image?: string): Array<Record<string, unknown>> {
  const content: Array<Record<string, unknown>> = []

  // Add image block if provided (Claude vision)
  if (image) {
    content.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: 'image/png', // Works for all formats — Claude auto-detects
        data: image,
      },
    })
  }

  // Add text block
  if (image) {
    const textContext = text ? `\n\nAdditional context from user:\n${text}` : ''
    content.push({
      type: 'text',
      text: VISION_USER_PROMPT + textContext,
    })
  } else {
    content.push({
      type: 'text',
      text: TRIAGE_USER_PROMPT(text || ''),
    })
  }

  return content
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { text, image } = body as { text?: string; image?: string }

    if (!text && !image) {
      return NextResponse.json({ error: 'Text or image is required' }, { status: 400 })
    }

    // Build message content (text-only or vision)
    const messageContent = buildMessageContent(text, image)

    // Call Claude API for triage
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
        system: TRIAGE_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: messageContent }],
      }),
    })

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text()
      console.error('Anthropic API error:', errText)
      return NextResponse.json({ error: 'AI processing failed' }, { status: 500 })
    }

    const anthropicData = await anthropicRes.json()
    const responseText = anthropicData.content[0]?.text || ''

    // Parse the JSON from Claude's response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
    }

    const triage: AITriageResult = JSON.parse(jsonMatch[0])

    // Create GHL contact via API
    let ghl_contact_id = `manual_${Date.now()}`

    if (process.env.GHL_API_KEY && process.env.GHL_LOCATION_ID) {
      try {
        const ghlRes = await fetch('https://services.leadconnectorhq.com/contacts/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.GHL_API_KEY}`,
            Version: '2021-07-28',
          },
          body: JSON.stringify({
            locationId: process.env.GHL_LOCATION_ID,
            firstName: triage.extracted.contact_name?.split(' ')[0] || '',
            lastName: triage.extracted.contact_name?.split(' ').slice(1).join(' ') || '',
            phone: triage.extracted.contact_phone || '',
            email: triage.extracted.contact_email || '',
            tags: ['108-ops-hub', `temp-${triage.classification.temperature}`],
            source: image ? 'Call Capture (Screenshot)' : 'Call Capture',
          }),
        })

        if (ghlRes.ok) {
          const ghlData = await ghlRes.json()
          ghl_contact_id = ghlData.contact?.id || ghl_contact_id
        }
      } catch (ghlErr) {
        console.error('GHL contact creation failed:', ghlErr)
      }
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
        original_message: text || '(extracted from screenshot)',
        suggested_response: triage.content.suggested_response,
        channel: image ? 'text' : 'text',
        tags: triage.tags,
        status: 'new',
      })
      .select('id')
      .single()

    if (dbError) {
      console.error('Supabase insert error:', dbError)
    }

    // Send notifications for hot leads
    if (triage.classification.temperature === 'hot') {
      await sendHotLeadNotifications(triage, text || '(screenshot)')
    }

    return NextResponse.json({
      triage,
      ghl_contact_id,
      lead_id: insertedLead?.id || null,
    })
  } catch (err) {
    console.error('Call capture error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function sendHotLeadNotifications(triage: AITriageResult, originalText: string) {
  // Discord notification
  if (process.env.DISCORD_WEBHOOK_URL) {
    try {
      await fetch(process.env.DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: `🔥 **HOT LEAD via Call Capture**`,
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
        }),
      })
    } catch (e) {
      console.error('Discord notification failed:', e)
    }
  }

  // SMS alerts for Jose and Greg
  if (process.env.TWILIO_ACCOUNT_SID) {
    const phones = [process.env.JOSE_PHONE, process.env.GREG_PHONE].filter(Boolean)
    const message = `🔥 HOT LEAD: ${triage.extracted.contact_name || 'Unknown'} - ${triage.content.summary.slice(0, 140)}`

    for (const phone of phones) {
      try {
        await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              Authorization: `Basic ${Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64')}`,
            },
            body: new URLSearchParams({
              From: process.env.TWILIO_PHONE_NUMBER!,
              To: phone!,
              Body: message,
            }),
          }
        )
      } catch (e) {
        console.error('SMS send failed:', e)
      }
    }
  }
}
