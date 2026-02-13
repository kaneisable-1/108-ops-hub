import { NextResponse } from 'next/server'
import { createServiceRoleClient, createServerSupabaseClient } from '@/lib/supabase/server'

/**
 * GET /api/admin/stats
 *
 * Fetch quick system stats for admin settings page.
 * Returns counts of leads, applications, sessions, and latest briefing date.
 */
export async function GET() {
  try {
    // Verify caller is admin
    const authClient = await createServerSupabaseClient()
    const { data: { user: authUser } } = await authClient.auth.getUser()

    if (!authUser?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { data: caller } = await authClient
      .from('users')
      .select('role')
      .eq('email', authUser.email)
      .single()

    if (!caller || caller.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supabase = await createServiceRoleClient()

    // Run counts in parallel
    const [leadsResult, applicationsResult, sessionsResult, briefingResult] = await Promise.all([
      supabase.from('leads').select('id', { count: 'exact', head: true }),
      supabase.from('applications').select('id', { count: 'exact', head: true }),
      supabase.from('sessions').select('id', { count: 'exact', head: true }),
      supabase
        .from('daily_briefings')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .single(),
    ])

    return NextResponse.json({
      leads_count: leadsResult.count ?? 0,
      applications_count: applicationsResult.count ?? 0,
      sessions_count: sessionsResult.count ?? 0,
      last_briefing_at: briefingResult.data?.created_at ?? null,
    })
  } catch (err) {
    console.error('Admin stats error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
