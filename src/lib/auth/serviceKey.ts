import { NextResponse } from 'next/server'

/**
 * Validates service key from Authorization header.
 * Accepts either SUPABASE_SERVICE_ROLE_KEY or CRON_SECRET.
 *
 * Usage:
 *   const authError = validateServiceKey(request)
 *   if (authError) return authError
 */
export function validateServiceKey(request: Request): NextResponse | null {
  const authHeader = request.headers.get('authorization')

  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Missing Authorization header' },
      { status: 401 }
    )
  }

  const token = authHeader.slice(7)
  const validKeys = [
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    process.env.CRON_SECRET,
  ].filter(Boolean)

  if (validKeys.length === 0) {
    console.error('[auth] No service keys configured — rejecting request')
    return NextResponse.json(
      { error: 'Server misconfigured' },
      { status: 500 }
    )
  }

  if (!validKeys.includes(token)) {
    return NextResponse.json(
      { error: 'Invalid service key' },
      { status: 401 }
    )
  }

  return null
}
