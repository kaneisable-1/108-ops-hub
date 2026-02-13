import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

/**
 * POST /api/applications/decide
 *
 * Process an application decision (accept/reject/need-more-info).
 * Updates the application record and the lead's pipeline_stage.
 *
 * Body: { application_id, decision, review_notes?, decision_reason?, reviewed_by }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { application_id, decision, review_notes, decision_reason, reviewed_by } = body

    if (!application_id || !decision || !reviewed_by) {
      return NextResponse.json(
        { error: 'application_id, decision, and reviewed_by are required' },
        { status: 400 }
      )
    }

    const validDecisions = ['accepted', 'rejected', 'need_more_info']
    if (!validDecisions.includes(decision)) {
      return NextResponse.json(
        { error: `Invalid decision. Must be one of: ${validDecisions.join(', ')}` },
        { status: 400 }
      )
    }

    const supabase = await createServiceRoleClient()

    // Update application with decision
    const { data: app, error: appError } = await supabase
      .from('applications')
      .update({
        status: decision,
        reviewed_by,
        reviewed_at: new Date().toISOString(),
        review_notes: review_notes || null,
        decision_reason: decision_reason || null,
      })
      .eq('id', application_id)
      .select('lead_id')
      .single()

    if (appError || !app) {
      console.error('Application update error:', appError)
      return NextResponse.json(
        { error: 'Application not found or update failed' },
        { status: 404 }
      )
    }

    // Update lead pipeline_stage based on decision
    if (decision === 'accepted') {
      await supabase
        .from('leads')
        .update({ pipeline_stage: 'accepted' })
        .eq('id', app.lead_id)
    }
    // rejected and need_more_info keep lead at 'applied' stage

    return NextResponse.json({
      success: true,
      decision,
      lead_id: app.lead_id,
    })
  } catch (err) {
    console.error('Application decide error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
