'use client'

import { useState, useCallback } from 'react'
import { format, addDays, subDays, startOfWeek, endOfWeek, isToday } from 'date-fns'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DateNavigatorProps {
  selectedDate: Date
  onDateChange: (date: Date) => void
}

export default function DateNavigator({ selectedDate, onDateChange }: DateNavigatorProps) {
  const [showWeekView, setShowWeekView] = useState(false)

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 }) // Monday start
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 })
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const goToday = useCallback(() => {
    onDateChange(new Date())
  }, [onDateChange])

  const goPrev = useCallback(() => {
    onDateChange(subDays(selectedDate, 1))
  }, [selectedDate, onDateChange])

  const goNext = useCallback(() => {
    onDateChange(addDays(selectedDate, 1))
  }, [selectedDate, onDateChange])

  const goPrevWeek = useCallback(() => {
    onDateChange(subDays(selectedDate, 7))
  }, [selectedDate, onDateChange])

  const goNextWeek = useCallback(() => {
    onDateChange(addDays(selectedDate, 7))
  }, [selectedDate, onDateChange])

  return (
    <div style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-light)' }}>
      {/* Main date nav row */}
      <div className="flex items-center justify-between px-4 py-2">
        <button
          onClick={goPrev}
          className="btn-icon"
          aria-label="Previous day"
        >
          <ChevronLeft size={20} strokeWidth={1.75} />
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowWeekView(!showWeekView)}
            className="flex items-center gap-2 rounded-lg px-3 py-1.5 transition-colors duration-200 ease-apple cursor-pointer"
            style={{ ['--hover-bg' as string]: 'var(--bg-secondary)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-secondary)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <Calendar size={16} strokeWidth={1.75} style={{ color: 'var(--accent-blue)' }} />
            <span className="text-base font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>
              {isToday(selectedDate)
                ? 'Today'
                : format(selectedDate, 'EEE, MMM d')}
            </span>
          </button>

          {!isToday(selectedDate) && (
            <button
              onClick={goToday}
              className="rounded-md px-2.5 py-1 text-xs font-semibold transition-colors duration-200 ease-apple cursor-pointer"
              style={{
                background: 'color-mix(in srgb, var(--accent-blue) 12%, transparent)',
                color: 'var(--accent-blue)',
              }}
            >
              Today
            </button>
          )}
        </div>

        <button
          onClick={goNext}
          className="btn-icon"
          aria-label="Next day"
        >
          <ChevronRight size={20} strokeWidth={1.75} />
        </button>
      </div>

      {/* Week strip (expandable) */}
      {showWeekView && (
        <div className="px-2 py-2 animate-fade-in" style={{ borderTop: '1px solid var(--border-light)' }}>
          <div className="flex items-center justify-between mb-1 px-2">
            <button
              onClick={goPrevWeek}
              className="btn-icon p-1"
              aria-label="Previous week"
            >
              <ChevronLeft size={16} strokeWidth={1.75} />
            </button>
            <span className="text-xs tabular-nums" style={{ color: 'var(--text-tertiary)' }}>
              {format(weekStart, 'MMM d')} — {format(weekEnd, 'MMM d')}
            </span>
            <button
              onClick={goNextWeek}
              className="btn-icon p-1"
              aria-label="Next week"
            >
              <ChevronRight size={16} strokeWidth={1.75} />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {weekDays.map((day) => {
              const isSelected =
                format(day, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
              const isTodayDate = isToday(day)

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => onDateChange(day)}
                  className="flex flex-col items-center rounded-lg py-1.5 text-xs transition-all duration-200 ease-apple cursor-pointer"
                  style={{
                    background: isSelected
                      ? 'var(--accent-blue)'
                      : isTodayDate
                        ? 'color-mix(in srgb, var(--accent-blue) 12%, transparent)'
                        : 'transparent',
                    color: isSelected
                      ? '#FFFFFF'
                      : isTodayDate
                        ? 'var(--accent-blue)'
                        : 'var(--text-secondary)',
                    boxShadow: isSelected ? 'var(--shadow-sm)' : 'none',
                  }}
                >
                  <span className="font-medium">{format(day, 'EEE')}</span>
                  <span className="text-sm font-semibold tabular-nums">
                    {format(day, 'd')}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
