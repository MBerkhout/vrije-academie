'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { commerceClient } from '@/lib/commerce'
import type { EventCard, VathuisAccessItem } from '@/lib/commerce/types'
import { defaultMessages } from '@/lib/i18n/messages'
import { formatDateShort } from '@/lib/locale-format'
import { vathuisProductPath } from '@/lib/routes'
import { Button } from '@/components/ui/Button'

type CollectionRow = VathuisAccessItem & {
  thumbnail?: string | null
}

export function AccountVathuisCollection() {
  const t = defaultMessages.accountPage
  const common = defaultMessages.common
  const [rows, setRows] = useState<CollectionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const items = await commerceClient.listVathuisAccess()
        const enriched = await Promise.all(
          items.map(async (item) => {
            try {
              const event = (await commerceClient.getEvent(item.productHandle)) as EventCard | null
              return {
                ...item,
                thumbnail: event?.thumbnail ?? event?.image_urls?.[0] ?? null,
                productTitle: item.productTitle ?? event?.title ?? item.productHandle,
              }
            } catch {
              return item
            }
          })
        )
        if (!cancelled) {
          setRows(enriched)
          setError(false)
        }
      } catch {
        if (!cancelled) {
          setError(true)
          setRows([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <p className="font-sans text-va-darkgray" aria-busy="true">
        {common.loadingEllipsis}
      </p>
    )
  }

  if (error) {
    return <p className="font-sans text-sm text-va-darkgray">{t.collectionError}</p>
  }

  if (rows.length === 0) {
    return <p className="font-sans text-sm text-va-darkgray max-w-xl">{t.collectionEmpty}</p>
  }

  const active = rows.filter((row) => !row.isExpired)
  const expired = rows.filter((row) => row.isExpired)

  return (
    <div className="space-y-10">
      {active.length > 0 ? (
        <section>
          <h2 className="font-sans text-lg font-semibold text-va-black mb-4">
            {t.collectionActiveHeading}
          </h2>
          <ul className="space-y-4">
            {active.map((row) => (
              <CollectionCard key={row.productId} row={row} t={t} />
            ))}
          </ul>
        </section>
      ) : null}

      {expired.length > 0 ? (
        <section>
          <h2 className="font-sans text-lg font-semibold text-va-darkgray mb-4">
            {t.collectionExpiredHeading}
          </h2>
          <ul className="space-y-4 opacity-80">
            {expired.map((row) => (
              <CollectionCard key={row.productId} row={row} t={t} expired />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}

function CollectionCard({
  row,
  t,
  expired = false,
}: {
  row: CollectionRow
  t: (typeof defaultMessages)['accountPage']
  expired?: boolean
}) {
  const href = `${vathuisProductPath(row.productHandle)}#afleveringen`
  const title = row.productTitle ?? row.productHandle

  return (
    <li className="border border-va-lightgray bg-white p-4 flex flex-col sm:flex-row gap-4">
      {row.thumbnail ? (
        <div className="relative w-full sm:w-32 h-20 shrink-0 bg-va-lightgray overflow-hidden">
          <Image src={row.thumbnail} alt="" fill className="object-cover" sizes="128px" />
        </div>
      ) : null}
      <div className="flex flex-col gap-2 flex-1 min-w-0">
        <h3 className="font-sans font-semibold text-va-black truncate">{title}</h3>
        <p className="font-sans text-sm text-va-darkgray">
          {expired ? t.collectionExpiredOn : t.collectionAccessUntil}{' '}
          {formatDateShort(row.expiresAt)}
        </p>
        <div className="mt-1">
          <Button href={href} variant={expired ? 'outline' : 'primary'} size="sm">
            {expired ? t.collectionRepurchase : t.collectionWatchLessons}
          </Button>
        </div>
      </div>
    </li>
  )
}
