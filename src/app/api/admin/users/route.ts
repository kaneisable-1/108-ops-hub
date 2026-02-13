import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient, createServerSupabaseClient } from '@/lib/supabase/server'

/**
 * GET /api/admin/users
 *
 * Fetch all users. Requires admin role.
 * Optionally pass ?role=coach to filter by role.
 */
export async function GET(request: NextRequest) {
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

    // Use service role for full access
    const supabase = await createServiceRoleClient()

    const roleFilter = request.nextUrl.searchParams.get('role')

    let query = supabase
      .from('users')
      .select('*')
      .order('name', { ascending: true })

    if (roleFilter) {
      query = query.eq('role', roleFilter)
    }

    const { data: users, error } = await query

    if (error) {
      console.error('Users fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    return NextResponse.json({ users: users || [] })
  } catch (err) {
    console.error('Admin users GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/admin/users
 *
 * Update a user's role, coach settings, or notification preferences.
 * Requires admin role.
 *
 * Body: { user_id, role?, coach_tier?, disciplines?, notify_sms?, notify_discord?, is_coach? }
 */
export async function PATCH(request: NextRequest) {
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

    const body = await request.json()
    const { user_id, ...updates } = body

    if (!user_id) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
    }

    // Only allow specific fields to be updated
    const allowedFields = ['role', 'coach_tier', 'disciplines', 'notify_sms', 'notify_discord', 'is_coach']
    const sanitized: Record<string, unknown> = {}

    for (const key of allowedFields) {
      if (key in updates) {
        sanitized[key] = updates[key]
      }
    }

    if (Object.keys(sanitized).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    // If role is being changed to 'coach', also set is_coach
    if (sanitized.role === 'coach') {
      sanitized.is_coach = true
    }

    const supabase = await createServiceRoleClient()

    const { data: updated, error } = await supabase
      .from('users')
      .update(sanitized)
      .eq('id', user_id)
      .select('*')
      .single()

    if (error) {
      console.error('User update error:', error)
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
    }

    return NextResponse.json({ success: true, user: updated })
  } catch (err) {
    console.error('Admin users PATCH error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
