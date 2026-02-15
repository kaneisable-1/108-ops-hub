'use client'

import type { ParsedSessionNotes } from '@/types'

interface ParsedNotesDisplayProps {
  parsed: ParsedSessionNotes
}

export default function ParsedNotesDisplay({ parsed }: ParsedNotesDisplayProps) {
  const sections = [
    { label: 'Drills', items: parsed.drills, color: 'text-gray-900' },
    { label: 'Observations', items: parsed.observations, color: 'text-gray-700' },
    { label: 'Cues That Worked', items: parsed.cues_that_worked, color: 'text-gray-600' },
    { label: 'Recommendations', items: parsed.recommendations, color: 'text-gray-500' },
    { label: 'Concerns', items: parsed.concerns, color: 'text-gray-900' },
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
