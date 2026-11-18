'use client'

import Link from 'next/link'
import { useEffect, useId, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import { SanityImage } from '@/components/cms/SanityImage'
import { getTitleSizeClass } from '@/lib/cms'
import { lockBodyScroll } from '@/lib/body-scroll-lock'
import { cn } from '@/lib/utils'

const BIO_PANEL_WIDTH = 300
const BIO_PANEL_MAX_HEIGHT = 280
const VIEWPORT_PAD = 12

function isRenderablePhotoUrl(url: string | null | undefined): url is string {
  return !!url && /^https?:\/\//i.test(url)
}

export type PersonCardPerson = {
  _id?: string
  name?: string
  role?: string
  bio?: string
  photo?: { asset?: unknown }
  photoUrl?: string
  profileUrl?: string
  slug?: string
}

type PersonCardProps = {
  person: PersonCardPerson
  showBio: boolean
  listingHref?: string
  listingLabel: string
}

function PersonPhoto({ person }: { person: PersonCardPerson }) {
  const photo = person.photo
  const photoUrl = person.photoUrl
  if (photo) {
    return (
      <div className="h-[126px] w-[100px] flex-shrink-0 overflow-hidden rounded">
        <SanityImage source={photo} width={100} height={126} aspectRatio="" />
      </div>
    )
  }
  if (isRenderablePhotoUrl(photoUrl)) {
    return (
      <div className="relative h-[126px] w-[100px] flex-shrink-0 overflow-hidden rounded">
        {/* eslint-disable-next-line @next/next/no-img-element -- mirrored Salesforce/Medusa URLs */}
        <img
          src={photoUrl}
          alt=""
          className="h-full w-full object-cover"
          width={100}
          height={126}
        />
      </div>
    )
  }
  return (
    <div
      className="flex h-[126px] w-[100px] flex-shrink-0 items-center justify-center rounded bg-va-lightgray"
      aria-hidden
    >
      <span className="text-va-gray text-xl">?</span>
    </div>
  )
}

function isDesktopHover() {
  return typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches
}

export function PersonCard({ person, showBio, listingHref, listingLabel }: PersonCardProps) {
  const name = person.name ?? ''
  const role = person.role
  const bio = person.bio?.trim()
  const revealBio = showBio && Boolean(bio)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [desktopOpen, setDesktopOpen] = useState(false)
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0, maxHeight: BIO_PANEL_MAX_HEIGHT })
  const articleRef = useRef<HTMLElement>(null)
  const hideTimer = useRef<number | null>(null)
  const titleId = useId()
  const bioPanelId = useId()

  const clearHideTimer = () => {
    if (hideTimer.current != null) {
      window.clearTimeout(hideTimer.current)
      hideTimer.current = null
    }
  }

  const updatePanelPos = () => {
    const el = articleRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const gap = 8
    const maxHeight = Math.min(
      BIO_PANEL_MAX_HEIGHT,
      window.innerHeight - VIEWPORT_PAD * 2
    )

    let left = rect.right + gap
    if (left + BIO_PANEL_WIDTH > window.innerWidth - VIEWPORT_PAD) {
      left = rect.left - BIO_PANEL_WIDTH - gap
    }
    if (left < VIEWPORT_PAD) {
      left = Math.max(VIEWPORT_PAD, rect.left)
    }

    let top = rect.top
    if (top + maxHeight > window.innerHeight - VIEWPORT_PAD) {
      top = Math.max(VIEWPORT_PAD, window.innerHeight - VIEWPORT_PAD - maxHeight)
    }

    setPanelPos({ top, left, maxHeight })
  }

  const showDesktopPanel = () => {
    if (!revealBio || !isDesktopHover()) return
    clearHideTimer()
    updatePanelPos()
    setDesktopOpen(true)
  }

  const hideDesktopPanel = () => {
    clearHideTimer()
    hideTimer.current = window.setTimeout(() => setDesktopOpen(false), 120)
  }

  useEffect(() => () => clearHideTimer(), [])

  useEffect(() => {
    if (!desktopOpen) return
    const close = () => setDesktopOpen(false)
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
      window.removeEventListener('keydown', onKey)
    }
  }, [desktopOpen])

  useEffect(() => {
    if (!mobileOpen) return
    return lockBodyScroll()
  }, [mobileOpen])

  useEffect(() => {
    if (!mobileOpen) return
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mobileOpen])

  const openMobileBio = () => {
    if (!revealBio) return
    setMobileOpen(true)
  }

  return (
    <>
      <article
        ref={articleRef}
        className={cn(
          'relative rounded border border-va-lightgray p-4',
          revealBio && 'max-md:cursor-pointer'
        )}
        {...(revealBio
          ? {
              tabIndex: 0,
              'aria-describedby': desktopOpen ? bioPanelId : undefined,
              onPointerEnter: (e) => {
                if (e.pointerType === 'touch') return
                showDesktopPanel()
              },
              onPointerLeave: hideDesktopPanel,
              onFocus: showDesktopPanel,
              onBlur: hideDesktopPanel,
              onKeyDown: (e: KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  if (window.matchMedia('(max-width: 767px)').matches) {
                    e.preventDefault()
                    openMobileBio()
                  }
                }
              },
              onClick: (e: MouseEvent) => {
                if ((e.target as HTMLElement).closest('a')) return
                if (!window.matchMedia('(max-width: 767px)').matches) return
                openMobileBio()
              },
              'aria-label': role ? `${name}, ${role}` : name,
            }
          : {})}
      >
        <div className="flex gap-4">
          <PersonPhoto person={person} />
          <div className="min-w-0 flex-1">
            <h3 className={cn(getTitleSizeClass('h3'), 'font-sans font-semibold text-va-black')}>
              {name}
            </h3>
            {role && <p className="text-sm text-va-gray">{role}</p>}
            {listingHref && (
              <Link href={listingHref} className="text-va-orange underline text-sm mt-1 inline-block">
                {listingLabel}
              </Link>
            )}
          </div>
        </div>
      </article>
      {revealBio && desktopOpen
        ? createPortal(
            <div
              id={bioPanelId}
              role="tooltip"
              style={{
                top: panelPos.top,
                left: panelPos.left,
                width: BIO_PANEL_WIDTH,
                maxHeight: panelPos.maxHeight,
              }}
              className="fixed z-[60] overflow-y-auto rounded border border-va-lightgray bg-white p-4 shadow-[0_8px_24px_rgba(0,0,0,0.12)] max-md:hidden"
              onPointerEnter={showDesktopPanel}
              onPointerLeave={hideDesktopPanel}
            >
              <p className="text-sm leading-relaxed text-va-darkgray">{bio}</p>
            </div>,
            document.body
          )
        : null}
      {revealBio && mobileOpen
        ? createPortal(
            <div
              className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-4 sm:items-center md:hidden"
              role="presentation"
              onClick={() => setMobileOpen(false)}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className="max-h-[min(85vh,32rem)] w-full max-w-lg overflow-y-auto rounded-lg border border-va-lightgray bg-white p-4 shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex gap-4">
                  <PersonPhoto person={person} />
                  <div className="min-w-0 flex-1">
                    <h2
                      id={titleId}
                      className={cn(getTitleSizeClass('h3'), 'font-sans font-semibold text-va-black')}
                    >
                      {name}
                    </h2>
                    {role && <p className="text-sm text-va-gray">{role}</p>}
                  </div>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-va-darkgray">{bio}</p>
                {listingHref && (
                  <Link
                    href={listingHref}
                    className="text-va-orange underline text-sm mt-4 inline-block"
                    onClick={() => setMobileOpen(false)}
                  >
                    {listingLabel}
                  </Link>
                )}
                <button
                  type="button"
                  className="mt-4 w-full rounded border border-va-lightgray py-2.5 text-sm font-semibold text-va-black hover:bg-va-lightgray/40"
                  onClick={() => setMobileOpen(false)}
                >
                  Sluiten
                </button>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  )
}