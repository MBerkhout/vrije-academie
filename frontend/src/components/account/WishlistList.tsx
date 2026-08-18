'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { commerceClient, type EventCard } from '@/lib/commerce'
import { useWishlist } from '@/lib/commerce/useWishlist'
import { defaultMessages } from '@/lib/i18n/messages'
import { plpProductPath } from '@/lib/routes'

export function WishlistList() {
  const { handles, remove, pendingHandle } = useWishlist()
  const [rows, setRows] = useState<{ handle: string; event: EventCard | null }[]>([])
  const [loadingDetails, setLoadingDetails] = useState(false)
  const t = defaultMessages.accountPage
  const common = defaultMessages.common

  useEffect(() => {
    if (handles.length === 0) {
      setRows([])
      return
    }
    let cancelled = false
    setLoadingDetails(true)
    void (async () => {
      const results = await Promise.all(
        handles.map(async (handle) => {
          const event = await commerceClient.getEvent(handle).catch(() => null)
          return { handle, event }
        }),
      )
      if (!cancelled) {
        setRows(results)
        setLoadingDetails(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [handles])

  if (handles.length === 0) {
    return <p className="font-sans text-sm text-va-darkgray">{t.wishlistEmpty}</p>
  }

  if (loadingDetails && rows.length === 0) {
    return (
      <p className="font-sans text-sm text-va-darkgray" aria-busy="true">
        {common.loadingEllipsis}
      </p>
    )
  }

  return (
    <ul className="space-y-3">
      {rows.map(({ handle, event }) => {
        const title = event?.title ?? handle
        const thumb = event?.thumbnail
        const href = plpProductPath(handle)
        const busy = pendingHandle === handle
        return (
          <li
            key={handle}
            className="flex flex-col sm:flex-row sm:items-center gap-3 border border-va-lightgray bg-white p-3 rounded-lg"
          >
            <Link
              href={href}
              className="flex gap-3 flex-1 min-w-0 group"
            >
              <div className="relative w-20 h-14 shrink-0 rounded-md bg-va-lightgray overflow-hidden">
                {thumb ? (
                  <Image
                    src={thumb}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center text-xs text-va-gray/50">
                    VA
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <span className="font-sans text-va-black group-hover:underline line-clamp-2">{title}</span>
                {!event ? (
                  <span className="font-sans text-xs text-va-darkgray block truncate">{handle}</span>
                ) : null}
              </div>
            </Link>
            <div className="flex items-center gap-2 shrink-0 sm:pl-2">
              <Link
                href={href}
                className="font-sans text-sm font-medium text-va-black underline underline-offset-2 hover:text-va-darkgray"
              >
                {t.wishlistView}
              </Link>
              <button
                type="button"
                disabled={busy}
                onClick={() => void remove(handle)}
                className="font-sans text-sm text-va-darkgray hover:text-va-black disabled:opacity-50"
              >
                {busy ? common.loading : t.wishlistRemove}
              </button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
