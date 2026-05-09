import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { logFailedWebhook } from '@/lib/notificationLog'
import { ingestLead } from '@/lib/leads/ingest'
import type { AITriageResult } from '@/types'

function verifySignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature) return false
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex')
  return signature === expected
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get('x-ghl-signature')
    const webhookSecret = process.env.GHL_WEBHOOK_SECRET

    if (webhookSecret) {
      if (!verifySignature(rawBody, signature, webhookSecret)) {
        console.warn('[GHL Webhook] Invalid signature — rejecting request')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    } else {
      console.warn('[GHL Webhook] GHL_WEBHOOK_SECRET not set — accepting unsigned requests')
    }

    const body = JSON.parse(rawBody)
    const { contact_id, contact_name, contact_phone, contact_email, message, channel, triage } = body

    if (!contact_id) {
      return NextResponse.json({ error: 'contact_id required' }, { status: 400 })
    }

    const result = await ingestLead({
      ghl_contact_id: contact_id,
      contact_name,
      contact_phone,
      contact_email,
      message,
      channel: channel || 'other',
      triage: triage as AITriageResult | undefined,
    })

    return NextResponse.json({
      status: result.is_new ? 'created' : 'updated',
      lead_id: result.lead_id,
      temperature: result.triage?.classification.temperature || 'warm',
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
