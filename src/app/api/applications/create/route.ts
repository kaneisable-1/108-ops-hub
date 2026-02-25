import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { lead_id, training_goals, current_team, how_heard, injury_history, parent_guardian, video_url } = body

    if (!lead_id || !training_goals) {
      return NextResponse.json(
        { error: 'lead_id and training_goals are required' },
        { status: 400 }
      )
    }

    const supabase = await createServiceRoleClient()

    // Create the application
    const { data: application, error: appError } = await supabase
      .from('applications')
      .insert({
        lead_id,
        status: 'submitted',
        video_url: video_url || null,
        responses: {
          training_goals,
          current_team: current_team || null,
          how_heard: how_heard || null,
          injury_history: injury_history || null,
          parent_guardian: parent_guardian || null,
        },
      })
      .select()
      .single()

    if (appError) {
      console.error('Failed to create application:', appError)
      return NextResponse.json(
        { error: 'Failed to create application' },
        { status: 500 }
      )
    }

    // Update the lead's pipeline stage to 'applied'
    await supabase
      .from('leads')
      .update({ pipeline_stage: 'applied' })
      .eq('id', lead_id)

    return NextResponse.json({ application })
  } catch (err) {
    console.error('Application create error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
