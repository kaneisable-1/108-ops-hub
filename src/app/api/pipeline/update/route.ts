import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { sendDiscord } from '@/lib/notifications'
import { syncPipelineStage } from '@/lib/ghl/sync'
import type { PipelineStage } from '@/types'

const VALID_STAGES: PipelineStage[] = [
  'lead', 'applied', 'accepted', 'booked', 'arrived',
  'completed', 'converting', 'converted', 'nurture',
]

const KEY_TRANSITIONS: PipelineStage[] = ['converted', 'nurture']

/**
 * POST /api/pipeline/update
 *
 * Move a lead to a new pipeline stage.
 * Logs the transition to lead_activity with from/to stages.
 * Sends Discord notification on key transitions (converted, nurture).
 *
 * Body: { lead_id, stage }
 */
export async function POST(request: NextRequest) {
  try {
    const { lead_id, stage } = await request.json()

    if (!lead_id || !stage) {
      return NextResponse.json(
        { error: 'lead_id and stage are required' },
        { status: 400 }
      )
    }

    if (!VALID_STAGES.includes(stage as PipelineStage)) {
      return NextResponse.json(
        { error: `Invalid stage. Must be one of: ${VALID_STAGES.join(', ')}` },
        { status: 400 }
      )
    }

    const supabase = await createServiceRoleClient()

    // Capture previous stage before update
    const { data: currentLead, error: lookupError } = await supabase
      .from('leads')
      .select('pipeline_stage, athlete_name, contact_name')
      .eq('id', lead_id)
      .single()

    if (lookupError || !currentLead) {
      console.error('Lead lookup error:', lookupError)
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      )
    }

    const fromStage = currentLead.pipeline_stage || 'lead'

    // Skip if already at target stage
    if (fromStage === stage) {
      return NextResponse.json({ success: true, lead_id, stage, unchanged: true })
    }

    // Update pipeline stage
    const { error } = await supabase
      .from('leads')
      .update({ pipeline_stage: stage })
      .eq('id', lead_id)

    if (error) {
      console.error('Pipeline update error:', error)
      return NextResponse.json(
        { error: 'Failed to update pipeline stage' },
        { status: 500 }
      )
    }

    // Log stage change to lead_activity
    await supabase.from('lead_activity').insert({
      lead_id,
      action: 'pipeline_stage_changed',
      details: { from: fromStage, to: stage },
    })

    // GHL reverse sync (fire-and-forget)
    syncPipelineStage(lead_id, stage).catch((err) =>
      console.error('GHL pipeline sync error:', err)
    )

    // Discord notification for key transitions (fire-and-forget)
    if (KEY_TRANSITIONS.includes(stage as PipelineStage)) {
      const leadName = currentLead.athlete_name || currentLead.contact_name || 'Unknown'
      const isConverted = stage === 'converted'
      const emoji = isConverted ? '\u{1F389}' : '\u{1F504}'
      const label = isConverted ? 'CONVERTED' : 'MOVED TO NURTURE'
      const color = isConverted ? 0x22c55e : 0xeab308

      sendDiscord({
        content: `${emoji} **${label}**`,
        embeds: [{
          title: leadName,
          color,
          fields: [
            { name: 'From', value: fromStage, inline: true },
            { name: 'To', value: stage, inline: true },
          ],
          footer: { text: `Lead ID: ${lead_id}` },
          timestamp: new Date().toISOString(),
        }],
        recipientLabel: 'pipeline-updates',
        relatedEntityType: 'lead',
        relatedEntityId: lead_id,
      }).catch((err) => console.error('Pipeline notification error:', err))
    }

    return NextResponse.json({ success: true, lead_id, stage, from: fromStage })
  } catch (err) {
    console.error('Pipeline update error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
