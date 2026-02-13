import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import type { PipelineStage } from '@/types'

const VALID_STAGES: PipelineStage[] = [
  'lead', 'applied', 'accepted', 'booked', 'arrived',
  'completed', 'converting', 'converted', 'nurture',
]

/**
 * POST /api/pipeline/update
 *
 * Move a lead to a new pipeline stage.
 * Used by the Kanban board when dragging/tapping to change stage.
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

    return NextResponse.json({ success: true, lead_id, stage })
  } catch (err) {
    console.error('Pipeline update error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
