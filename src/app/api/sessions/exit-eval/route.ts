import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import type { ExitEvalInput } from '@/types'

/**
 * POST /api/sessions/exit-eval
 *
 * Save an exit evaluation for a session.
 * Sets is_exit_eval=true and stores the eval data as JSONB.
 * Sends Discord notification with purple embed.
 *
 * Body: ExitEvalInput
 */
export async function POST(request: NextRequest) {
  try {
    const body: ExitEvalInput = await request.json()

    const {
      session_id,
      progress_rating,
      goals_achieved,
      skill_improvements,
      behavioral_assessment,
      recommendation,
      final_notes,
      would_work_again,
    } = body

    if (!session_id) {
      return NextResponse.json({ error: 'session_id is required' }, { status: 400 })
    }

    const supabase = await createServiceRoleClient()

    // Build exit eval JSONB payload
    const exitEval = {
      progress_rating,
      goals_achieved,
      skill_improvements,
      behavioral_assessment,
      recommendation,
      final_notes,
      would_work_again,
    }

    // Update session with exit eval
    const { data: session, error: updateError } = await supabase
      .from('sessions')
      .update({
        is_exit_eval: true,
        exit_eval: exitEval,
        updated_at: new Date().toISOString(),
      })
      .eq('id', session_id)
      .select('id, coach_id, lead_id, date')
      .single()

    if (updateError || !session) {
      console.error('Exit eval update error:', updateError)
      return NextResponse.json(
        { error: 'Session not found or update failed' },
        { status: 404 }
      )
    }

    // Look up coach and athlete names for notification
    const [coachResult, athleteResult] = await Promise.all([
      supabase.from('users').select('name').eq('id', session.coach_id).single(),
      supabase
        .from('leads')
        .select('athlete_name, contact_name')
        .eq('id', session.lead_id)
        .single(),
    ])

    const coachName = coachResult.data?.name || 'Unknown Coach'
    const athleteName =
      athleteResult.data?.athlete_name ||
      athleteResult.data?.contact_name ||
      'Unknown Athlete'

    // Send Discord notification
    if (process.env.DISCORD_WEBHOOK_URL) {
      try {
        await fetch(process.env.DISCORD_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: `📋 **Exit Evaluation Submitted**`,
            embeds: [
              {
                title: athleteName,
                color: 0x8b5cf6,
                fields: [
                  { name: 'Coach', value: coachName, inline: true },
                  {
                    name: 'Progress',
                    value: `${progress_rating}/10`,
                    inline: true,
                  },
                  { name: 'Recommendation', value: recommendation, inline: true },
                  {
                    name: 'Would Work Again',
                    value: would_work_again,
                    inline: true,
                  },
                ],
                timestamp: new Date().toISOString(),
              },
            ],
          }),
        })
      } catch (e) {
        console.error('Discord exit eval notification failed:', e)
      }
    }

    return NextResponse.json({ success: true, session_id, exit_eval: exitEval })
  } catch (err) {
    console.error('Exit eval error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
