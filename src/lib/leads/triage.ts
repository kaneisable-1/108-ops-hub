import type { AITriageResult } from '@/types'

export const TRIAGE_SYSTEM_PROMPT = `You are the AI triage system for 108 Performance, a premier baseball and softball training academy in Knoxville, TN. Analyze the provided lead message and extract structured information.

108 Performance Services:
- 108 Experience (2-5 day fly-in intensive, $2,000-$4,000)
- Tri Star (monthly local training, $499/mo)
- Virtual Training (remote video analysis)
- Virtual Pro (advanced remote)
- College Prep (recruiting preparation)
- Draft Prep (MLB draft preparation)
- Pro Experience (professional player training)
- Coaches Experience (coach training)
- Coaches Mentorship (ongoing coach development)
- Tour Experience (group events)
- Powered by 108 (facility licensing)
- Partnership (business partnerships)
- Performance Institute (academy enrollment)

Classification Rules:
- HOT: Ready to book, mentions specific dates/program, expresses urgency, says "I want to sign up"
- WARM: Has questions, interested but not committed, asking about pricing/availability
- COLD: Just browsing, very early stage, no specific interest

Queue Rules:
- call_now: HOT leads, parents asking to book, mentions travel plans
- follow_up: WARM leads, has questions, needs nurturing
- nurture: COLD leads, early stage, info seekers
- not_a_fit: Wrong sport, too far away, not serious

Return ONLY valid JSON matching this exact schema:`

export const TRIAGE_USER_PROMPT = (text: string) => `Analyze this lead message and return a JSON object:

MESSAGE:
${text}

Return JSON with this exact structure:
{
  "extracted": {
    "contact_name": string | null,
    "contact_phone": string | null,
    "contact_email": string | null,
    "athlete_name": string | null,
    "athlete_age": number | null,
    "athlete_position": string | null,
    "athlete_level": "youth" | "middle_school" | "high_school" | "college" | "pro" | null,
    "location": string | null
  },
  "classification": {
    "temperature": "hot" | "warm" | "cold",
    "fit_score": "good_fit" | "maybe" | "not_a_fit",
    "service_match": string,
    "intent": "ready_to_book" | "has_questions" | "just_browsing" | "price_shopping"
  },
  "routing": {
    "queue": "call_now" | "follow_up" | "nurture" | "not_a_fit",
    "priority": number (1-100, higher = more urgent),
    "reason": string
  },
  "content": {
    "summary": string (2-3 sentence summary),
    "suggested_response": string (personalized response for sales team),
    "objections": string[],
    "questions": string[]
  },
  "tags": string[]
}`

export async function triageLead(text: string): Promise<AITriageResult> {
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
      system: TRIAGE_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: TRIAGE_USER_PROMPT(text) }],
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    console.error('[triage] Anthropic API error:', errText)
    throw new Error('AI triage failed')
  }

  const data = await res.json()
  const responseText = data.content[0]?.text || ''
  const jsonMatch = responseText.match(/\{[\s\S]*\}/)

  if (!jsonMatch) {
    throw new Error('Failed to parse AI triage response')
  }

  return JSON.parse(jsonMatch[0]) as AITriageResult
}
