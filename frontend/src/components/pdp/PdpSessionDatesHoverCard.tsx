'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { EventVariant } from '@/lib/commerce/types'
import { defaultMessages } from '@/lib/i18n/messages'
import { formatDateWeekdayLong, formatTimeRange } from '@/lib/locale-format'
import { cn } from '@/lib/utils'

export type EventSessionDate = {
  start_at: string
  end_at?: string | null
}

interface PdpSessionDatesHoverCardProps {
  dates: EventSessionDate[]
  /** Primary date shown in the table cell (for highlight). */
  primaryStartAt?: string | null
  children: React.ReactNode
  className?: string
}

const CARD_WIDTH = 280

export function PdpSessionDatesHoverCard({
  dates,
  primaryStartAt,
  children,
  className,
}: PdpSessionDatesHoverCardProps) {
  const showHover = dates.length > 1
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLSpanElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const hideTimer = useRef<number | null>(null)
  const cardId = useId()
  const t = defaultMessages.pdp

  const clearHide = () => {
    if (hideTimer.current != null) {
      window.clearTimeout(hideTimer.current)
      hideTimer.current = null
    }
  }

  const updatePos = () => {
    const el = triggerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    let left = rect.left
    if (left + CARD_WIDTH > window.innerWidth - 12) {
      left = window.innerWidth - CARD_WIDTH - 12
    }
    if (left < 12) left = 12
    const below = rect.bottom + 8
    const estimatedHeight = Math.min(320, 72 + dates.length * 44)
    const top =
      below + estimatedHeight > window.innerHeight - 12
        ? Math.max(12, rect.top - estimatedHeight - 8)
        : below
    setPos({ top, left })
  }

  const show = () => {
    if (!showHover) return
    clearHide()
    updatePos()
    setOpen(true)
  }

  const hide = () => {
    clearHide()
    hideTimer.current = window.setTimeout(() => setOpen(false), 120)
  }

  useEffect(() => () => clearHide(), [])

  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    const onScroll = (event: Event) => {
      const target = event.target
      if (target instanceof Node && cardRef.current?.contains(target)) return
      close()
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', close)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', close)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const primaryKey = primaryStartAt
    ? new Date(primaryStartAt).toISOString()
    : null

  if (!showHover) {
    return <span className={className}>{children}</span>
  }

  return (
    <>
      <span
        ref={triggerRef}
        role="button"
        tabIndex={0}
        className={cn(
          'inline cursor-default underline decoration-dotted decoration-va-gray/70 underline-offset-2',
          'hover:text-va-black hover:decoration-va-black transition-colors',
          className
        )}
        aria-expanded={open}
        aria-controls={cardId}
        aria-label={t.sessionDatesHoverAria ?? 'Alle lesdata'}
        onPointerEnter={(event) => {
          if (event.pointerType === 'touch') return
          show()
        }}
        onPointerLeave={hide}
        onFocus={show}
        onBlur={hide}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            if (open) hide()
            else show()
          }
        }}
        onClick={(event) => {
          const pointerType = (event.nativeEvent as PointerEvent).pointerType
          if (pointerType && pointerType !== 'touch') return
          event.preventDefault()
          if (open) hide()
          else show()
        }}
      >
        {children}
      </span>
      {open
        ? createPortal(
            <div
              ref={cardRef}
              id={cardId}
              role="tooltip"
              onPointerEnter={show}
              onPointerLeave={hide}
              style={{ top: pos.top, left: pos.left, width: CARD_WIDTH }}
              className="fixed z-50 rounded border border-va-lightgray bg-white p-3 shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
            >
              <p className="mb-2 text-sm font-semibold text-va-black">
                {t.sessionDatesHoverTitle ?? 'Alle data'}
              </p>
              <ul className="max-h-64 space-y-2 overflow-y-auto overscroll-y-contain text-sm">
                {dates.map((row) => {
                  const rowKey = row.start_at
                  const isPrimary =
                    primaryKey != null &&
                    new Date(row.start_at).toISOString() === primaryKey
                  return (
                    <li
                      key={rowKey}
                      className={cn(
                        'text-va-darkgray',
                        isPrimary && 'font-semibold text-va-black'
                      )}
                    >
                      <span className="block">{formatDateWeekdayLong(row.start_at)}</span>
                      {row.end_at ? (
                        <span className="block text-xs text-va-gray">
                          {formatTimeRange(row.start_at, row.end_at)}
                        </span>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
              <p className="mt-2 text-xs text-va-gray">
                {t.sessionDatesHoverDisclaimer ?? 'Wijzigingen onder voorbehoud'}
              </p>
            </div>,
            document.body
          )
        : null}
    </>
  )
}

export function sessionDatesFromEventItem(
  eventItem: EventVariant['event_item']
): EventSessionDate[] {
  if (!eventItem?.dates?.length) return []
  return eventItem.dates
}