import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

/**
 * GET /api/admin/notifications
 *
 * Returns recent notification log entries.
 * Query params:
 *   ?status=failed — filter to failed only
 *   ?limit=100     — max rows (default 100, max 500)
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const statusFilter = url.searchParams.get('status')
    const limitParam = url.searchParams.get('limit')
    const limit = Math.min(Math.max(parseInt(limitParam || '100', 10) || 100, 1), 500)

    const supabase = await createServiceRoleClient()

    let query = supabase
      .from('notification_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (statusFilter === 'failed') {
      query = query.eq('status', 'failed')
    }

    const { data: logs, error } = await query

    if (error) {
      console.error('Notification log query error:', error)
      return NextResponse.json({ error: 'Failed to fetch notification logs' }, { status: 500 })
    }

    return NextResponse.json({ logs: logs || [] })
  } catch (err) {
    console.error('Notification log error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
