'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

interface AgendaDayPickerProps {
  /** Currently selected day in YYYY-MM-DD, or undefined. */
  value?: string
  /** Called when a day is clicked. Passing undefined clears the selection. */
  onChange: (value: string | undefined) => void
  className?: string
}

const DAY_HEADERS = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo']
const MONTHS_NL = [
  'januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december',
]

function pad(n: number) {
  return n.toString().padStart(2, '0')
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Monday-first weekday index: Mon=0 ... Sun=6 */
function weekdayMondayFirst(d: Date): number {
  const js = d.getDay() // 0 Sun ... 6 Sat
  return (js + 6) % 7
}

export function AgendaDayPicker({ value, onChange, className }: AgendaDayPickerProps) {
  const today = new Date()
  const initial = value ? new Date(value) : today
  const [viewYear, setViewYear] = useState(initial.getFullYear())
  const [viewMonth, setViewMonth] = useState(initial.getMonth())

  const firstOfMonth = new Date(viewYear, viewMonth, 1)
  const leading = weekdayMondayFirst(firstOfMonth)
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()

  // Build 6×7 grid with prev/next month filler so the layout stays constant.
  const cells: { date: Date; inMonth: boolean }[] = []
  const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate()
  for (let i = leading - 1; i >= 0; i--) {
    const d = new Date(viewYear, viewMonth - 1, prevMonthDays - i)
    cells.push({ date: d, inMonth: false })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(viewYear, viewMonth, d), inMonth: true })
  }
  while (cells.length % 7 !== 0 || cells.length < 42) {
    const next = new Date(viewYear, viewMonth + 1, cells.length - leading - daysInMonth + 1)
    cells.push({ date: next, inMonth: false })
    if (cells.length >= 42) break
  }

  function prevMonth() {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1)
      setViewMonth(11)
    } else {
      setViewMonth((m) => m - 1)
    }
  }
  function nextMonth() {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1)
      setViewMonth(0)
    } else {
      setViewMonth((m) => m + 1)
    }
  }

  const todayStr = ymd(today)

  return (
    <div className={cn('space-y-2', className)}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={prevMonth}
          aria-label="Vorige maand"
          className="w-6 h-6 flex items-center justify-center text-va-darkgray hover:text-va-black"
        >
          ‹
        </button>
        <span className="text-sm font-semibold text-va-black capitalize">
          {MONTHS_NL[viewMonth]} {viewYear}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          aria-label="Volgende maand"
          className="w-6 h-6 flex items-center justify-center text-va-darkgray hover:text-va-black"
        >
          ›
        </button>
      </div>

      {/* Weekday labels */}
      <div className="grid grid-cols-7 gap-0.5 text-[11px] text-va-gray text-center">
        {DAY_HEADERS.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map(({ date, inMonth }, i) => {
          const dateStr = ymd(date)
          const isSelected = value === dateStr
          const isToday = dateStr === todayStr
          return (
            <button
              key={i}
              type="button"
              onClick={() => onChange(isSelected ? undefined : dateStr)}
              className={cn(
                'aspect-square flex items-center justify-center text-xs rounded transition-colors leading-none',
                !inMonth && 'text-va-gray/50',
                inMonth && !isSelected && 'text-va-black hover:bg-va-lightgray',
                isSelected && 'bg-va-yellow text-va-black font-semibold',
                !isSelected && isToday && 'ring-1 ring-va-yellow',
              )}
            >
              {date.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}
