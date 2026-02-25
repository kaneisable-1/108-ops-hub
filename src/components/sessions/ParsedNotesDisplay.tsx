'use client'

import type { ParsedSessionNotes } from '@/types'

interface ParsedNotesDisplayProps {
  parsed: ParsedSessionNotes
}

export default function ParsedNotesDisplay({ parsed }: ParsedNotesDisplayProps) {
  const sections = [
    { label: 'Drills', items: parsed.drills, color: 'var(--accent-blue)' },
    { label: 'Observations', items: parsed.observations, color: 'var(--accent-blue)' },
    { label: 'Cues That Worked', items: parsed.cues_that_worked, color: 'var(--color-success)' },
    { label: 'Recommendations', items: parsed.recommendations, color: 'var(--color-warning)' },
    { label: 'Concerns', items: parsed.concerns, color: 'var(--color-danger)' },
  ].filter((s) => s.items && s.items.length > 0)

  if (sections.length === 0) {
    return <p className="text-xs italic" style={{ color: 'var(--text-placeholder)' }}>No parsed data available</p>
  }

  return (
    <div className="space-y-3">
      {sections.map((section) => (
        <div key={section.label}>
          <h4
            className="text-xs font-semibold uppercase mb-1"
            style={{ color: section.color }}
          >
            {section.label}
          </h4>
          <ul className="space-y-1">
            {section.items.map((item, i) => (
              <li key={i} className="text-xs flex gap-2" style={{ color: 'var(--text-secondary)' }}>
                <span className="flex-shrink-0" style={{ color: 'var(--text-placeholder)' }}>&bull;</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
