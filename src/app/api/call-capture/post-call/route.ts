import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { ingestLead } from '@/lib/leads/ingest'
import { analyzePostCall } from '@/lib/leads/post-call-prompt'
import { updateContactCustomField } from '@/lib/ghl/client'
import { sendDiscord } from '@/lib/notifications'

const VALID_OUTCOMES = ['answered', 'voicemail', 'no_answer', 'busy', 'wrong_number'] as const

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      lead_id,
      contact_name,
      contact_phone,
      voice_transcript,
      call_outcome,
      duration_estimate,
    } = body

    if (!voice_transcript || typeof voice_transcript !== 'string') {
      return NextResponse.json({ error: 'voice_transcript is required' }, { status: 400 })
    }

    if (!call_outcome || !VALID_OUTCOMES.includes(call_outcome)) {
      return NextResponse.json(
        { error: `call_outcome must be one of: ${VALID_OUTCOMES.join(', ')}` },
        { status: 400 }
      )
    }

    // Step 1: Claude post-call analysis
    const analysis = await analyzePostCall(voice_transcript, call_outcome)

    const supabase = await createServiceRoleClient()
    let resolvedLeadId = lead_id
    let ghlContactId: string | null = null

    // Step 2: Resolve or create lead
    if (resolvedLeadId) {
      const { data: existingLead } = await supabase
        .from('leads')
        .select('id, ghl_contact_id')
        .eq('id', resolvedLeadId)
        .single()

      if (existingLead) {
        ghlContactId = existingLead.ghl_contact_id

        // Update lead with latest info from call
        await supabase
          .from('leads')
          .update({
            lead_temperature: analysis.lead_temperature,
            call_outcome: analysis.call_outcome,
            ...(analysis.athlete_details.name && { athlete_name: analysis.athlete_details.name }),
            ...(analysis.athlete_details.age && { athlete_age: analysis.athlete_details.age }),
            ...(analysis.athlete_details.position && { athlete_position: analysis.athlete_details.position }),
            ...(analysis.athlete_details.level && { athlete_level: analysis.athlete_details.level }),
            ...(analysis.next_step && { next_step: analysis.next_step }),
            ...(analysis.follow_up_date && { follow_up_date: analysis.follow_up_date }),
          })
          .eq('id', resolvedLeadId)
      }
    } else {
      // No lead_id — create or find via ingest pipeline
      const result = await ingestLead({
        contact_name: contact_name || analysis.athlete_details.name,
        contact_phone,
        channel: 'phone',
        source: 'Post-Call Capture',
        tags: ['post-call'],
      })
      resolvedLeadId = result.lead_id
      ghlContactId = result.ghl_contact_id
    }

    // Step 3: Insert call record
    if (resolvedLeadId) {
      await supabase.from('call_records').insert({
        lead_id: resolvedLeadId,
        direction: 'outbound',
        duration_seconds: duration_estimate ? duration_estimate * 60 : null,
        outcome: call_outcome,
        notes: analysis.summary,
        phone_number: contact_phone || null,
      })

      // Log activity
      await supabase.from('lead_activity').insert({
        lead_id: resolvedLeadId,
        action: 'post-call summary captured',
        details: {
          outcome: call_outcome,
          summary: analysis.summary,
          next_step: analysis.next_step,
          temperature: analysis.lead_temperature,
        },
      })
    }

    // Step 4: Write AI summary back to GHL
    if (ghlContactId && !ghlContactId.startsWith('manual_')) {
      updateContactCustomField(ghlContactId, '108_call_summary', analysis.summary).catch(
        (err) => console.error('[post-call] GHL update failed:', err)
      )
    }

    // Step 5: Discord notification
    sendDiscord({
      content: `📞 **Post-Call Summary**`,
      embeds: [
        {
          title: contact_name || analysis.athlete_details.name || 'Call Logged',
          color: analysis.lead_temperature === 'hot' ? 0xff4444 : 0x3b82f6,
          fields: [
            { name: 'Outcome', value: call_outcome, inline: true },
            { name: 'Temperature', value: analysis.lead_temperature, inline: true },
            { name: 'Service Interest', value: analysis.service_interest.primary || 'N/A', inline: true },
            { name: 'Summary', value: analysis.summary },
            ...(analysis.next_step ? [{ name: 'Next Step', value: analysis.next_step }] : []),
            ...(analysis.action_items.length > 0
              ? [{ name: 'Action Items', value: analysis.action_items.map((a) => `• ${a}`).join('\n') }]
              : []),
          ],
          footer: resolvedLeadId ? { text: `Lead ID: ${resolvedLeadId}` } : undefined,
          timestamp: new Date().toISOString(),
        },
      ],
      recipientLabel: 'call-summaries',
      relatedEntityType: 'lead',
      relatedEntityId: resolvedLeadId || undefined,
    }).catch((err) => console.error('[post-call] Discord notification failed:', err))

    return NextResponse.json({
      analysis,
      lead_id: resolvedLeadId,
      ghl_contact_id: ghlContactId,
    })
  } catch (err) {
    console.error('Post-call capture error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
