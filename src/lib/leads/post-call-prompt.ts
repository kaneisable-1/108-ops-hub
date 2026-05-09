import type { PostCallAnalysis } from '@/types'

const POST_CALL_SYSTEM_PROMPT = `You are summarizing a sales call for 108 Performance, a premier baseball and softball training academy in Knoxville, TN.

Given the caller's voice notes about the call, extract structured information about what was discussed, the athlete details, and next steps.

108 Performance Services:
- 108 Experience (2-5 day fly-in intensive, $2,000-$4,000)
- Tri Star (monthly local training, $499/mo)
- Virtual Training (remote video analysis)
- Virtual Pro (advanced remote)
- College Prep (recruiting preparation)
- Draft Prep (MLB draft preparation)
- Pro Experience (professional player training)
- Coaches Experience (coach training)
- Performance Institute (academy enrollment)

Return ONLY valid JSON matching the exact schema provided.`

const POST_CALL_USER_PROMPT = (transcript: string, callOutcome: string) => `Summarize this sales call and return a JSON object.

CALL OUTCOME: ${callOutcome}
CALLER'S NOTES:
${transcript}

Return JSON with this exact structure:
{
  "summary": string (2-3 sentence summary of the call),
  "athlete_details": {
    "name": string | null,
    "age": number | null,
    "position": string | null,
    "velocity": string | null,
    "school_team": string | null,
    "level": "youth" | "middle_school" | "high_school" | "college" | "pro" | null
  },
  "service_interest": {
    "primary": string | null (which 108 service they're interested in),
    "duration": string | null (how long they want to train),
    "skills": string[] (specific skills mentioned)
  },
  "pricing": {
    "discussed": boolean,
    "amount": string | null,
    "payment_concern": boolean,
    "payment_plan": boolean
  },
  "objections": string[],
  "action_items": string[],
  "lead_temperature": "hot" | "warm" | "cold",
  "next_step": string | null,
  "follow_up_date": string | null (ISO date if mentioned),
  "referral_source": string | null,
  "call_outcome": "${callOutcome}"
}`

export async function analyzePostCall(
  transcript: string,
  callOutcome: string
): Promise<PostCallAnalysis> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: POST_CALL_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: POST_CALL_USER_PROMPT(transcript, callOutcome) }],
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    console.error('[post-call] Anthropic API error:', errText)
    throw new Error('Post-call analysis failed')
  }

  const data = await res.json()
  const responseText = data.content[0]?.text || ''
  const jsonMatch = responseText.match(/\{[\s\S]*\}/)

  if (!jsonMatch) {
    throw new Error('Failed to parse post-call analysis response')
  }

  return JSON.parse(jsonMatch[0]) as PostCallAnalysis
}
