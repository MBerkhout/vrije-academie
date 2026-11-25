'use client'

import Link from 'next/link'
import { useEffect, useId, useState } from 'react'
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
  const [open, setOpen] = useState(false)
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    const unlock = lockBodyScroll()
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      unlock()
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <>
      <article className="rounded border border-va-lightgray p-4">
        <div className="flex gap-4">
          <PersonPhoto person={person} />
          <div className="min-w-0 flex-1">
            <h3 className={cn(getTitleSizeClass('h3'), 'font-sans font-semibold text-va-black')}>
              {name}
            </h3>
            {role && <p className="text-sm text-va-gray">{role}</p>}
            {revealBio ? (
              <button
                type="button"
                aria-haspopup="dialog"
                className="mt-2 inline-flex items-center justify-center rounded-sm bg-va-yellow px-3 py-1.5 text-sm font-semibold text-va-black transition-colors hover:bg-va-yellow-600 active:bg-va-yellow-700"
                onClick={() => setOpen(true)}
              >
                Meer informatie
              </button>
            ) : (
              listingHref && (
                <Link href={listingHref} className="mt-2 inline-flex items-center justify-center rounded-sm bg-va-yellow px-3 py-1.5 text-sm font-semibold text-va-black transition-colors hover:bg-va-yellow-600 active:bg-va-yellow-700">
                  {listingLabel}
                </Link>
              )
            )}
          </div>
        </div>
      </article>
      {revealBio && open
        ? createPortal(
            <div
              className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 md:items-center md:p-4"
              role="presentation"
              onClick={() => setOpen(false)}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className="max-h-[85vh] w-full overflow-y-auto rounded-t-2xl border border-va-lightgray bg-white p-5 shadow-xl md:max-w-lg md:rounded-lg"
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
                <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-va-darkgray">{bio}</p>
                <div className="mt-5 flex flex-col gap-2 md:flex-row-reverse">
                  {listingHref && (
                    <Link
                      href={listingHref}
                      className="rounded-sm bg-va-yellow px-4 py-2.5 text-center text-sm font-semibold text-va-black transition-colors hover:bg-va-yellow-600 active:bg-va-yellow-700"
                      onClick={() => setOpen(false)}
                    >
                      {listingLabel}
                    </Link>
                  )}
                  <button
                    type="button"
                    className="rounded border border-va-lightgray px-4 py-2.5 text-sm font-semibold text-va-black hover:bg-va-lightgray/40"
                    onClick={() => setOpen(false)}
                  >
                    Sluiten
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  )
}
