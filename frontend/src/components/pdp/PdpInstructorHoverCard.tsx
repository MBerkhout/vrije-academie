'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { defaultMessages, interpolate } from '@/lib/i18n/messages'
import { cn } from '@/lib/utils'
import type { EventInstructor } from '@/lib/commerce/types'

interface PdpInstructorHoverCardProps {
  name: string
  instructor?: EventInstructor | null
  className?: string
}

const CARD_WIDTH = 300

function isRenderablePhoto(url: string | null | undefined): url is string {
  return Boolean(url && /^https?:\/\//i.test(url))
}

export function PdpInstructorHoverCard({
  name,
  instructor,
  className,
}: PdpInstructorHoverCardProps) {
  const photoUrl = instructor?.photo_url?.trim() || null
  const bio = instructor?.bio?.trim() || null
  const displayName = instructor?.name?.trim() || name
  const hasCard = Boolean(isRenderablePhoto(photoUrl) || bio)

  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLButtonElement>(null)
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
    const estimatedHeight = 240
    const top =
      below + estimatedHeight > window.innerHeight - 12
        ? Math.max(12, rect.top - estimatedHeight - 8)
        : below
    setPos({ top, left })
  }

  const show = () => {
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
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!hasCard) {
    return <span className={className}>{name}</span>
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={cn(
          'text-left text-va-gray underline decoration-dotted decoration-va-gray/70 underline-offset-2',
          'hover:text-va-black hover:decoration-va-black transition-colors',
          className
        )}
        aria-expanded={open}
        aria-controls={cardId}
        aria-label={interpolate(t.instructorHoverAria, { name: displayName })}
        onPointerEnter={(event) => {
          if (event.pointerType === 'touch') return
          show()
        }}
        onPointerLeave={hide}
        onFocus={show}
        onBlur={hide}
        onClick={(event) => {
          const pointerType = (event.nativeEvent as PointerEvent).pointerType
          if (pointerType && pointerType !== 'touch') return
          event.preventDefault()
          if (open) hide()
          else show()
        }}
      >
        {name}
      </button>
      {open
        ? createPortal(
            <div
              id={cardId}
              role="tooltip"
              onPointerEnter={show}
              onPointerLeave={hide}
              style={{ top: pos.top, left: pos.left, width: CARD_WIDTH }}
              className="fixed z-50 rounded border border-va-lightgray bg-white p-3 shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
            >
              <div className="flex gap-3">
                {isRenderablePhoto(photoUrl) ? (
                  // eslint-disable-next-line @next/next/no-img-element -- docent photos may come from various hosts
                  <img
                    src={photoUrl}
                    alt=""
                    width={72}
                    height={72}
                    className="h-[72px] w-[72px] shrink-0 rounded object-cover"
                  />
                ) : (
                  <div
                    className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded bg-va-lightgray text-lg font-semibold text-va-gray"
                    aria-hidden
                  >
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <p className="min-w-0 font-semibold text-va-black leading-snug">{displayName}</p>
              </div>
              {bio ? (
                <p className="mt-2 text-sm leading-relaxed text-va-darkgray">{bio}</p>
              ) : null}
            </div>,
            document.body
          )
        : null}
    </>
  )
}
