import { NextResponse } from 'next/server'
import { validateServiceKey } from '@/lib/auth/serviceKey'

/**
 * POST /api/n8n/daily-briefing
 *
 * Orchestrator for n8n cron: generates then delivers daily briefings.
 * Calls internal briefing endpoints sequentially.
 *
 * Query param: ?date=YYYY-MM-DD (defaults to today)
 * Auth: Bearer <SUPABASE_SERVICE_ROLE_KEY | CRON_SECRET>
 */
export async function POST(request: Request) {
  const authError = validateServiceKey(request)
  if (authError) return authError

  try {
    const url = new URL(request.url)
    const origin = url.origin
    const dateParam = url.searchParams.get('date')
    const targetDate = dateParam || new Date().toISOString().split('T')[0]

    // Step 1: Generate briefings
    const genRes = await fetch(
      `${origin}/api/briefings/generate?date=${targetDate}`,
      { method: 'POST' }
    )

    if (!genRes.ok) {
      const genErr = await genRes.text()
      console.error('[n8n/daily-briefing] Generate failed:', genErr)
      return NextResponse.json(
        { error: 'Briefing generation failed', details: genErr },
        { status: 500 }
      )
    }

    const genData = await genRes.json()

    // Step 2: Deliver briefings
    const delRes = await fetch(
      `${origin}/api/briefings/deliver?date=${targetDate}`,
      { method: 'POST' }
    )

    if (!delRes.ok) {
      const delErr = await delRes.text()
      console.error('[n8n/daily-briefing] Deliver failed:', delErr)
      return NextResponse.json(
        { error: 'Briefing delivery failed', generated: genData, details: delErr },
        { status: 500 }
      )
    }

    const delData = await delRes.json()

    return NextResponse.json({
      success: true,
      date: targetDate,
      generated: genData.briefings_created || 0,
      delivered: delData.delivered || 0,
      results: delData.results,
    })
  } catch (err) {
    console.error('[n8n/daily-briefing] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
