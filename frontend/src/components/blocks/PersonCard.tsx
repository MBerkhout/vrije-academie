'use client'

import Link from 'next/link'
import { useEffect, useId, useState, type KeyboardEvent, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import { SanityImage } from '@/components/cms/SanityImage'
import { getTitleSizeClass } from '@/lib/cms'
import { lockBodyScroll } from '@/lib/body-scroll-lock'
import { cn } from '@/lib/utils'

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

export function PersonCard({ person, showBio, listingHref, listingLabel }: PersonCardProps) {
  const name = person.name ?? ''
  const role = person.role
  const bio = person.bio?.trim()
  const revealBio = showBio && Boolean(bio)
  const [mobileOpen, setMobileOpen] = useState(false)
  const titleId = useId()

  useEffect(() => {
    if (!mobileOpen) return
    return lockBodyScroll()
  }, [mobileOpen])

  useEffect(() => {
    if (!mobileOpen) return
    const onKey = (e: KeyboardEvent) => {
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
        className={cn(
          'group relative border border-va-lightgray rounded p-4',
          revealBio && 'max-md:cursor-pointer'
        )}
        {...(revealBio
          ? {
              tabIndex: 0,
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
        {revealBio && (
          <div
            className={cn(
              'max-md:hidden overflow-hidden transition-[max-height,opacity,margin] duration-200 ease-out',
              'max-h-0 opacity-0',
              'group-hover:mt-2 group-hover:max-h-48 group-hover:overflow-y-auto group-hover:opacity-100',
              'group-focus-within:mt-2 group-focus-within:max-h-48 group-focus-within:overflow-y-auto group-focus-within:opacity-100'
            )}
            aria-hidden="true"
          >
            <p className="text-sm text-va-darkgray leading-relaxed">{bio}</p>
          </div>
        )}
      </article>
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