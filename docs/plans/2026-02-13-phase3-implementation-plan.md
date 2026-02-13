# Phase 3: Session Notes + Coach Tools — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable coaches to log session notes (voice + text) with sentiment ratings from their schedule view, with AI parsing and manager-facing history page.

**Architecture:** Session note entry is embedded inside the existing SlotDetail bottom-sheet component. Voice transcription uses the browser's native Web Speech API (no library). AI parsing fires asynchronously via a server-side API route that calls Claude. The `/sessions` page provides a read-only filtered history view for managers.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, Supabase (PostgreSQL + RLS), Claude API (anthropic REST), Twilio SMS, Discord webhooks, Web Speech API

---

## Task 1: Database Migration (005)

**Files:**
- Create: `supabase/migrations/005_add_session_notes_columns.sql`

**Context:** The `sessions` table already has `raw_notes`, `parsed_notes`, `is_exit_eval`, `exit_eval`, `energy_level`, `focus_areas`, `cues_that_worked`, `video_urls`, `performance_data` from migration 002. We only add the NEW Phase 3 columns.

**Step 1: Create migration file**

```sql
-- Migration 005: Add Phase 3 session notes columns
-- Run this in Supabase SQL Editor
--
-- Adds: note_mode, coach_sentiment, sentiment_reason, drills_performed,
-- key_observations, cues_given, recommendations, athlete_effort_rating,
-- injury_notes, voice_transcript, ai_parsed_at
-- Also: critical fix for daily_briefings UNIQUE constraint

-- Add session notes columns
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS note_mode TEXT DEFAULT 'quick' CHECK (note_mode IN ('quick', 'extended')),
  ADD COLUMN IF NOT EXISTS coach_sentiment TEXT CHECK (coach_sentiment IN ('green', 'yellow', 'red')),
  ADD COLUMN IF NOT EXISTS sentiment_reason TEXT,
  ADD COLUMN IF NOT EXISTS drills_performed TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS key_observations TEXT,
  ADD COLUMN IF NOT EXISTS cues_given TEXT,
  ADD COLUMN IF NOT EXISTS recommendations TEXT,
  ADD COLUMN IF NOT EXISTS athlete_effort_rating INTEGER CHECK (athlete_effort_rating BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS injury_notes TEXT,
  ADD COLUMN IF NOT EXISTS voice_transcript TEXT,
  ADD COLUMN IF NOT EXISTS ai_parsed_at TIMESTAMPTZ;

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_sessions_coach_sentiment ON public.sessions(coach_sentiment);
CREATE INDEX IF NOT EXISTS idx_sessions_lead_id ON public.sessions(lead_id);
CREATE INDEX IF NOT EXISTS idx_sessions_coach_id_date ON public.sessions(coach_id, date);

-- Critical fix from health audit: prevent duplicate briefings
ALTER TABLE public.daily_briefings
  ADD CONSTRAINT daily_briefings_coach_date_unique UNIQUE (coach_id, date);

-- Also add coordinator to sessions RLS read policy (design says coordinators see all)
DROP POLICY IF EXISTS "Coordinators can read all sessions" ON public.sessions;
CREATE POLICY "Coordinators can read all sessions"
  ON public.sessions FOR SELECT
  TO authenticated
  USING (public.get_my_role() = 'coordinator');
```

**Step 2: Run migration in Supabase SQL Editor**

Open https://supabase.com/dashboard/project/thfoinlxdkgdyasuclcr/sql/new and paste the SQL above. Click **Run**. Expected: "Success. No rows returned." Verify in Table Editor that `sessions` table now shows the new columns.

**Step 3: Commit**

```bash
git add supabase/migrations/005_add_session_notes_columns.sql
git commit -m "feat(db): add Phase 3 session notes columns + briefing UNIQUE fix"
```

---

## Task 2: Update TypeScript Types

**Files:**
- Modify: `src/types/index.ts`

**Step 1: Add new types and update Session interface**

Add these new types after the existing `DailyBriefing` interface (around line 344):

```typescript
// ============================================
// Phase 3: Session Notes Types
// ============================================

export type CoachSentiment = 'green' | 'yellow' | 'red'
export type NoteMode = 'quick' | 'extended'

export interface SessionNoteInput {
  schedule_slot_id: string
  lead_id: string
  coach_id: string
  date: string
  skill: Skill
  raw_notes?: string
  voice_transcript?: string
  note_mode: NoteMode
  coach_sentiment: CoachSentiment
  sentiment_reason: string
  // Extended mode fields
  drills_performed?: string[]
  key_observations?: string
  cues_given?: string
  recommendations?: string
  athlete_effort_rating?: number
  injury_notes?: string
}

export interface ExitEvalInput {
  session_id: string
  progress_rating: number
  goals_achieved: Record<string, 'yes' | 'no' | 'partial'>
  skill_improvements: Record<string, string>
  behavioral_assessment: string
  recommendation: 'reenroll' | 'graduate' | 'not_a_fit' | 'different_program'
  final_notes: string
  would_work_again: 'yes' | 'with_conditions' | 'no'
}

export interface SessionEnriched extends Session {
  coach_name?: string
  athlete_name?: string
  contact_name?: string
}

export interface ParsedSessionNotes {
  drills: string[]
  observations: string[]
  cues_that_worked: string[]
  recommendations: string[]
  concerns: string[]
}

export interface SessionFilters {
  coach_id?: string
  lead_id?: string
  sentiment?: CoachSentiment | 'all'
  date_from?: string
  date_to?: string
  search?: string
}
```

Update the existing `Session` interface (lines 282-312) to add the new fields:

```typescript
export interface Session {
  id: string
  schedule_slot_id?: string
  lead_id: string
  coach_id: string
  date: string
  skill: Skill
  duration_minutes?: number
  raw_notes?: string
  parsed_notes?: ParsedSessionNotes
  energy_level?: number
  focus_areas?: string[]
  cues_that_worked?: string[]
  is_exit_eval: boolean
  exit_eval?: Record<string, unknown>
  video_urls?: string[]
  performance_data?: Record<string, unknown>
  // Phase 3 additions
  note_mode?: NoteMode
  coach_sentiment?: CoachSentiment
  sentiment_reason?: string
  drills_performed?: string[]
  key_observations?: string
  cues_given?: string
  recommendations?: string
  athlete_effort_rating?: number
  injury_notes?: string
  voice_transcript?: string
  ai_parsed_at?: string
  created_at: string
  updated_at: string
}
```

**Step 2: Verify types compile**

```bash
cd /Users/gregoriowiggles/Development/108-lead-intel && npx tsc --noEmit
```

Expected: 0 errors.

**Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat(types): add Phase 3 session notes types"
```

---

## Task 3: Voice Recorder Hook

**Files:**
- Create: `src/hooks/useVoiceRecorder.ts`

**Context:** Uses the browser's native Web Speech API. No npm packages needed. `webkitSpeechRecognition` is available in Chrome/Edge; `SpeechRecognition` in Firefox/Safari. The hook manages start/stop/transcript state and handles browser compatibility gracefully.

**Step 1: Create the hook**

```typescript
'use client'

import { useState, useRef, useCallback } from 'react'

interface UseVoiceRecorderReturn {
  isRecording: boolean
  transcript: string
  isSupported: boolean
  error: string | null
  startRecording: () => void
  stopRecording: () => void
  clearTranscript: () => void
}

export function useVoiceRecorder(): UseVoiceRecorderReturn {
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  const isSupported = typeof window !== 'undefined' && (
    'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
  )

  const startRecording = useCallback(() => {
    if (!isSupported) {
      setError('Voice recording is not supported in this browser')
      return
    }

    setError(null)

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()

    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    let finalTranscript = transcript

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          finalTranscript += result[0].transcript + ' '
        } else {
          interim += result[0].transcript
        }
      }
      setTranscript(finalTranscript + interim)
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error !== 'aborted') {
        setError(`Voice recording error: ${event.error}`)
      }
      setIsRecording(false)
    }

    recognition.onend = () => {
      setIsRecording(false)
      setTranscript(finalTranscript)
    }

    recognitionRef.current = recognition
    recognition.start()
    setIsRecording(true)
  }, [isSupported, transcript])

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    setIsRecording(false)
  }, [])

  const clearTranscript = useCallback(() => {
    setTranscript('')
  }, [])

  return {
    isRecording,
    transcript,
    isSupported,
    error,
    startRecording,
    stopRecording,
    clearTranscript,
  }
}
```

Also create the type augmentation file for Web Speech API so TypeScript doesn't error:

**Create:** `src/types/speech.d.ts`

```typescript
// Web Speech API type declarations
// Chrome uses webkitSpeechRecognition, others use SpeechRecognition
interface Window {
  SpeechRecognition: typeof SpeechRecognition
  webkitSpeechRecognition: typeof SpeechRecognition
}
```

**Step 2: Verify types compile**

```bash
cd /Users/gregoriowiggles/Development/108-lead-intel && npx tsc --noEmit
```

Expected: 0 errors.

**Step 3: Commit**

```bash
git add src/hooks/useVoiceRecorder.ts src/types/speech.d.ts
git commit -m "feat: add useVoiceRecorder hook (Web Speech API)"
```

---

## Task 4: Session Notes API Routes

**Files:**
- Create: `src/app/api/sessions/notes/route.ts`
- Create: `src/app/api/sessions/parse/route.ts`
- Create: `src/app/api/sessions/exit-eval/route.ts`

**Context:** Follow the pattern from `src/app/api/call-capture/extract/route.ts` — use `createServiceRoleClient()` for DB writes, `fetch()` for Claude API and notifications. The notes route saves session data and fires off an async parse. The parse route calls Claude to extract structured data from raw notes.

**Step 1: Create notes route (POST + GET)**

File: `src/app/api/sessions/notes/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import type { SessionNoteInput } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const body: SessionNoteInput = await request.json()

    if (!body.lead_id || !body.coach_id || !body.date || !body.coach_sentiment || !body.sentiment_reason) {
      return NextResponse.json(
        { error: 'Missing required fields: lead_id, coach_id, date, coach_sentiment, sentiment_reason' },
        { status: 400 }
      )
    }

    const supabase = await createServiceRoleClient()

    // Combine voice transcript + raw notes
    const combinedNotes = [body.voice_transcript, body.raw_notes]
      .filter(Boolean)
      .join('\n\n')

    // Upsert session (one per slot)
    const { data: session, error: dbError } = await supabase
      .from('sessions')
      .upsert(
        {
          schedule_slot_id: body.schedule_slot_id,
          lead_id: body.lead_id,
          coach_id: body.coach_id,
          date: body.date,
          skill: body.skill,
          raw_notes: combinedNotes || null,
          voice_transcript: body.voice_transcript || null,
          note_mode: body.note_mode,
          coach_sentiment: body.coach_sentiment,
          sentiment_reason: body.sentiment_reason,
          drills_performed: body.drills_performed || [],
          key_observations: body.key_observations || null,
          cues_given: body.cues_given || null,
          recommendations: body.recommendations || null,
          athlete_effort_rating: body.athlete_effort_rating || null,
          injury_notes: body.injury_notes || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'schedule_slot_id' }
      )
      .select()
      .single()

    if (dbError) {
      console.error('Session save error:', dbError)
      return NextResponse.json({ error: 'Failed to save session' }, { status: 500 })
    }

    // Fire async AI parse if there are notes to parse
    if (combinedNotes && combinedNotes.length > 10) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      fetch(`${baseUrl}/api/sessions/parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: session.id, raw_notes: combinedNotes }),
      }).catch((err) => console.error('Async parse trigger failed:', err))
    }

    // Send notifications for yellow/red sentiment
    if (body.coach_sentiment === 'red' || body.coach_sentiment === 'yellow') {
      await sendSentimentNotifications(
        body.coach_sentiment,
        body.sentiment_reason,
        session.id,
        body.coach_id,
        body.lead_id,
        body.date
      )
    }

    return NextResponse.json({ session })
  } catch (err) {
    console.error('Session notes error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const coachId = searchParams.get('coach_id')
    const leadId = searchParams.get('lead_id')
    const sentiment = searchParams.get('sentiment')
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const supabase = await createServiceRoleClient()

    let query = supabase
      .from('sessions')
      .select(`
        *,
        coach:users!coach_id(id, name, coach_tier),
        lead:leads!lead_id(id, athlete_name, contact_name)
      `)
      .order('date', { ascending: false })
      .range(offset, offset + limit - 1)

    if (coachId) query = query.eq('coach_id', coachId)
    if (leadId) query = query.eq('lead_id', leadId)
    if (sentiment && sentiment !== 'all') query = query.eq('coach_sentiment', sentiment)
    if (dateFrom) query = query.gte('date', dateFrom)
    if (dateTo) query = query.lte('date', dateTo)

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 })
    }

    const enriched = (data || []).map((s) => ({
      ...s,
      coach_name: s.coach?.name || undefined,
      athlete_name: s.lead?.athlete_name || undefined,
      contact_name: s.lead?.contact_name || undefined,
    }))

    return NextResponse.json({ sessions: enriched })
  } catch (err) {
    console.error('Session fetch error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function sendSentimentNotifications(
  sentiment: 'yellow' | 'red',
  reason: string,
  sessionId: string,
  coachId: string,
  leadId: string,
  date: string
) {
  const supabase = await createServiceRoleClient()

  // Get coach and athlete names for the notification
  const [coachResult, leadResult] = await Promise.all([
    supabase.from('users').select('name').eq('id', coachId).single(),
    supabase.from('leads').select('athlete_name, contact_name').eq('id', leadId).single(),
  ])

  const coachName = coachResult.data?.name || 'Unknown Coach'
  const athleteName = leadResult.data?.athlete_name || leadResult.data?.contact_name || 'Unknown Athlete'
  const color = sentiment === 'red' ? 0xff4444 : 0xffa500
  const emoji = sentiment === 'red' ? '🔴' : '🟡'
  const label = sentiment === 'red' ? 'RED — No-Go' : 'YELLOW — Needs Discussion'

  // Discord notification (both yellow and red)
  if (process.env.DISCORD_WEBHOOK_URL) {
    try {
      await fetch(process.env.DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: `${emoji} **Coach Sentiment Alert: ${label}**`,
          embeds: [
            {
              title: athleteName,
              color,
              fields: [
                { name: 'Coach', value: coachName, inline: true },
                { name: 'Date', value: date, inline: true },
                { name: 'Sentiment', value: label, inline: true },
                { name: 'Reason', value: reason },
              ],
              timestamp: new Date().toISOString(),
            },
          ],
        }),
      })
    } catch (e) {
      console.error('Discord notification failed:', e)
    }
  }

  // SMS notification (red only — sent to Will and Greg)
  if (sentiment === 'red' && process.env.TWILIO_ACCOUNT_SID) {
    const phones = [process.env.WILL_PHONE, process.env.GREG_PHONE].filter(Boolean)
    const message = `${emoji} COACH ALERT: ${coachName} flagged ${athleteName} as RED (no-go) on ${date}. Reason: ${reason.slice(0, 120)}`

    for (const phone of phones) {
      try {
        await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              Authorization: `Basic ${Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64')}`,
            },
            body: new URLSearchParams({
              From: process.env.TWILIO_PHONE_NUMBER!,
              To: phone!,
              Body: message,
            }),
          }
        )
      } catch (e) {
        console.error('SMS send failed:', e)
      }
    }
  }
}
```

**Step 2: Create parse route**

File: `src/app/api/sessions/parse/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

const PARSE_SYSTEM_PROMPT = `You are the session notes parser for 108 Performance, a baseball/softball training academy. Analyze the coach's raw session notes and extract structured data.

Extract from the notes:
- drills: specific drills or exercises mentioned
- observations: what the coach noticed about the athlete's performance
- cues_that_worked: coaching cues or tips that were effective
- recommendations: what the athlete should work on next
- concerns: any red flags, injury notes, or behavioral issues

Return ONLY valid JSON matching this exact schema:
{
  "drills": string[],
  "observations": string[],
  "cues_that_worked": string[],
  "recommendations": string[],
  "concerns": string[]
}

If a category has no entries, return an empty array. Be concise — each item should be 1-2 sentences max.`

export async function POST(request: NextRequest) {
  try {
    const { session_id, raw_notes } = await request.json()

    if (!session_id || !raw_notes) {
      return NextResponse.json({ error: 'session_id and raw_notes are required' }, { status: 400 })
    }

    // Call Claude API
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        system: PARSE_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Parse these session notes:\n\n${raw_notes}`,
          },
        ],
      }),
    })

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text()
      console.error('Anthropic API error:', errText)
      return NextResponse.json({ error: 'AI parsing failed' }, { status: 500 })
    }

    const anthropicData = await anthropicRes.json()
    const responseText = anthropicData.content[0]?.text || ''

    // Parse the JSON from Claude's response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
    }

    const parsed = JSON.parse(jsonMatch[0])

    // Save parsed notes back to session
    const supabase = await createServiceRoleClient()
    const { error: dbError } = await supabase
      .from('sessions')
      .update({
        parsed_notes: parsed,
        ai_parsed_at: new Date().toISOString(),
      })
      .eq('id', session_id)

    if (dbError) {
      console.error('Failed to save parsed notes:', dbError)
    }

    return NextResponse.json({ parsed })
  } catch (err) {
    console.error('Parse error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

**Step 3: Create exit-eval route**

File: `src/app/api/sessions/exit-eval/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.session_id) {
      return NextResponse.json({ error: 'session_id is required' }, { status: 400 })
    }

    const supabase = await createServiceRoleClient()

    const { error: dbError } = await supabase
      .from('sessions')
      .update({
        is_exit_eval: true,
        exit_eval: {
          progress_rating: body.progress_rating,
          goals_achieved: body.goals_achieved,
          skill_improvements: body.skill_improvements,
          behavioral_assessment: body.behavioral_assessment,
          recommendation: body.recommendation,
          final_notes: body.final_notes,
          would_work_again: body.would_work_again,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', body.session_id)

    if (dbError) {
      console.error('Exit eval save error:', dbError)
      return NextResponse.json({ error: 'Failed to save exit evaluation' }, { status: 500 })
    }

    // Notify managers that exit eval was submitted
    if (process.env.DISCORD_WEBHOOK_URL) {
      const { data: session } = await supabase
        .from('sessions')
        .select(`
          *,
          coach:users!coach_id(name),
          lead:leads!lead_id(athlete_name, contact_name)
        `)
        .eq('id', body.session_id)
        .single()

      if (session) {
        const coachName = session.coach?.name || 'Unknown'
        const athleteName = session.lead?.athlete_name || session.lead?.contact_name || 'Unknown'
        const recLabel = body.recommendation === 'reenroll' ? '✅ Re-enroll'
          : body.recommendation === 'graduate' ? '🎓 Graduate'
          : body.recommendation === 'not_a_fit' ? '❌ Not a fit'
          : '🔄 Different program'

        try {
          await fetch(process.env.DISCORD_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: '📋 **Exit Evaluation Submitted**',
              embeds: [
                {
                  title: athleteName,
                  color: 0x8b5cf6,
                  fields: [
                    { name: 'Coach', value: coachName, inline: true },
                    { name: 'Progress', value: `${body.progress_rating}/5`, inline: true },
                    { name: 'Recommendation', value: recLabel, inline: true },
                    { name: 'Would Work Again', value: body.would_work_again, inline: true },
                  ],
                  timestamp: new Date().toISOString(),
                },
              ],
            }),
          })
        } catch (e) {
          console.error('Discord notification failed:', e)
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Exit eval error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

**Step 4: Verify build**

```bash
cd /Users/gregoriowiggles/Development/108-lead-intel && npx tsc --noEmit
```

Expected: 0 errors.

**Step 5: Commit**

```bash
git add src/app/api/sessions/
git commit -m "feat(api): add session notes, AI parse, and exit eval routes"
```

---

## Task 5: Sessions Hook

**Files:**
- Create: `src/hooks/useSessions.ts`

**Context:** Follows the `useSchedule` pattern — fetches sessions with joins, provides filter callbacks, includes realtime subscription for live updates.

**Step 1: Create useSessions hook**

```typescript
'use client'

import { useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { SessionEnriched, SessionFilters, SessionNoteInput } from '@/types'

export function useSessions() {
  const [sessions, setSessions] = useState<SessionEnriched[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const fetchSessions = useCallback(
    async (filters: SessionFilters = {}) => {
      setLoading(true)
      try {
        let query = supabase
          .from('sessions')
          .select(`
            *,
            coach:users!coach_id(id, name, coach_tier),
            lead:leads!lead_id(id, athlete_name, contact_name)
          `)
          .order('date', { ascending: false })
          .limit(100)

        if (filters.coach_id) query = query.eq('coach_id', filters.coach_id)
        if (filters.lead_id) query = query.eq('lead_id', filters.lead_id)
        if (filters.sentiment && filters.sentiment !== 'all') {
          query = query.eq('coach_sentiment', filters.sentiment)
        }
        if (filters.date_from) query = query.gte('date', filters.date_from)
        if (filters.date_to) query = query.lte('date', filters.date_to)

        const { data, error: fetchError } = await query

        if (fetchError) throw fetchError

        const enriched: SessionEnriched[] = (data || []).map((s) => ({
          ...s,
          coach_name: s.coach?.name || undefined,
          athlete_name: s.lead?.athlete_name || undefined,
          contact_name: s.lead?.contact_name || undefined,
        }))

        setSessions(enriched)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch sessions')
      } finally {
        setLoading(false)
      }
    },
    [supabase]
  )

  const saveNote = useCallback(
    async (input: SessionNoteInput) => {
      const res = await fetch('/api/sessions/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save note')
      }

      return res.json()
    },
    []
  )

  const saveExitEval = useCallback(
    async (evalData: Record<string, unknown>) => {
      const res = await fetch('/api/sessions/exit-eval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(evalData),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save exit evaluation')
      }

      return res.json()
    },
    []
  )

  // Get session for a specific slot
  const getSessionBySlot = useCallback(
    (slotId: string) => sessions.find((s) => s.schedule_slot_id === slotId),
    [sessions]
  )

  // Group sessions by date
  const sessionsByDate = useMemo(() => {
    const grouped: Record<string, SessionEnriched[]> = {}
    sessions.forEach((s) => {
      if (!grouped[s.date]) grouped[s.date] = []
      grouped[s.date].push(s)
    })
    return grouped
  }, [sessions])

  return {
    sessions,
    loading,
    error,
    fetchSessions,
    saveNote,
    saveExitEval,
    getSessionBySlot,
    sessionsByDate,
  }
}
```

**Step 2: Verify types compile**

```bash
cd /Users/gregoriowiggles/Development/108-lead-intel && npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/hooks/useSessions.ts
git commit -m "feat: add useSessions hook"
```

---

## Task 6: Session Note Components (4 files)

**Files:**
- Create: `src/components/sessions/VoiceRecorder.tsx`
- Create: `src/components/sessions/SentimentPicker.tsx`
- Create: `src/components/sessions/SessionNoteForm.tsx`
- Create: `src/components/sessions/ExitEvalForm.tsx`

**Context:** These are the coach-facing note entry components. They embed inside SlotDetail. Follow the existing component patterns: `'use client'` directive, lucide-react icons, Tailwind + globals.css utilities (`.card`, `.badge`, `.btn-primary`, `.input`), mobile-first sizing.

**Step 1: Create VoiceRecorder component**

File: `src/components/sessions/VoiceRecorder.tsx`

```tsx
'use client'

import { Mic, MicOff, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder'

interface VoiceRecorderProps {
  onTranscriptChange: (transcript: string) => void
  transcript: string
}

export default function VoiceRecorder({ onTranscriptChange, transcript }: VoiceRecorderProps) {
  const { isRecording, isSupported, error, startRecording, stopRecording, clearTranscript } =
    useVoiceRecorder()

  const handleStart = () => {
    startRecording()
  }

  const handleStop = () => {
    stopRecording()
  }

  const handleClear = () => {
    clearTranscript()
    onTranscriptChange('')
  }

  // Sync transcript up to parent
  // The hook manages its own state; we need to bridge it
  // We'll use the hook's transcript via a ref pattern in the form instead

  if (!isSupported) {
    return (
      <p className="text-xs text-gray-400 italic">
        Voice recording not available in this browser. Use text input below.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={isRecording ? handleStop : handleStart}
          className={cn(
            'flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all',
            isRecording
              ? 'bg-red-500 text-white animate-pulse'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          )}
        >
          {isRecording ? (
            <>
              <MicOff className="h-4 w-4" />
              Stop Recording
            </>
          ) : (
            <>
              <Mic className="h-4 w-4" />
              Record Voice
            </>
          )}
        </button>

        {transcript && (
          <button
            type="button"
            onClick={handleClear}
            className="rounded-lg p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {isRecording && (
        <div className="flex items-center gap-2 text-xs text-red-500">
          <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          Listening...
        </div>
      )}

      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}

      {transcript && (
        <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700 max-h-32 overflow-y-auto">
          {transcript}
        </div>
      )}
    </div>
  )
}
```

**Step 2: Create SentimentPicker component**

File: `src/components/sessions/SentimentPicker.tsx`

```tsx
'use client'

import { cn } from '@/lib/utils'
import type { CoachSentiment } from '@/types'

interface SentimentPickerProps {
  value: CoachSentiment | null
  reason: string
  onSentimentChange: (sentiment: CoachSentiment) => void
  onReasonChange: (reason: string) => void
}

const sentiments: { value: CoachSentiment; label: string; description: string; color: string; activeColor: string }[] = [
  {
    value: 'green',
    label: 'Green',
    description: 'No issues',
    color: 'border-green-200 text-green-700 hover:bg-green-50',
    activeColor: 'bg-green-500 text-white border-green-500',
  },
  {
    value: 'yellow',
    label: 'Yellow',
    description: 'Needs discussion',
    color: 'border-amber-200 text-amber-700 hover:bg-amber-50',
    activeColor: 'bg-amber-500 text-white border-amber-500',
  },
  {
    value: 'red',
    label: 'Red',
    description: 'No-go',
    color: 'border-red-200 text-red-700 hover:bg-red-50',
    activeColor: 'bg-red-500 text-white border-red-500',
  },
]

export default function SentimentPicker({
  value,
  reason,
  onSentimentChange,
  onReasonChange,
}: SentimentPickerProps) {
  return (
    <div className="space-y-3">
      <label className="text-xs font-semibold uppercase text-gray-400">
        Coach Sentiment
      </label>

      <div className="grid grid-cols-3 gap-2">
        {sentiments.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => onSentimentChange(s.value)}
            className={cn(
              'flex flex-col items-center gap-1 rounded-xl border-2 p-3 text-center transition-all',
              value === s.value ? s.activeColor : s.color
            )}
          >
            <span className="text-sm font-semibold">{s.label}</span>
            <span className={cn(
              'text-xs',
              value === s.value ? 'text-white/80' : 'text-gray-400'
            )}>
              {s.description}
            </span>
          </button>
        ))}
      </div>

      {value && (
        <div>
          <label className="text-xs text-gray-500 mb-1 block">
            {value === 'green' ? 'Positive feedback (required)' :
             value === 'yellow' ? 'What needs to be discussed? (required)' :
             'Why is this a no-go? (required)'}
          </label>
          <textarea
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            placeholder={
              value === 'green' ? 'Great attitude, worked hard today...' :
              value === 'yellow' ? 'Showed up late, attitude was off...' :
              'Refused to follow instructions, safety concern...'
            }
            className="input w-full resize-none"
            rows={2}
          />
        </div>
      )}
    </div>
  )
}
```

**Step 3: Create SessionNoteForm component**

File: `src/components/sessions/SessionNoteForm.tsx`

```tsx
'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Save, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ScheduleSlotEnriched, NoteMode, CoachSentiment, SessionNoteInput } from '@/types'
import VoiceRecorder from './VoiceRecorder'
import SentimentPicker from './SentimentPicker'
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder'

interface SessionNoteFormProps {
  slot: ScheduleSlotEnriched
  coachId: string
  onSaved: () => void
  existingNotes?: string
}

export default function SessionNoteForm({ slot, coachId, onSaved, existingNotes }: SessionNoteFormProps) {
  const [mode, setMode] = useState<NoteMode>('quick')
  const [rawNotes, setRawNotes] = useState(existingNotes || '')
  const [sentiment, setSentiment] = useState<CoachSentiment | null>(null)
  const [sentimentReason, setSentimentReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Extended mode fields
  const [drillsPerformed, setDrillsPerformed] = useState<string[]>([])
  const [drillInput, setDrillInput] = useState('')
  const [keyObservations, setKeyObservations] = useState('')
  const [cuesGiven, setCuesGiven] = useState('')
  const [recommendations, setRecommendations] = useState('')
  const [effortRating, setEffortRating] = useState<number | null>(null)
  const [injuryNotes, setInjuryNotes] = useState('')

  const { transcript } = useVoiceRecorder()

  const canSave = sentiment && sentimentReason.trim().length > 0

  const handleAddDrill = () => {
    if (drillInput.trim()) {
      setDrillsPerformed([...drillsPerformed, drillInput.trim()])
      setDrillInput('')
    }
  }

  const handleRemoveDrill = (index: number) => {
    setDrillsPerformed(drillsPerformed.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    if (!canSave) return

    setSaving(true)
    setError(null)

    try {
      const input: SessionNoteInput = {
        schedule_slot_id: slot.id,
        lead_id: slot.lead_id,
        coach_id: coachId,
        date: slot.date,
        skill: slot.skill,
        raw_notes: rawNotes || undefined,
        voice_transcript: transcript || undefined,
        note_mode: mode,
        coach_sentiment: sentiment,
        sentiment_reason: sentimentReason,
        ...(mode === 'extended' && {
          drills_performed: drillsPerformed,
          key_observations: keyObservations || undefined,
          cues_given: cuesGiven || undefined,
          recommendations: recommendations || undefined,
          athlete_effort_rating: effortRating || undefined,
          injury_notes: injuryNotes || undefined,
        }),
      }

      const res = await fetch('/api/sessions/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save')
      }

      setSaved(true)
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (saved) {
    return (
      <div className="card p-4 border-green-200 bg-green-50">
        <p className="text-sm font-medium text-green-700">Session notes saved</p>
        <p className="text-xs text-green-600 mt-1">AI parsing in progress...</p>
      </div>
    )
  }

  return (
    <div className="card p-4 space-y-4">
      {/* Header with mode toggle */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase text-gray-400">Session Notes</h3>
        <button
          type="button"
          onClick={() => setMode(mode === 'quick' ? 'extended' : 'quick')}
          className="flex items-center gap-1 text-xs text-brand-600 font-medium"
        >
          {mode === 'quick' ? (
            <>Extended <ChevronDown className="h-3 w-3" /></>
          ) : (
            <>Quick <ChevronUp className="h-3 w-3" /></>
          )}
        </button>
      </div>

      {/* Voice recorder */}
      <VoiceRecorder
        onTranscriptChange={() => {}}
        transcript={transcript}
      />

      {/* Text notes */}
      <div>
        <label className="text-xs text-gray-500 mb-1 block">Notes</label>
        <textarea
          value={rawNotes}
          onChange={(e) => setRawNotes(e.target.value)}
          placeholder="Type session notes here..."
          className="input w-full resize-none"
          rows={3}
        />
      </div>

      {/* Sentiment picker */}
      <SentimentPicker
        value={sentiment}
        reason={sentimentReason}
        onSentimentChange={setSentiment}
        onReasonChange={setSentimentReason}
      />

      {/* Extended mode fields */}
      {mode === 'extended' && (
        <div className="space-y-4 border-t border-gray-100 pt-4">
          {/* Drills */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Drills Performed</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={drillInput}
                onChange={(e) => setDrillInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddDrill())}
                placeholder="Add a drill..."
                className="input flex-1"
              />
              <button
                type="button"
                onClick={handleAddDrill}
                className="btn-secondary text-xs px-3"
              >
                Add
              </button>
            </div>
            {drillsPerformed.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {drillsPerformed.map((drill, i) => (
                  <span
                    key={i}
                    className="badge bg-brand-50 text-brand-700 text-xs cursor-pointer hover:bg-red-50 hover:text-red-600"
                    onClick={() => handleRemoveDrill(i)}
                  >
                    {drill} ×
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Key Observations */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Key Observations</label>
            <textarea
              value={keyObservations}
              onChange={(e) => setKeyObservations(e.target.value)}
              placeholder="What did you notice about the athlete's performance?"
              className="input w-full resize-none"
              rows={2}
            />
          </div>

          {/* Cues Given */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Cues Given</label>
            <textarea
              value={cuesGiven}
              onChange={(e) => setCuesGiven(e.target.value)}
              placeholder="What coaching cues did you use?"
              className="input w-full resize-none"
              rows={2}
            />
          </div>

          {/* Recommendations */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Recommendations</label>
            <textarea
              value={recommendations}
              onChange={(e) => setRecommendations(e.target.value)}
              placeholder="What should the athlete work on next?"
              className="input w-full resize-none"
              rows={2}
            />
          </div>

          {/* Effort Rating */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Athlete Effort (1-5)</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setEffortRating(n)}
                  className={cn(
                    'h-10 w-10 rounded-xl text-sm font-semibold transition-all',
                    effortRating === n
                      ? 'bg-brand-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Injury Notes */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Injury / Limitation Notes (optional)</label>
            <textarea
              value={injuryNotes}
              onChange={(e) => setInjuryNotes(e.target.value)}
              placeholder="Any injuries or physical limitations noted?"
              className="input w-full resize-none"
              rows={2}
            />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={!canSave || saving}
        className={cn(
          'btn-primary w-full flex items-center justify-center gap-2',
          !canSave && 'opacity-50 cursor-not-allowed'
        )}
      >
        {saving ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
        ) : (
          <><Save className="h-4 w-4" /> Save Session Notes</>
        )}
      </button>
    </div>
  )
}
```

**Step 4: Create ExitEvalForm component**

File: `src/components/sessions/ExitEvalForm.tsx`

```tsx
'use client'

import { useState } from 'react'
import { ClipboardCheck, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ExitEvalFormProps {
  sessionId: string
  athleteName: string
  onSaved: () => void
}

export default function ExitEvalForm({ sessionId, athleteName, onSaved }: ExitEvalFormProps) {
  const [progressRating, setProgressRating] = useState<number | null>(null)
  const [behavioral, setBehavioral] = useState('')
  const [recommendation, setRecommendation] = useState<string | null>(null)
  const [finalNotes, setFinalNotes] = useState('')
  const [wouldWorkAgain, setWouldWorkAgain] = useState<string | null>(null)
  const [skillImprovements, setSkillImprovements] = useState({ hitting: '', pitching: '' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSave = progressRating && recommendation && wouldWorkAgain

  const handleSave = async () => {
    if (!canSave) return

    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/sessions/exit-eval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          progress_rating: progressRating,
          goals_achieved: {},
          skill_improvements: skillImprovements,
          behavioral_assessment: behavioral,
          recommendation,
          final_notes: finalNotes,
          would_work_again: wouldWorkAgain,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save')
      }

      setSaved(true)
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (saved) {
    return (
      <div className="card p-4 border-purple-200 bg-purple-50">
        <p className="text-sm font-medium text-purple-700">Exit evaluation submitted</p>
      </div>
    )
  }

  return (
    <div className="card p-4 space-y-4 border-purple-200">
      <div className="flex items-center gap-2">
        <ClipboardCheck className="h-5 w-5 text-purple-500" />
        <h3 className="text-sm font-bold text-gray-900">Exit Evaluation — {athleteName}</h3>
      </div>
      <p className="text-xs text-gray-500">Final day. Complete this evaluation for the athlete.</p>

      {/* Progress Rating */}
      <div>
        <label className="text-xs text-gray-500 mb-1 block">Overall Progress (1-5)</label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setProgressRating(n)}
              className={cn(
                'h-10 w-10 rounded-xl text-sm font-semibold transition-all',
                progressRating === n
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Skill Improvements */}
      <div>
        <label className="text-xs text-gray-500 mb-1 block">Hitting Improvements</label>
        <textarea
          value={skillImprovements.hitting}
          onChange={(e) => setSkillImprovements({ ...skillImprovements, hitting: e.target.value })}
          placeholder="What improved in hitting?"
          className="input w-full resize-none"
          rows={2}
        />
      </div>
      <div>
        <label className="text-xs text-gray-500 mb-1 block">Pitching Improvements</label>
        <textarea
          value={skillImprovements.pitching}
          onChange={(e) => setSkillImprovements({ ...skillImprovements, pitching: e.target.value })}
          placeholder="What improved in pitching?"
          className="input w-full resize-none"
          rows={2}
        />
      </div>

      {/* Behavioral Assessment */}
      <div>
        <label className="text-xs text-gray-500 mb-1 block">Behavioral Assessment</label>
        <textarea
          value={behavioral}
          onChange={(e) => setBehavioral(e.target.value)}
          placeholder="Coachability, effort, attitude..."
          className="input w-full resize-none"
          rows={2}
        />
      </div>

      {/* Recommendation */}
      <div>
        <label className="text-xs text-gray-500 mb-2 block">Recommendation</label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: 'reenroll', label: 'Re-enroll', color: 'border-green-200 text-green-700', active: 'bg-green-500 text-white border-green-500' },
            { value: 'graduate', label: 'Graduate', color: 'border-blue-200 text-blue-700', active: 'bg-blue-500 text-white border-blue-500' },
            { value: 'not_a_fit', label: 'Not a Fit', color: 'border-red-200 text-red-700', active: 'bg-red-500 text-white border-red-500' },
            { value: 'different_program', label: 'Different Program', color: 'border-amber-200 text-amber-700', active: 'bg-amber-500 text-white border-amber-500' },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setRecommendation(opt.value)}
              className={cn(
                'rounded-xl border-2 p-2 text-sm font-medium transition-all',
                recommendation === opt.value ? opt.active : opt.color
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Would work again */}
      <div>
        <label className="text-xs text-gray-500 mb-2 block">Would you work with this athlete again?</label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: 'yes', label: 'Yes' },
            { value: 'with_conditions', label: 'With Conditions' },
            { value: 'no', label: 'No' },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setWouldWorkAgain(opt.value)}
              className={cn(
                'rounded-xl border-2 p-2 text-xs font-medium transition-all',
                wouldWorkAgain === opt.value
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Final Notes */}
      <div>
        <label className="text-xs text-gray-500 mb-1 block">Final Notes</label>
        <textarea
          value={finalNotes}
          onChange={(e) => setFinalNotes(e.target.value)}
          placeholder="Summary of the athlete's experience..."
          className="input w-full resize-none"
          rows={3}
        />
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <button
        onClick={handleSave}
        disabled={!canSave || saving}
        className={cn(
          'w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all',
          canSave ? 'bg-purple-500 text-white hover:bg-purple-600' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
        )}
      >
        {saving ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Submitting...</>
        ) : (
          <><ClipboardCheck className="h-4 w-4" /> Submit Exit Evaluation</>
        )}
      </button>
    </div>
  )
}
```

**Step 5: Verify build**

```bash
cd /Users/gregoriowiggles/Development/108-lead-intel && npx tsc --noEmit
```

Expected: 0 errors.

**Step 6: Commit**

```bash
git add src/components/sessions/
git commit -m "feat: add session note entry components (VoiceRecorder, SentimentPicker, SessionNoteForm, ExitEvalForm)"
```

---

## Task 7: Integrate SessionNoteForm into SlotDetail

**Files:**
- Modify: `src/components/schedule/SlotDetail.tsx`

**Context:** Add the SessionNoteForm below the conflict info section but above the AthleteDossier. Only show when the slot status is `scheduled`, `in_progress`, or `completed` (not `canceled`). Need the user's ID from the auth context.

**Step 1: Add imports and state to SlotDetail**

At the top of `SlotDetail.tsx`, add:

```typescript
import { useState } from 'react'
import SessionNoteForm from '@/components/sessions/SessionNoteForm'
import ExitEvalForm from '@/components/sessions/ExitEvalForm'
import { useUser } from '@/hooks/useUser'
```

**Step 2: Add state and user context inside the component**

Inside the `SlotDetail` function, after the existing `athleteName` and `dayLabel` variables, add:

```typescript
const { user } = useUser()
const [noteSaved, setNoteSaved] = useState(false)
const [exitEvalSaved, setExitEvalSaved] = useState(false)

const showNoteForm = slot.status !== 'canceled' && slot.coach_id && user?.id
const showExitEval = slot.is_final_day && noteSaved && !exitEvalSaved
```

**Step 3: Add the note form section**

After the conflict info section (`{slot.conflict_reason && ...}`) and before the AthleteDossier section (`{slot.lead_id && ...}`), add:

```tsx
{/* Session Notes — shows for non-canceled slots */}
{showNoteForm && (
  <SessionNoteForm
    slot={slot}
    coachId={user!.id}
    onSaved={() => setNoteSaved(true)}
  />
)}

{/* Exit Evaluation — shows on final day after notes saved */}
{showExitEval && (
  <ExitEvalForm
    sessionId={slot.id}
    athleteName={athleteName}
    onSaved={() => setExitEvalSaved(true)}
  />
)}
```

**Step 4: Verify build**

```bash
cd /Users/gregoriowiggles/Development/108-lead-intel && npx tsc --noEmit
```

Expected: 0 errors.

**Step 5: Commit**

```bash
git add src/components/schedule/SlotDetail.tsx
git commit -m "feat: embed SessionNoteForm + ExitEvalForm in SlotDetail"
```

---

## Task 8: Sessions History Page Components (3 files)

**Files:**
- Create: `src/components/sessions/SessionCard.tsx`
- Create: `src/components/sessions/SessionFilters.tsx`
- Create: `src/components/sessions/ParsedNotesDisplay.tsx`

**Step 1: Create SessionCard component**

File: `src/components/sessions/SessionCard.tsx`

```tsx
'use client'

import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import type { SessionEnriched } from '@/types'

interface SessionCardProps {
  session: SessionEnriched
  onClick: (session: SessionEnriched) => void
}

const sentimentBadge: Record<string, { bg: string; label: string }> = {
  green: { bg: 'bg-green-100 text-green-700', label: 'Green' },
  yellow: { bg: 'bg-amber-100 text-amber-700', label: 'Yellow' },
  red: { bg: 'bg-red-100 text-red-700', label: 'Red' },
}

export default function SessionCard({ session, onClick }: SessionCardProps) {
  const dateLabel = format(new Date(session.date + 'T00:00:00'), 'MMM d, yyyy')
  const sentiment = session.coach_sentiment ? sentimentBadge[session.coach_sentiment] : null
  const athleteName = session.athlete_name || session.contact_name || 'Unknown'

  // Show a preview of parsed notes or raw notes
  const preview = session.parsed_notes?.observations?.[0]
    || session.raw_notes?.slice(0, 80)
    || 'No notes'

  return (
    <button
      onClick={() => onClick(session)}
      className="card p-4 w-full text-left hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900 truncate">{athleteName}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {session.coach_name || 'Unknown Coach'} &middot; {dateLabel} &middot; {session.skill}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {sentiment && (
            <span className={cn('badge text-xs', sentiment.bg)}>
              {sentiment.label}
            </span>
          )}
          {session.is_exit_eval && (
            <span className="badge bg-purple-100 text-purple-700 text-xs">Exit</span>
          )}
          {session.ai_parsed_at && (
            <span className="badge bg-blue-50 text-blue-600 text-xs">AI</span>
          )}
        </div>
      </div>

      <p className="text-xs text-gray-500 mt-2 line-clamp-2">{preview}</p>
    </button>
  )
}
```

**Step 2: Create SessionFilters component**

File: `src/components/sessions/SessionFilters.tsx`

```tsx
'use client'

import { useState } from 'react'
import { Search, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CoachSentiment, SessionFilters as Filters } from '@/types'

interface SessionFiltersProps {
  filters: Filters
  onFiltersChange: (filters: Filters) => void
  coaches: { id: string; name: string }[]
}

const sentimentOptions: { value: CoachSentiment | 'all'; label: string; color: string }[] = [
  { value: 'all', label: 'All', color: 'bg-gray-100 text-gray-700' },
  { value: 'green', label: 'Green', color: 'bg-green-100 text-green-700' },
  { value: 'yellow', label: 'Yellow', color: 'bg-amber-100 text-amber-700' },
  { value: 'red', label: 'Red', color: 'bg-red-100 text-red-700' },
]

export default function SessionFiltersBar({ filters, onFiltersChange, coaches }: SessionFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)

  return (
    <div className="space-y-3">
      {/* Sentiment chips */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {sentimentOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onFiltersChange({ ...filters, sentiment: opt.value })}
            className={cn(
              'badge whitespace-nowrap text-xs transition-all',
              filters.sentiment === opt.value
                ? opt.value === 'all'
                  ? 'bg-gray-900 text-white'
                  : opt.color.replace('100', '500').replace(/text-\w+-700/, 'text-white')
                : opt.color
            )}
          >
            {opt.label}
          </button>
        ))}

        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="badge bg-gray-50 text-gray-500 whitespace-nowrap"
        >
          <Filter className="h-3 w-3 mr-1 inline" />
          Filters
        </button>
      </div>

      {/* Advanced filters */}
      {showAdvanced && (
        <div className="card p-3 space-y-3">
          {/* Coach filter */}
          {coaches.length > 0 && (
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Coach</label>
              <select
                value={filters.coach_id || ''}
                onChange={(e) => onFiltersChange({ ...filters, coach_id: e.target.value || undefined })}
                className="input w-full text-sm"
              >
                <option value="">All Coaches</option>
                {coaches.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Date range */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">From</label>
              <input
                type="date"
                value={filters.date_from || ''}
                onChange={(e) => onFiltersChange({ ...filters, date_from: e.target.value || undefined })}
                className="input w-full text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">To</label>
              <input
                type="date"
                value={filters.date_to || ''}
                onChange={(e) => onFiltersChange({ ...filters, date_to: e.target.value || undefined })}
                className="input w-full text-sm"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

**Step 3: Create ParsedNotesDisplay component**

File: `src/components/sessions/ParsedNotesDisplay.tsx`

```tsx
'use client'

import type { ParsedSessionNotes } from '@/types'

interface ParsedNotesDisplayProps {
  parsed: ParsedSessionNotes
}

export default function ParsedNotesDisplay({ parsed }: ParsedNotesDisplayProps) {
  const sections = [
    { label: 'Drills', items: parsed.drills, color: 'text-brand-600' },
    { label: 'Observations', items: parsed.observations, color: 'text-blue-600' },
    { label: 'Cues That Worked', items: parsed.cues_that_worked, color: 'text-green-600' },
    { label: 'Recommendations', items: parsed.recommendations, color: 'text-amber-600' },
    { label: 'Concerns', items: parsed.concerns, color: 'text-red-600' },
  ].filter((s) => s.items && s.items.length > 0)

  if (sections.length === 0) {
    return <p className="text-xs text-gray-400 italic">No parsed data available</p>
  }

  return (
    <div className="space-y-3">
      {sections.map((section) => (
        <div key={section.label}>
          <h4 className={`text-xs font-semibold uppercase ${section.color} mb-1`}>
            {section.label}
          </h4>
          <ul className="space-y-1">
            {section.items.map((item, i) => (
              <li key={i} className="text-xs text-gray-700 flex gap-2">
                <span className="text-gray-300 flex-shrink-0">&bull;</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
```

**Step 4: Verify build**

```bash
cd /Users/gregoriowiggles/Development/108-lead-intel && npx tsc --noEmit
```

**Step 5: Commit**

```bash
git add src/components/sessions/SessionCard.tsx src/components/sessions/SessionFilters.tsx src/components/sessions/ParsedNotesDisplay.tsx
git commit -m "feat: add sessions history components (SessionCard, SessionFilters, ParsedNotesDisplay)"
```

---

## Task 9: Sessions History Page

**Files:**
- Modify: `src/app/sessions/page.tsx`

**Context:** Replace the "Coming soon" stub with the full sessions history page. Uses RoleGate, useSessions hook, SessionFilters, SessionCard, and an inline detail expansion.

**Step 1: Read the existing stub first, then replace it**

```tsx
'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import RoleGate from '@/components/layout/RoleGate'
import { useSessions } from '@/hooks/useSessions'
import { useUser } from '@/hooks/useUser'
import { useCoaches } from '@/hooks/useCoaches'
import SessionCard from '@/components/sessions/SessionCard'
import SessionFiltersBar from '@/components/sessions/SessionFilters'
import ParsedNotesDisplay from '@/components/sessions/ParsedNotesDisplay'
import SentimentPicker from '@/components/sessions/SentimentPicker'
import type { SessionEnriched, SessionFilters } from '@/types'

export default function SessionsPage() {
  return (
    <RoleGate allowedRoles={['coach', 'coordinator', 'manager', 'admin']}>
      <SessionsContent />
    </RoleGate>
  )
}

function SessionsContent() {
  const { user } = useUser()
  const { sessions, loading, fetchSessions } = useSessions()
  const { coaches } = useCoaches()
  const [filters, setFilters] = useState<SessionFilters>({ sentiment: 'all' })
  const [selectedSession, setSelectedSession] = useState<SessionEnriched | null>(null)

  useEffect(() => {
    if (!user) return
    // Coaches see only their own sessions; managers see all
    const sessionFilters = user.role === 'coach'
      ? { ...filters, coach_id: user.id }
      : filters
    fetchSessions(sessionFilters)
  }, [user, filters, fetchSessions])

  const coachList = coaches.map((c) => ({ id: c.id, name: c.name }))

  return (
    <div className="min-h-screen bg-gray-50 pb-safe">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 pt-safe">
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-brand-500" />
          <h1 className="text-lg font-bold text-gray-900">Sessions</h1>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Filters */}
        <SessionFiltersBar
          filters={filters}
          onFiltersChange={setFilters}
          coaches={user?.role === 'coach' ? [] : coachList}
        />

        {/* Session list */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No sessions found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map((session) => (
              <div key={session.id}>
                <SessionCard
                  session={session}
                  onClick={setSelectedSession}
                />

                {/* Expanded detail */}
                {selectedSession?.id === session.id && (
                  <SessionDetailExpanded
                    session={session}
                    onClose={() => setSelectedSession(null)}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function SessionDetailExpanded({
  session,
  onClose,
}: {
  session: SessionEnriched
  onClose: () => void
}) {
  const sentimentBadge: Record<string, { bg: string; label: string }> = {
    green: { bg: 'bg-green-100 text-green-700', label: 'Green — No issues' },
    yellow: { bg: 'bg-amber-100 text-amber-700', label: 'Yellow — Needs discussion' },
    red: { bg: 'bg-red-100 text-red-700', label: 'Red — No-go' },
  }

  const sentiment = session.coach_sentiment ? sentimentBadge[session.coach_sentiment] : null

  return (
    <div className="card p-4 mt-1 space-y-4 border-l-4 border-brand-200">
      {/* Sentiment detail */}
      {sentiment && (
        <div>
          <span className={cn('badge text-xs', sentiment.bg)}>{sentiment.label}</span>
          {session.sentiment_reason && (
            <p className="text-xs text-gray-600 mt-1">{session.sentiment_reason}</p>
          )}
        </div>
      )}

      {/* Raw notes */}
      {session.raw_notes && (
        <div>
          <h4 className="text-xs font-semibold uppercase text-gray-400 mb-1">Raw Notes</h4>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{session.raw_notes}</p>
        </div>
      )}

      {/* AI Parsed notes */}
      {session.parsed_notes && session.ai_parsed_at && (
        <div>
          <h4 className="text-xs font-semibold uppercase text-gray-400 mb-1">
            AI-Parsed Notes
            <span className="text-gray-300 ml-1 normal-case">
              ({format(new Date(session.ai_parsed_at), 'MMM d, h:mma')})
            </span>
          </h4>
          <ParsedNotesDisplay parsed={session.parsed_notes} />
        </div>
      )}

      {/* Extended mode fields */}
      {session.note_mode === 'extended' && (
        <>
          {session.drills_performed && session.drills_performed.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase text-gray-400 mb-1">Drills</h4>
              <div className="flex flex-wrap gap-1">
                {session.drills_performed.map((d, i) => (
                  <span key={i} className="badge bg-brand-50 text-brand-700 text-xs">{d}</span>
                ))}
              </div>
            </div>
          )}
          {session.athlete_effort_rating && (
            <div>
              <h4 className="text-xs font-semibold uppercase text-gray-400 mb-1">Effort Rating</h4>
              <p className="text-sm text-gray-700">{session.athlete_effort_rating}/5</p>
            </div>
          )}
          {session.injury_notes && (
            <div>
              <h4 className="text-xs font-semibold uppercase text-red-400 mb-1">Injury Notes</h4>
              <p className="text-sm text-red-700">{session.injury_notes}</p>
            </div>
          )}
        </>
      )}

      {/* Exit eval */}
      {session.is_exit_eval && session.exit_eval && (
        <div className="border-t border-purple-100 pt-3">
          <h4 className="text-xs font-semibold uppercase text-purple-500 mb-2">Exit Evaluation</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {(session.exit_eval as Record<string, unknown>).progress_rating && (
              <div><span className="text-gray-400">Progress:</span> {String((session.exit_eval as Record<string, unknown>).progress_rating)}/5</div>
            )}
            {(session.exit_eval as Record<string, unknown>).recommendation && (
              <div><span className="text-gray-400">Rec:</span> {String((session.exit_eval as Record<string, unknown>).recommendation)}</div>
            )}
            {(session.exit_eval as Record<string, unknown>).would_work_again && (
              <div><span className="text-gray-400">Again:</span> {String((session.exit_eval as Record<string, unknown>).would_work_again)}</div>
            )}
          </div>
          {(session.exit_eval as Record<string, unknown>).final_notes && (
            <p className="text-xs text-gray-600 mt-2">{String((session.exit_eval as Record<string, unknown>).final_notes)}</p>
          )}
        </div>
      )}

      <button
        onClick={onClose}
        className="text-xs text-gray-400 hover:text-gray-600"
      >
        Collapse
      </button>
    </div>
  )
}
```

**Step 2: Verify build**

```bash
cd /Users/gregoriowiggles/Development/108-lead-intel && npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/app/sessions/page.tsx
git commit -m "feat: build sessions history page with filters and detail expansion"
```

---

## Task 10: Full Build Verification + Final Commit

**Step 1: Run full build**

```bash
cd /Users/gregoriowiggles/Development/108-lead-intel && npm run build
```

Expected: 0 errors, ~20 routes compiled.

**Step 2: Fix any type errors that arise**

Address compile errors if any. Common issues to watch for:
- Import paths (all use `@/` prefix)
- `date-fns` format function (ensure `date + 'T00:00:00'` pattern for date-only strings)
- SpeechRecognition type augmentation (speech.d.ts must be in `src/types/`)

**Step 3: Push all commits**

```bash
cd /Users/gregoriowiggles/Development/108-lead-intel && git push origin master
```

**Step 4: Remind user to run migration 005**

Print: "Run migration 005 in Supabase SQL Editor before testing."

---

## Summary of Deliverables

| # | What | Files |
|---|------|-------|
| 1 | Database migration | `supabase/migrations/005_add_session_notes_columns.sql` |
| 2 | TypeScript types | `src/types/index.ts` (modified), `src/types/speech.d.ts` (new) |
| 3 | Voice recorder hook | `src/hooks/useVoiceRecorder.ts` |
| 4 | API routes | `src/app/api/sessions/notes/route.ts`, `parse/route.ts`, `exit-eval/route.ts` |
| 5 | Sessions hook | `src/hooks/useSessions.ts` |
| 6 | Note entry components | `VoiceRecorder.tsx`, `SentimentPicker.tsx`, `SessionNoteForm.tsx`, `ExitEvalForm.tsx` |
| 7 | SlotDetail integration | `src/components/schedule/SlotDetail.tsx` (modified) |
| 8 | History components | `SessionCard.tsx`, `SessionFilters.tsx`, `ParsedNotesDisplay.tsx` |
| 9 | Sessions page | `src/app/sessions/page.tsx` (rewritten) |
| 10 | Build verification | Full build + push |

**Total new files:** 14
**Total modified files:** 2
**Estimated implementation time:** 60-90 minutes with subagent execution
