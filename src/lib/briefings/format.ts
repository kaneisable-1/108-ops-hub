// ============================================
// Daily Briefing Formatters
// ============================================

import { format } from 'date-fns'
import type { ScheduleSlotEnriched, CoachTier } from '@/types'

export interface AthleteDossier {
  recentSummaries: string[]   // last 3 session key_observations
  injuryNotes: string[]       // recent injury_notes
  sentiment: 'green' | 'yellow' | 'red' | null
  sessionsLast30: number
  engagementBand: 'hot' | 'warm' | 'cold' | null
}

export interface BriefingData {
  coachName: string
  coachTier: CoachTier
  date: string
  morningSlots: ScheduleSlotEnriched[]
  afternoonSlots: ScheduleSlotEnriched[]
  dossiers?: Record<string, AthleteDossier> // keyed by lead_id
}

/**
 * Format briefing as plain text (for SMS / basic display)
 */
export function formatBriefingText(data: BriefingData): string {
  const dateStr = format(new Date(data.date + 'T00:00:00'), 'EEEE, MMMM d')
  const lines: string[] = []

  lines.push(`Daily Briefing — ${dateStr}`)
  lines.push(`Coach: ${data.coachName} (${data.coachTier})`)
  lines.push('')

  const total = data.morningSlots.length + data.afternoonSlots.length
  lines.push(`${total} athlete${total !== 1 ? 's' : ''} today`)
  lines.push('')

  const formatSlotText = (slot: ScheduleSlotEnriched) => {
    const name = slot.athlete_name || slot.contact_name || 'Unknown'
    const dayInfo = slot.duration_days
      ? `Day ${slot.day_number}/${slot.duration_days}`
      : `Day ${slot.day_number}`
    const exitTag = slot.is_final_day ? ' [EXIT EVAL]' : ''
    const level = slot.athlete_level
      ? ` (${slot.athlete_level.replace('_', ' ')})`
      : ''
    const slotLines: string[] = []
    slotLines.push(`  - ${name}${level} — ${dayInfo}${exitTag}`)

    // Append dossier if available
    const dossier = data.dossiers?.[slot.lead_id]
    if (dossier) {
      if (dossier.sentiment === 'red') {
        slotLines.push(`    [AT RISK] ${dossier.injuryNotes.length > 0 ? 'Injury noted' : 'Red sentiment flagged'}`)
      } else if (dossier.sentiment === 'yellow') {
        slotLines.push(`    [WATCH] Yellow sentiment`)
      }
      if (dossier.injuryNotes.length > 0) {
        slotLines.push(`    Injury: ${dossier.injuryNotes[0]}`)
      }
      if (dossier.recentSummaries.length > 0) {
        slotLines.push(`    Last note: ${dossier.recentSummaries[0]}`)
      }
    }
    return slotLines
  }

  if (data.morningSlots.length > 0) {
    lines.push('MORNING (Pitching)')
    for (const slot of data.morningSlots) {
      lines.push(...formatSlotText(slot))
    }
    lines.push('')
  }

  if (data.afternoonSlots.length > 0) {
    lines.push('AFTERNOON (Hitting)')
    for (const slot of data.afternoonSlots) {
      lines.push(...formatSlotText(slot))
    }
  }

  // At-risk summary section
  if (data.dossiers) {
    const atRiskLeads = Object.entries(data.dossiers)
      .filter(([, d]) => d.sentiment === 'red')
    if (atRiskLeads.length > 0) {
      lines.push('')
      lines.push(`RISK FLAGS (${atRiskLeads.length})`)
      for (const [leadId, dossier] of atRiskLeads) {
        const slot = [...data.morningSlots, ...data.afternoonSlots].find((s) => s.lead_id === leadId)
        const name = slot?.athlete_name || slot?.contact_name || 'Unknown'
        const reasons = [
          ...dossier.injuryNotes.map((n) => `Injury: ${n}`),
          ...(dossier.engagementBand === 'cold' ? ['Engagement: cold'] : []),
        ]
        lines.push(`  - ${name}: ${reasons.length > 0 ? reasons.join('; ') : 'Red sentiment'}`)
      }
    }
  }

  return lines.join('\n')
}

function buildDossierHtml(dossier: AthleteDossier): string {
  const parts: string[] = []

  if (dossier.injuryNotes.length > 0) {
    parts.push(`<div style="font-size:11px;color:#DC2626;margin-top:4px;">Injury: ${dossier.injuryNotes[0]}</div>`)
  }
  if (dossier.recentSummaries.length > 0) {
    parts.push(`<div style="font-size:11px;color:#6B7280;margin-top:2px;">Last: ${dossier.recentSummaries[0]}</div>`)
  }
  if (dossier.engagementBand === 'cold') {
    parts.push(`<div style="font-size:11px;color:#9333EA;margin-top:2px;">Low engagement (${dossier.sessionsLast30} sessions/30d)</div>`)
  }

  return parts.join('')
}

/**
 * Format briefing as HTML (for email via Resend)
 */
export function formatBriefingHtml(data: BriefingData): string {
  const dateStr = format(new Date(data.date + 'T00:00:00'), 'EEEE, MMMM d')
  const total = data.morningSlots.length + data.afternoonSlots.length

  const athleteRow = (slot: ScheduleSlotEnriched) => {
    const name = slot.athlete_name || slot.contact_name || 'Unknown'
    const dayInfo = slot.duration_days
      ? `Day ${slot.day_number}/${slot.duration_days}`
      : `Day ${slot.day_number}`
    const exitBadge = slot.is_final_day
      ? '<span style="background:#E5E7EB;color:#374151;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:600;">EXIT EVAL</span>'
      : ''
    const age = slot.athlete_age ? `Age ${slot.athlete_age}` : ''
    const level = slot.athlete_level ? slot.athlete_level.replace('_', ' ') : ''
    const meta = [age, level].filter(Boolean).join(' | ')

    // Dossier info
    const dossier = data.dossiers?.[slot.lead_id]
    const riskBadge = dossier?.sentiment === 'red'
      ? '<span style="background:#FEE2E2;color:#DC2626;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:600;">AT RISK</span>'
      : dossier?.sentiment === 'yellow'
      ? '<span style="background:#FEF3C7;color:#D97706;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:600;">WATCH</span>'
      : ''
    const dossierHtml = dossier ? buildDossierHtml(dossier) : ''

    return `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #F3F4F6;">
          <div style="font-weight:600;color:#111827;">${name} ${exitBadge} ${riskBadge}</div>
          <div style="font-size:12px;color:#6B7280;">${dayInfo} ${meta ? '— ' + meta : ''}</div>
          ${dossierHtml}
        </td>
      </tr>
    `
  }

  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:480px;margin:0 auto;">
      <div style="background:#111827;color:white;padding:16px 20px;border-radius:12px 12px 0 0;">
        <h1 style="margin:0;font-size:18px;">Daily Briefing</h1>
        <p style="margin:4px 0 0;font-size:14px;opacity:0.9;">${dateStr}</p>
      </div>
      <div style="background:white;padding:16px 20px;border:1px solid #E5E7EB;border-top:0;">
        <p style="color:#374151;font-size:14px;margin:0 0 12px;">
          Hey ${data.coachName} — you have <strong>${total} athlete${total !== 1 ? 's' : ''}</strong> today.
        </p>

        ${data.morningSlots.length > 0 ? `
          <h3 style="color:#D97706;font-size:13px;margin:16px 0 8px;text-transform:uppercase;letter-spacing:0.5px;">
            Morning — Pitching
          </h3>
          <table style="width:100%;border-collapse:collapse;background:#F9FAFB;border-radius:8px;">
            ${data.morningSlots.map(athleteRow).join('')}
          </table>
        ` : ''}

        ${data.afternoonSlots.length > 0 ? `
          <h3 style="color:#6366F1;font-size:13px;margin:16px 0 8px;text-transform:uppercase;letter-spacing:0.5px;">
            Afternoon — Hitting
          </h3>
          <table style="width:100%;border-collapse:collapse;background:#F9FAFB;border-radius:8px;">
            ${data.afternoonSlots.map(athleteRow).join('')}
          </table>
        ` : ''}
      </div>
      <div style="padding:12px 20px;background:#F9FAFB;border:1px solid #E5E7EB;border-top:0;border-radius:0 0 12px 12px;text-align:center;">
        <p style="color:#9CA3AF;font-size:11px;margin:0;">
          108 Performance Ops Hub
        </p>
      </div>
    </div>
  `
}

/**
 * Format briefing for Discord webhook
 */
export function formatBriefingDiscord(data: BriefingData): object {
  const dateStr = format(new Date(data.date + 'T00:00:00'), 'EEEE, MMMM d')
  const total = data.morningSlots.length + data.afternoonSlots.length

  const formatSlotList = (slots: ScheduleSlotEnriched[]): string => {
    return slots
      .map((slot) => {
        const name = slot.athlete_name || slot.contact_name || 'Unknown'
        const dayInfo = slot.duration_days
          ? `Day ${slot.day_number}/${slot.duration_days}`
          : `Day ${slot.day_number}`
        const exitTag = slot.is_final_day ? ' **[EXIT]**' : ''
        return `• ${name} — ${dayInfo}${exitTag}`
      })
      .join('\n')
  }

  const fields: { name: string; value: string; inline?: boolean }[] = []

  if (data.morningSlots.length > 0) {
    fields.push({
      name: 'Morning (Pitching)',
      value: formatSlotList(data.morningSlots),
    })
  }

  if (data.afternoonSlots.length > 0) {
    fields.push({
      name: 'Afternoon (Hitting)',
      value: formatSlotList(data.afternoonSlots),
    })
  }

  return {
    embeds: [
      {
        title: `Daily Briefing — ${data.coachName}`,
        description: `**${dateStr}**\n${total} athlete${total !== 1 ? 's' : ''} today`,
        color: 0xf97316, // brand orange
        fields,
        footer: { text: '108 Performance Ops Hub' },
        timestamp: new Date().toISOString(),
      },
    ],
  }
}
