import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { sendDiscord, sendSMS, getManagerPhones } from '@/lib/notifications'
import { syncApplicationDecision } from '@/lib/ghl/sync'

/**
 * POST /api/applications/decide
 *
 * Process an application decision (accept/reject/need-more-info).
 * Updates the application record, the lead's pipeline_stage,
 * logs to lead_activity, and fires notifications.
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
    const stageMap: Record<string, string> = {
      accepted: 'accepted',
      rejected: 'nurture',
      need_more_info: 'applied', // stays at applied
    }

    const newStage = stageMap[decision]
    if (newStage) {
      await supabase
        .from('leads')
        .update({ pipeline_stage: newStage })
        .eq('id', app.lead_id)
    }

    // Log to lead_activity
    await supabase.from('lead_activity').insert({
      lead_id: app.lead_id,
      action: 'application_decided',
      details: {
        decision,
        reason: decision_reason || null,
        review_notes: review_notes || null,
        reviewed_by,
        pipeline_stage: newStage,
      },
    })

    // Look up lead name for notifications
    const { data: lead } = await supabase
      .from('leads')
      .select('athlete_name, contact_name')
      .eq('id', app.lead_id)
      .single()

    const leadName = lead?.athlete_name || lead?.contact_name || 'Unknown'

    // Fire notifications (fire-and-forget)
    sendDecisionNotifications({
      decision,
      leadName,
      leadId: app.lead_id,
      decisionReason: decision_reason,
    }).catch((err) => console.error('Decision notification error:', err))

    // GHL reverse sync (fire-and-forget)
    syncApplicationDecision(app.lead_id, decision).catch((err) =>
      console.error('GHL decision sync error:', err)
    )

    return NextResponse.json({
      success: true,
      decision,
      lead_id: app.lead_id,
      pipeline_stage: newStage,
    })
  } catch (err) {
    console.error('Application decide error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ──────────────────────────────────────────────
// Notification logic
// ──────────────────────────────────────────────

interface DecisionNotification {
  decision: string
  leadName: string
  leadId: string
  decisionReason?: string
}

async function sendDecisionNotifications(params: DecisionNotification) {
  const { decision, leadName, leadId, decisionReason } = params

  const colorMap: Record<string, number> = {
    accepted: 0x22c55e,   // green
    rejected: 0xef4444,   // red
    need_more_info: 0xeab308, // yellow
  }

  const emojiMap: Record<string, string> = {
    accepted: '\u2705',
    rejected: '\u274c',
    need_more_info: '\u2753',
  }

  const labelMap: Record<string, string> = {
    accepted: 'ACCEPTED',
    rejected: 'REJECTED',
    need_more_info: 'NEEDS MORE INFO',
  }

  const emoji = emojiMap[decision] || ''
  const label = labelMap[decision] || decision.toUpperCase()

  // Discord for all decisions
  await sendDiscord({
    content: `${emoji} **Application ${label}**`,
    embeds: [
      {
        title: leadName,
        color: colorMap[decision] || 0x6b7280,
        fields: [
          { name: 'Decision', value: label, inline: true },
          ...(decisionReason
            ? [{ name: 'Reason', value: decisionReason }]
            : []),
        ],
        footer: { text: `Lead ID: ${leadId}` },
        timestamp: new Date().toISOString(),
      },
    ],
    recipientLabel: 'application-decisions',
    relatedEntityType: 'application',
    relatedEntityId: leadId,
  })

  // SMS to Will + Greg on rejections (manager visibility)
  if (decision === 'rejected') {
    const reason = decisionReason ? ` Reason: ${decisionReason}` : ''
    await sendSMS({
      phones: getManagerPhones(),
      message: `\u274c Application REJECTED: ${leadName}.${reason}\nOpen: ${process.env.NEXT_PUBLIC_APP_URL || ''}`,
      relatedEntityType: 'application',
      relatedEntityId: leadId,
    })
  }
}
