import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

/**
 * GET /api/schedule/slots
 *
 * Query schedule slots from the v_coach_daily_schedule view.
 * Params: date_start, date_end, coach_id (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dateStart = searchParams.get('date_start')
    const dateEnd = searchParams.get('date_end')
    const coachId = searchParams.get('coach_id')

    if (!dateStart || !dateEnd) {
      return NextResponse.json(
        { error: 'date_start and date_end are required' },
        { status: 400 }
      )
    }

    const supabase = await createServiceRoleClient()

    let query = supabase
      .from('v_coach_daily_schedule')
      .select('*')
      .gte('date', dateStart)
      .lte('date', dateEnd)
      .order('date', { ascending: true })
      .order('time_block', { ascending: true })

    if (coachId) {
      query = query.eq('coach_id', coachId)
    }

    const { data, error: queryError } = await query

    if (queryError) {
      console.error('Schedule slots query error:', queryError)
      return NextResponse.json(
        { error: 'Failed to fetch schedule' },
        { status: 500 }
      )
    }

    return NextResponse.json({ slots: data || [] })
  } catch (err) {
    console.error('Schedule slots error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
