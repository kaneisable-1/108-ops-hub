import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { logNotification, logFailedWebhook } from '@/lib/notificationLog'
import type { AITriageResult } from '@/types'

function verifySignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature) return false
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex')
  return signature === expected
}

// This endpoint receives webhooks from GoHighLevel (via n8n)
// when a new contact message comes in
export async function POST(request: NextRequest) {
  try {
    // Read raw body for signature verification
    const rawBody = await request.text()
    const signature = request.headers.get('x-ghl-signature')
    const webhookSecret = process.env.GHL_WEBHOOK_SECRET

    // Validate signature if secret is configured
    if (webhookSecret) {
      if (!verifySignature(rawBody, signature, webhookSecret)) {
        console.warn('[GHL Webhook] Invalid signature — rejecting request')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    } else {
      console.warn('[GHL Webhook] GHL_WEBHOOK_SECRET not set — accepting unsigned requests')
    }

    const body = JSON.parse(rawBody)

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
    await logFailedWebhook({
      source: 'ghl',
      payload: { error: 'Parse or processing failure' },
      error_message: err instanceof Error ? err.message : 'Unknown error',
      status_code: 500,
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function sendNotifications(triage: AITriageResult, message: string, leadId: string) {
  const discordBody = `🔥 HOT LEAD: ${triage.extracted.contact_name || 'Unknown'} — ${triage.content.summary.slice(0, 120)}`

  // Discord
  if (process.env.DISCORD_WEBHOOK_URL) {
    try {
      const res = await fetch(process.env.DISCORD_WEBHOOK_URL, {
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
      await logNotification({
        channel: 'discord',
        recipient: 'hot-leads-channel',
        body: discordBody,
        status: res.ok ? 'sent' : 'failed',
        error_message: res.ok ? undefined : `HTTP ${res.status}`,
        related_entity_type: 'lead',
        related_entity_id: leadId,
      })
    } catch (e) {
      console.error('Discord notification failed:', e)
      await logNotification({
        channel: 'discord',
        recipient: 'hot-leads-channel',
        body: discordBody,
        status: 'failed',
        error_message: e instanceof Error ? e.message : 'Unknown error',
        related_entity_type: 'lead',
        related_entity_id: leadId,
      })
    }
  }

  // SMS
  if (process.env.TWILIO_ACCOUNT_SID) {
    const phones = [process.env.JOSE_PHONE, process.env.GREG_PHONE].filter(Boolean)
    const smsBody = `🔥 HOT LEAD: ${triage.extracted.contact_name || 'Unknown'}\n${triage.content.summary.slice(0, 120)}\nOpen: ${process.env.NEXT_PUBLIC_APP_URL}`

    for (const phone of phones) {
      try {
        const res = await fetch(
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
        await logNotification({
          channel: 'sms',
          recipient: phone!,
          body: smsBody,
          status: res.ok ? 'sent' : 'failed',
          error_message: res.ok ? undefined : `HTTP ${res.status}`,
          related_entity_type: 'lead',
          related_entity_id: leadId,
        })
      } catch (e) {
        console.error('SMS failed:', e)
        await logNotification({
          channel: 'sms',
          recipient: phone!,
          body: smsBody,
          status: 'failed',
          error_message: e instanceof Error ? e.message : 'Unknown error',
          related_entity_type: 'lead',
          related_entity_id: leadId,
        })
      }
    }
  }
}
