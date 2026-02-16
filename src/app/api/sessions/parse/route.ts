import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getAnthropicKey } from '@/lib/env'
import type { ParsedSessionNotes } from '@/types'

const PARSE_SYSTEM_PROMPT = `You are a session notes parser for 108 Performance, a baseball and softball training academy. Given raw session notes from a coach, extract structured information.

Return ONLY valid JSON with this exact structure:
{
  "drills": ["list of drills performed"],
  "observations": ["key observations about the athlete"],
  "cues_that_worked": ["coaching cues that were effective"],
  "recommendations": ["recommendations for future sessions"],
  "concerns": ["any concerns about athlete health, behavior, or progress"]
}

Rules:
- Each array should contain concise, actionable items
- If a category has no relevant info, return an empty array
- Keep each item to 1-2 sentences max
- Focus on extractable facts, not filler
- Concerns should flag anything a manager or coordinator should know about`

/**
 * POST /api/sessions/parse
 *
 * AI parsing route. Called asynchronously after a session note is saved.
 * Uses Claude to extract structured data from raw notes.
 * Tracks parse_status: none → pending → completed | failed.
 *
 * Body: { session_id, raw_notes }
 */
export async function POST(request: NextRequest) {
  const supabase = await createServiceRoleClient()
  let sessionId: string | undefined

  try {
    const { session_id, raw_notes } = await request.json()
    sessionId = session_id

    if (!session_id || !raw_notes) {
      return NextResponse.json(
        { error: 'session_id and raw_notes are required' },
        { status: 400 }
      )
    }

    // Check if session has already been parsed (prevent duplicate parsing)
    const { data: existing, error: lookupError } = await supabase
      .from('sessions')
      .select('id, ai_parsed_at')
      .eq('id', session_id)
      .single()

    if (lookupError) {
      console.error('Session lookup error:', lookupError)
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (existing.ai_parsed_at) {
      return NextResponse.json({ error: 'Session already parsed', parsed_at: existing.ai_parsed_at }, { status: 409 })
    }

    // Mark as pending before calling Claude
    await supabase
      .from('sessions')
      .update({ parse_status: 'pending' })
      .eq('id', session_id)

    // Call Claude API for parsing
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': getAnthropicKey(),
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
      await markParseFailed(supabase, session_id, `Anthropic API HTTP ${anthropicRes.status}`)
      return NextResponse.json({ error: 'AI parsing failed' }, { status: 500 })
    }

    const anthropicData = await anthropicRes.json()
    const responseText = anthropicData.content[0]?.text || ''

    // Parse the JSON from Claude's response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('Failed to extract JSON from AI response:', responseText)
      await markParseFailed(supabase, session_id, 'No JSON found in AI response')
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
    }

    let parsed: ParsedSessionNotes
    try {
      parsed = JSON.parse(jsonMatch[0])
    } catch (parseErr) {
      console.error('Failed to parse JSON from AI response:', parseErr, jsonMatch[0])
      await markParseFailed(supabase, session_id, 'AI returned invalid JSON')
      return NextResponse.json({ error: 'AI returned invalid JSON' }, { status: 500 })
    }

    // Update session record with parsed notes — mark completed
    const { error: updateError } = await supabase
      .from('sessions')
      .update({
        parsed_notes: parsed,
        ai_parsed_at: new Date().toISOString(),
        parse_status: 'completed',
        parse_error: null,
      })
      .eq('id', session_id)

    if (updateError) {
      console.error('Session parse update error:', updateError)
      await markParseFailed(supabase, session_id, 'DB update failed after successful parse')
      return NextResponse.json({ error: 'Failed to update session with parsed notes' }, { status: 500 })
    }

    return NextResponse.json({ success: true, parsed })
  } catch (err) {
    console.error('Session parse error:', err)
    if (sessionId) {
      await markParseFailed(supabase, sessionId, err instanceof Error ? err.message : 'Unknown error')
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** Helper to mark a session's parse_status as failed */
async function markParseFailed(
  supabase: Awaited<ReturnType<typeof createServiceRoleClient>>,
  sessionId: string,
  errorMessage: string
) {
  try {
    await supabase
      .from('sessions')
      .update({ parse_status: 'failed', parse_error: errorMessage })
      .eq('id', sessionId)
  } catch (e) {
    console.error('Failed to mark parse as failed:', e)
  }
}
