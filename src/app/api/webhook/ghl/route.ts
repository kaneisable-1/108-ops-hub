import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import type { AITriageResult } from '@/types'

// This endpoint receives webhooks from GoHighLevel (via n8n)
// when a new contact message comes in
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate webhook payload
    const {
      contact_id,
      contact_name,
      contact_phone,
      contact_email,
      message,
      channel,
      triage, // Pre-processed by n8n with Claude
    } = body

    if (!contact_id) {
      return NextResponse.json({ error: 'contact_id required' }, { status: 400 })
    }

    const supabase = await createServiceRoleClient()

    // Check if lead already exists
    const { data: existing } = await supabase
      .from('leads')
      .select('id')
      .eq('ghl_contact_id', contact_id)
      .single()

    if (existing) {
      // Update existing lead with new message
      await supabase.from('lead_activity').insert({
        lead_id: existing.id,
        action: 'received new message',
        details: { message, channel },
      })

      // Update temperature if it escalated
      if (triage?.classification?.temperature === 'hot') {
        await supabase
          .from('leads')
          .update({
            lead_temperature: 'hot',
            queue: 'call_now',
            priority: triage.routing?.priority || 90,
          })
          .eq('id', existing.id)
      }

      return NextResponse.json({ status: 'updated', lead_id: existing.id })
    }

    // Create new lead
    const triageData = triage as AITriageResult | undefined

    const { data: newLead, error: insertError } = await supabase
      .from('leads')
      .insert({
        ghl_contact_id: contact_id,
        contact_name: triageData?.extracted.contact_name || contact_name || null,
        contact_phone: triageData?.extracted.contact_phone || contact_phone || null,
        contact_email: triageData?.extracted.contact_email || contact_email || null,
        athlete_name: triageData?.extracted.athlete_name || null,
        athlete_age: triageData?.extracted.athlete_age || null,
        athlete_position: triageData?.extracted.athlete_position || null,
        athlete_level: triageData?.extracted.athlete_level || null,
        location: triageData?.extracted.location || null,
        lead_temperature: triageData?.classification.temperature || 'warm',
        fit_score: triageData?.classification.fit_score || null,
        service_match: triageData?.classification.service_match || null,
        intent: triageData?.classification.intent || null,
        queue: triageData?.routing.queue || 'follow_up',
        priority: triageData?.routing.priority || 50,
        ai_summary: triageData?.content.summary || null,
        original_message: message || null,
        suggested_response: triageData?.content.suggested_response || null,
        channel: channel || 'other',
        tags: triageData?.tags || [],
        status: 'new',
      })
      .select()
      .single()

    if (insertError) {
      console.error('Lead insert error:', insertError)
      return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 })
    }

    // Send notifications for hot leads
    if (triageData?.classification.temperature === 'hot') {
      await sendNotifications(triageData, message, newLead.id)
    }

    return NextResponse.json({
      status: 'created',
      lead_id: newLead.id,
      temperature: triageData?.classification.temperature || 'warm',
    })
  } catch (err) {
    console.error('Webhook error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function sendNotifications(triage: AITriageResult, message: string, leadId: string) {
  // Discord
  if (process.env.DISCORD_WEBHOOK_URL) {
    try {
      await fetch(process.env.DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: `🔥 **NEW HOT LEAD**`,
          embeds: [
            {
              title: triage.extracted.contact_name || 'New Lead',
              color: 0xff4444,
              fields: [
                { name: 'Phone', value: triage.extracted.contact_phone || 'N/A', inline: true },
                { name: 'Service', value: triage.classification.service_match || 'Unknown', inline: true },
                { name: 'Queue', value: triage.routing.queue.replace('_', ' '), inline: true },
                { name: 'Summary', value: triage.content.summary },
                { name: 'Suggested Response', value: triage.content.suggested_response.slice(0, 200) },
              ],
              footer: { text: `Lead ID: ${leadId}` },
              timestamp: new Date().toISOString(),
            },
          ],
        }),
      })
    } catch (e) {
      console.error('Discord notification failed:', e)
    }
  }

  // SMS
  if (process.env.TWILIO_ACCOUNT_SID) {
    const phones = [process.env.JOSE_PHONE, process.env.GREG_PHONE].filter(Boolean)
    const smsBody = `🔥 HOT LEAD: ${triage.extracted.contact_name || 'Unknown'}\n${triage.content.summary.slice(0, 120)}\nOpen: ${process.env.NEXT_PUBLIC_APP_URL}`

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
              Body: smsBody,
            }),
          }
        )
      } catch (e) {
        console.error('SMS failed:', e)
      }
    }
  }
}
