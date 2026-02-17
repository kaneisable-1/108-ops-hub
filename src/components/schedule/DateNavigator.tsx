'use client'

import { useState, useCallback } from 'react'
import { format, addDays, subDays, startOfWeek, endOfWeek, isToday } from 'date-fns'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'

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
    <div className="bg-white border-b border-steel-200">
      {/* Main date nav row */}
      <div className="flex items-center justify-between px-4 py-2">
        <button onClick={goPrev} className="rounded-lg p-2 hover:bg-steel-100 active:bg-steel-200">
          <ChevronLeft className="h-5 w-5 text-steel-600" />
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowWeekView(!showWeekView)}
            className="flex items-center gap-2 rounded-xl px-3 py-1.5 hover:bg-steel-100"
          >
            <Calendar className="h-4 w-4 text-navy-500" />
            <span className="text-base font-semibold text-navy-500">
              {isToday(selectedDate)
                ? 'Today'
                : format(selectedDate, 'EEE, MMM d')}
            </span>
          </button>

          {!isToday(selectedDate) && (
            <button
              onClick={goToday}
              className="rounded-lg bg-steel-100 px-2.5 py-1 text-xs font-semibold text-navy-500 hover:bg-steel-200"
            >
              Today
            </button>
          )}
        </div>

        <button onClick={goNext} className="rounded-lg p-2 hover:bg-steel-100 active:bg-steel-200">
          <ChevronRight className="h-5 w-5 text-steel-600" />
        </button>
      </div>

      {/* Week strip (expandable) */}
      {showWeekView && (
        <div className="border-t border-steel-100 px-2 py-2">
          <div className="flex items-center justify-between mb-1 px-2">
            <button onClick={goPrevWeek} className="p-1 rounded hover:bg-steel-100">
              <ChevronLeft className="h-4 w-4 text-steel-400" />
            </button>
            <span className="text-xs text-steel-500">
              {format(weekStart, 'MMM d')} — {format(weekEnd, 'MMM d')}
            </span>
            <button onClick={goNextWeek} className="p-1 rounded hover:bg-steel-100">
              <ChevronRight className="h-4 w-4 text-steel-400" />
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
                  className={`flex flex-col items-center rounded-xl py-1.5 text-xs transition-colors ${
                    isSelected
                      ? 'bg-navy-500 text-white'
                      : isTodayDate
                        ? 'bg-steel-100 text-navy-500'
                        : 'text-steel-600 hover:bg-steel-100'
                  }`}
                >
                  <span className="font-medium">{format(day, 'EEE')}</span>
                  <span className={`text-sm font-semibold ${isSelected ? 'text-white' : ''}`}>
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
