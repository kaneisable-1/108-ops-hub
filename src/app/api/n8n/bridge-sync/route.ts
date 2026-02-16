import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { validateServiceKey } from '@/lib/auth/serviceKey'

/**
 * POST /api/n8n/bridge-sync
 *
 * Receives workout data from Bridge Athletic (via n8n every 4 hours).
 * Upserts workout data into athlete_metrics JSONB field.
 *
 * Body: { workouts: [{ lead_id, workout_date, data }] }
 * Auth: Bearer <SUPABASE_SERVICE_ROLE_KEY | CRON_SECRET>
 */
export async function POST(request: Request) {
  const authError = validateServiceKey(request)
  if (authError) return authError

  try {
    const { workouts } = await request.json()

    if (!Array.isArray(workouts) || workouts.length === 0) {
      return NextResponse.json(
        { error: 'workouts array is required and must not be empty' },
        { status: 400 }
      )
    }

    const supabase = await createServiceRoleClient()
    let synced = 0
    const errors: { lead_id: string; error: string }[] = []

    for (const workout of workouts) {
      const { lead_id, workout_date, data } = workout

      if (!lead_id) {
        errors.push({ lead_id: 'unknown', error: 'Missing lead_id' })
        continue
      }

      // Upsert into athlete_metrics, merging bridge_data
      const { error: upsertError } = await supabase
        .from('athlete_metrics')
        .upsert(
          {
            lead_id,
            bridge_data: {
              last_sync: new Date().toISOString(),
              latest_workout_date: workout_date || null,
              workout_data: data || {},
            },
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'lead_id' }
        )

      if (upsertError) {
        console.error(`[n8n/bridge-sync] Upsert failed for ${lead_id}:`, upsertError)
        errors.push({ lead_id, error: upsertError.message })
      } else {
        synced++
      }
    }

    return NextResponse.json({
      success: true,
      synced,
      errors: errors.length > 0 ? errors : undefined,
      total: workouts.length,
    })
  } catch (err) {
    console.error('[n8n/bridge-sync] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
