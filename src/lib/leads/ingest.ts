import { createServiceRoleClient } from '@/lib/supabase/server'
import { searchGHLContactByPhone, createGHLContact, createGHLContactFromTriage } from '@/lib/ghl/contacts'
import { triageLead } from '@/lib/leads/triage'
import { sendDiscord, sendSMS, getSalesPhones } from '@/lib/notifications'
import type { AITriageResult } from '@/types'

export interface IngestLeadInput {
  text?: string
  contact_name?: string | null
  contact_phone?: string | null
  contact_email?: string | null
  athlete_name?: string | null
  athlete_age?: number | null
  athlete_position?: string | null
  athlete_level?: string | null
  location?: string | null
  ghl_contact_id?: string
  triage?: AITriageResult
  message?: string | null
  channel?: string
  tags?: string[]
  source?: string
}

export interface IngestLeadResult {
  lead_id: string | null
  ghl_contact_id: string
  triage: AITriageResult | null
  is_new: boolean
  existing_contact: { id: string; name: string } | null
}

export async function ingestLead(input: IngestLeadInput): Promise<IngestLeadResult> {
  let triage = input.triage || null
  let ghl_contact_id = input.ghl_contact_id || ''
  let existing_contact: { id: string; name: string } | null = null

  // Step 1: AI triage if we have raw text and no pre-computed triage
  if (!triage && input.text) {
    triage = await triageLead(input.text)
  }

  // Merge extracted data: triage results take precedence, then explicit input
  const contact_name = triage?.extracted.contact_name || input.contact_name || null
  const contact_phone = triage?.extracted.contact_phone || input.contact_phone || null
  const contact_email = triage?.extracted.contact_email || input.contact_email || null

  // Step 2: Resolve GHL contact
  if (!ghl_contact_id && contact_phone) {
    existing_contact = await searchGHLContactByPhone(contact_phone)
    if (existing_contact) {
      ghl_contact_id = existing_contact.id
    }
  }

  if (!ghl_contact_id) {
    if (triage) {
      ghl_contact_id = await createGHLContactFromTriage(triage)
    } else {
      ghl_contact_id = await createGHLContact({
        name: contact_name,
        phone: contact_phone,
        email: contact_email,
        tags: input.tags || ['108-lead-intel', 'manual-entry'],
        source: input.source || 'Ops Hub',
      })
    }
  }

  const supabase = await createServiceRoleClient()

  // Step 3: Check for existing lead
  const { data: existingLead } = await supabase
    .from('leads')
    .select('id')
    .eq('ghl_contact_id', ghl_contact_id)
    .single()

  if (existingLead) {
    // Update existing lead with new activity
    await supabase.from('lead_activity').insert({
      lead_id: existingLead.id,
      action: 'received new message',
      details: { message: input.message || input.text, channel: input.channel },
    })

    // Escalate temperature if triage says hot
    if (triage?.classification?.temperature === 'hot') {
      await supabase
        .from('leads')
        .update({
          lead_temperature: 'hot',
          queue: 'call_now',
          priority: triage.routing?.priority || 90,
        })
        .eq('id', existingLead.id)
    }

    return {
      lead_id: existingLead.id,
      ghl_contact_id,
      triage,
      is_new: false,
      existing_contact,
    }
  }

  // Step 4: Insert new lead
  const { data: newLead, error: insertError } = await supabase
    .from('leads')
    .insert({
      ghl_contact_id,
      contact_name,
      contact_phone,
      contact_email,
      athlete_name: triage?.extracted.athlete_name || input.athlete_name || null,
      athlete_age: triage?.extracted.athlete_age || input.athlete_age || null,
      athlete_position: triage?.extracted.athlete_position || input.athlete_position || null,
      athlete_level: triage?.extracted.athlete_level || input.athlete_level || null,
      location: triage?.extracted.location || input.location || null,
      lead_temperature: triage?.classification.temperature || 'warm',
      fit_score: triage?.classification.fit_score || null,
      service_match: triage?.classification.service_match || null,
      intent: triage?.classification.intent || null,
      queue: triage?.routing.queue || 'follow_up',
      priority: triage?.routing.priority || 50,
      ai_summary: triage?.content.summary || null,
      original_message: input.message || input.text || null,
      suggested_response: triage?.content.suggested_response || null,
      channel: input.channel || 'text',
      tags: triage?.tags || input.tags || [],
      status: 'new',
    })
    .select('id')
    .single()

  if (insertError) {
    console.error('[ingest] Lead insert error:', insertError)
    throw new Error('Failed to create lead')
  }

  const lead_id = newLead?.id || null

  // Step 5: Log activity
  if (lead_id) {
    await supabase.from('lead_activity').insert({
      lead_id,
      action: 'lead created',
      details: {
        source: input.source || (triage ? 'ai-triage' : 'manual'),
        channel: input.channel || 'text',
      },
    }).then(null, (err: unknown) => console.error('[ingest] Activity log error:', err))
  }

  // Step 6: Hot lead notifications (fire-and-forget)
  if (triage?.classification.temperature === 'hot' && lead_id) {
    notifyHotLead(triage, lead_id).catch((err) =>
      console.error('[ingest] Hot lead notification error:', err)
    )
  }

  return {
    lead_id,
    ghl_contact_id,
    triage,
    is_new: true,
    existing_contact,
  }
}

async function notifyHotLead(triage: AITriageResult, leadId: string) {
  await sendDiscord({
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
    recipientLabel: 'hot-leads-channel',
    relatedEntityType: 'lead',
    relatedEntityId: leadId,
  })

  const smsBody = `🔥 HOT LEAD: ${triage.extracted.contact_name || 'Unknown'}\n${triage.content.summary.slice(0, 120)}\nOpen: ${process.env.NEXT_PUBLIC_APP_URL || ''}`
  await sendSMS({
    phones: getSalesPhones(),
    message: smsBody,
    relatedEntityType: 'lead',
    relatedEntityId: leadId,
  })
}
