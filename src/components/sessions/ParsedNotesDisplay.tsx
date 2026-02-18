'use client'

import type { ParsedSessionNotes } from '@/types'

interface ParsedNotesDisplayProps {
  parsed: ParsedSessionNotes
}

export default function ParsedNotesDisplay({ parsed }: ParsedNotesDisplayProps) {
  const sections = [
    { label: 'Drills', items: parsed.drills, color: 'text-brand-400' },
    { label: 'Observations', items: parsed.observations, color: 'text-blue-400' },
    { label: 'Cues That Worked', items: parsed.cues_that_worked, color: 'text-emerald-400' },
    { label: 'Recommendations', items: parsed.recommendations, color: 'text-amber-400' },
    { label: 'Concerns', items: parsed.concerns, color: 'text-red-400' },
  ].filter((s) => s.items && s.items.length > 0)

  if (sections.length === 0) {
    return <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>No parsed data available</p>
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
              <li key={i} className="text-xs flex gap-2" style={{ color: 'var(--text-secondary)' }}>
                <span className="flex-shrink-0" style={{ color: 'var(--text-muted)' }}>&bull;</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
