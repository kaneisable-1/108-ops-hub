import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { sendDiscord, sendSMS, getManagerPhones } from '@/lib/notifications'
import type { SessionNoteInput, CoachSentiment } from '@/types'

/**
 * POST /api/sessions/notes
 *
 * Save a session note. Upserts into sessions table keyed on schedule_slot_id.
 * Fires async AI parse if notes are substantial (>10 chars).
 * Sends notifications for yellow/red sentiment.
 */
export async function POST(request: NextRequest) {
  try {
    const body: SessionNoteInput = await request.json()

    // Validate required fields
    const { lead_id, coach_id, date, coach_sentiment, sentiment_reason } = body
    if (!lead_id || !coach_id || !date || !coach_sentiment || !sentiment_reason) {
      return NextResponse.json(
        { error: 'lead_id, coach_id, date, coach_sentiment, and sentiment_reason are required' },
        { status: 400 }
      )
    }

    const supabase = await createServiceRoleClient()

    // Combine voice transcript + raw notes
    const combinedNotes = [body.voice_transcript, body.raw_notes]
      .filter(Boolean)
      .join('\n\n---\n\n')

    // Build session record
    const sessionData = {
      schedule_slot_id: body.schedule_slot_id || null,
      lead_id,
      coach_id,
      date,
      skill: body.skill || 'hitting',
      raw_notes: combinedNotes || null,
      note_mode: body.note_mode || 'quick',
      coach_sentiment,
      sentiment_reason,
      drills_performed: body.drills_performed || [],
      key_observations: body.key_observations || null,
      cues_given: body.cues_given || null,
      recommendations: body.recommendations || null,
      athlete_effort_rating: body.athlete_effort_rating || null,
      injury_notes: body.injury_notes || null,
      voice_transcript: body.voice_transcript || null,
      updated_at: new Date().toISOString(),
    }

    // Upsert into sessions (keyed on schedule_slot_id)
    let session
    let sessionError

    if (body.schedule_slot_id) {
      const result = await supabase
        .from('sessions')
        .upsert(sessionData, { onConflict: 'schedule_slot_id' })
        .select()
        .single()
      session = result.data
      sessionError = result.error
    } else {
      // No schedule_slot_id -- plain insert
      const result = await supabase
        .from('sessions')
        .insert(sessionData)
        .select()
        .single()
      session = result.data
      sessionError = result.error
    }

    if (sessionError || !session) {
      console.error('Session upsert error:', sessionError)
      return NextResponse.json(
        { error: 'Failed to save session note' },
        { status: 500 }
      )
    }

    // Fire async AI parse if notes are substantial (fire-and-forget)
    if (combinedNotes && combinedNotes.length > 10) {
      const origin = new URL(request.url).origin
      fetch(`${origin}/api/sessions/parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: session.id,
          raw_notes: combinedNotes,
        }),
      }).catch((err) => console.error('Async parse fire failed:', err))
    }

    // Send notifications for yellow/red sentiment
    if (coach_sentiment === 'yellow' || coach_sentiment === 'red') {
      // Look up coach and athlete names
      const [coachResult, athleteResult] = await Promise.all([
        supabase.from('users').select('name').eq('id', coach_id).single(),
        supabase.from('leads').select('athlete_name, contact_name').eq('id', lead_id).single(),
      ])

      const coachName = coachResult.data?.name || 'Unknown Coach'
      const athleteName =
        athleteResult.data?.athlete_name ||
        athleteResult.data?.contact_name ||
        'Unknown Athlete'

      sendSentimentNotifications({
        coachName,
        athleteName,
        date,
        sentiment: coach_sentiment,
        reason: sentiment_reason,
      }).catch((err) => console.error('Sentiment notification error:', err))
    }

    return NextResponse.json({ success: true, session })
  } catch (err) {
    console.error('Session notes POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET /api/sessions/notes
 *
 * Fetch sessions with filters.
 * Query params: coach_id, lead_id, sentiment, date_from, date_to, limit, offset
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const coach_id = searchParams.get('coach_id')
    const lead_id = searchParams.get('lead_id')
    const sentiment = searchParams.get('sentiment') as CoachSentiment | null
    const date_from = searchParams.get('date_from')
    const date_to = searchParams.get('date_to')
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    const supabase = await createServiceRoleClient()

    // Build query
    let query = supabase
      .from('sessions')
      .select('*')
      .order('date', { ascending: false })
      .range(offset, offset + limit - 1)

    if (coach_id) query = query.eq('coach_id', coach_id)
    if (lead_id) query = query.eq('lead_id', lead_id)
    if (sentiment) query = query.eq('coach_sentiment', sentiment)
    if (date_from) query = query.gte('date', date_from)
    if (date_to) query = query.lte('date', date_to)

    const { data: sessions, error: sessionsError } = await query

    if (sessionsError) {
      console.error('Sessions fetch error:', sessionsError)
      return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 })
    }

    if (!sessions || sessions.length === 0) {
      return NextResponse.json({ sessions: [] })
    }

    // Collect unique coach_ids and lead_ids for enrichment
    const coachIds = [...new Set(sessions.map((s) => s.coach_id).filter(Boolean))]
    const leadIds = [...new Set(sessions.map((s) => s.lead_id).filter(Boolean))]

    // Fetch names in parallel
    const [coachResult, leadResult] = await Promise.all([
      coachIds.length > 0
        ? supabase.from('users').select('id, name').in('id', coachIds)
        : { data: [] },
      leadIds.length > 0
        ? supabase.from('leads').select('id, athlete_name, contact_name').in('id', leadIds)
        : { data: [] },
    ])

    const coachMap = new Map(
      (coachResult.data || []).map((c: { id: string; name: string }) => [c.id, c.name])
    )
    const leadMap = new Map(
      (leadResult.data || []).map(
        (l: { id: string; athlete_name: string | null; contact_name: string | null }) => [
          l.id,
          { athlete_name: l.athlete_name, contact_name: l.contact_name },
        ]
      )
    )

    // Enrich sessions
    const enriched = sessions.map((s) => ({
      ...s,
      coach_name: coachMap.get(s.coach_id) || null,
      athlete_name: leadMap.get(s.lead_id)?.athlete_name || null,
      contact_name: leadMap.get(s.lead_id)?.contact_name || null,
    }))

    return NextResponse.json({ sessions: enriched })
  } catch (err) {
    console.error('Session notes GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ──────────────────────────────────────────────
// Notification helpers
// ──────────────────────────────────────────────

interface SentimentAlert {
  coachName: string
  athleteName: string
  date: string
  sentiment: 'yellow' | 'red'
  reason: string
}

async function sendSentimentNotifications(alert: SentimentAlert) {
  const isRed = alert.sentiment === 'red'
  const emoji = isRed ? '\uD83D\uDD34' : '\uD83D\uDFE1'
  const label = isRed ? 'RED' : 'YELLOW'
  const embedColor = isRed ? 0xff4444 : 0xffaa00

  // Discord notification for yellow + red
  await sendDiscord({
    content: `${emoji} **${label} Sentiment Alert**`,
    embeds: [
      {
        title: alert.athleteName,
        color: embedColor,
        fields: [
          { name: 'Coach', value: alert.coachName, inline: true },
          { name: 'Date', value: alert.date, inline: true },
          { name: 'Sentiment', value: label, inline: true },
          { name: 'Reason', value: alert.reason },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
    recipientLabel: 'sentiment-alerts',
    relatedEntityType: 'session',
  })

  // SMS for RED only — alert Will and Greg
  if (isRed) {
    await sendSMS({
      phones: getManagerPhones(),
      message: `${emoji} RED ALERT: ${alert.athleteName} session with ${alert.coachName} on ${alert.date}. Reason: ${alert.reason}`,
      relatedEntityType: 'session',
    })
  }
}
