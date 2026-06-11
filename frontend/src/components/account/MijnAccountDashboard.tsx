'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { commerceClient, type EventCard } from '@/lib/commerce'
import type { Order } from '@/lib/commerce/types'
import { getDefaultCheckoutAddress } from '@/lib/commerce/checkout-profile'
import { useCustomer } from '@/lib/commerce/CustomerProvider'
import { useWishlist } from '@/lib/commerce/useWishlist'
import { Button } from '@/components/ui/Button'
import { defaultMessages, interpolate } from '@/lib/i18n/messages'
import { formatDateShort, formatPriceEur } from '@/lib/locale-format'
import { plpProductPath } from '@/lib/routes'
import { cn } from '@/lib/utils'

function panelClassName(extra?: string) {
  return cn('bg-va-lightgray p-6 lg:p-8', extra)
}

export function MijnAccountDashboard() {
  const { customer } = useCustomer()
  const t = defaultMessages.accountPage

  if (!customer) return null

  const fn = customer.first_name?.trim() ?? ''
  const ln = customer.last_name?.trim() ?? ''
  const welcomeName = [fn, ln].filter(Boolean).join(' ').trim() || customer.email

  const addr = getDefaultCheckoutAddress(customer)
  const countryNames: Record<string, string> = {
    nl: 'Nederland',
    be: 'België',
    de: 'Duitsland',
    fr: 'Frankrijk',
  }
  const cc = (addr?.country_code ?? 'nl').toLowerCase()
  const countryLine = addr?.country_code ? countryNames[cc] ?? cc.toUpperCase() : ''

  return (
    <div className="space-y-6">
      <section className={panelClassName()} aria-labelledby="dashboard-welcome">
        <p
          id="dashboard-welcome"
          className="font-sans text-2xl font-bold text-va-black md:text-3xl"
        >
          {interpolate(t.dashboardWelcome, { name: welcomeName })}
        </p>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-stretch">
        <section
          className={panelClassName('flex flex-col')}
          aria-labelledby="dashboard-gegevens-block-title"
        >
          <h2
            id="dashboard-gegevens-block-title"
            className="font-sans text-lg font-bold text-va-black mb-4"
          >
            {t.dashboardGegevensBlockTitle}
          </h2>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="font-sans text-xs font-medium uppercase tracking-wide text-va-gray">
                {t.firstNameLabel}
              </dt>
              <dd className="mt-1 font-sans text-sm text-va-black">{fn || '—'}</dd>
            </div>
            <div>
              <dt className="font-sans text-xs font-medium uppercase tracking-wide text-va-gray">
                {t.lastNameLabel}
              </dt>
              <dd className="mt-1 font-sans text-sm text-va-black">{ln || '—'}</dd>
            </div>
          </dl>
          <dl className="mt-4 space-y-4">
            <div>
              <dt className="font-sans text-xs font-medium uppercase tracking-wide text-va-gray">
                {t.emailLabel}
              </dt>
              <dd className="mt-1 font-sans text-sm text-va-black break-all">{customer.email}</dd>
            </div>
            <div>
              <dt className="font-sans text-xs font-medium uppercase tracking-wide text-va-gray">
                {t.phoneLabel}
              </dt>
              <dd className="mt-1 font-sans text-sm text-va-black">
                {(customer.phone?.trim() ?? '') !== '' ? customer.phone : t.unknownValue}
              </dd>
            </div>
            {addr?.address_1?.trim() ? (
              <div>
                <dt className="font-sans text-xs font-medium uppercase tracking-wide text-va-gray">
                  {t.addressSectionTitle}
                </dt>
                <dd className="mt-1 font-sans text-sm text-va-darkgray whitespace-pre-line">
                  {addr.address_1.trim()}
                  {'\n'}
                  {[addr.postal_code, addr.city].filter(Boolean).join(' ').trim()}
                  {countryLine ? `\n${countryLine}` : ''}
                </dd>
              </div>
            ) : (
              <div>
                <dt className="font-sans text-xs font-medium uppercase tracking-wide text-va-gray">
                  {t.addressSectionTitle}
                </dt>
                <dd className="mt-1 font-sans text-sm text-va-darkgray">—</dd>
              </div>
            )}
          </dl>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button href="/mijn-account/gegevens" variant="outline" size="md">
              {t.dashboardEditDetails}
            </Button>
            <Button href="/mijn-account/gegevens?wachtwoord=1" variant="outline" size="md">
              {t.passwordChange}
            </Button>
          </div>
        </section>

        <div className="flex flex-col gap-4 lg:min-h-0">
          <RecentSavedPanel />
          <RecentPurchasePanel />
        </div>
      </div>

      <section
        className={panelClassName()}
        aria-labelledby="account-shortcuts-heading"
      >
        <h2 id="account-shortcuts-heading" className="font-sans text-lg font-bold text-va-black mb-4">
          {t.shortcutsTitle}
        </h2>
        <ul className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <li>
            <Button href="/mijn-account/bewaard" variant="outline" size="md">
              {t.navSaved}
            </Button>
          </li>
          <li>
            <Button href="/mijn-account/aankopen" variant="outline" size="md">
              {t.navPurchases}
            </Button>
          </li>
          <li>
            <Button href="/mijn-account/collectie" variant="outline" size="md">
              {t.navCollection}
            </Button>
          </li>
        </ul>
      </section>
    </div>
  )
}

function RecentSavedPanel() {
  const { handles } = useWishlist()
  const t = defaultMessages.accountPage
  const common = defaultMessages.common
  const [event, setEvent] = useState<EventCard | null>(null)
  const [loading, setLoading] = useState(true)
  const latestHandle = handles[0]

  useEffect(() => {
    if (!latestHandle) {
      setEvent(null)
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    void (async () => {
      const ev = await commerceClient.getEvent(latestHandle)
      if (!cancelled) {
        setEvent(ev)
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [latestHandle])

  return (
    <section className={panelClassName('flex flex-1 flex-col')}>
      <h2 className="font-sans text-base font-bold text-va-black mb-3">{t.recentSavedHeading}</h2>
      {loading ? (
        <p className="font-sans text-sm text-va-darkgray" aria-busy="true">
          {common.loadingEllipsis}
        </p>
      ) : !latestHandle ? (
        <div className="space-y-2">
          <p className="font-sans text-sm text-va-darkgray">{t.wishlistEmpty}</p>
          <Link
            href="/mijn-account/bewaard"
            className="inline-flex font-sans text-sm font-medium text-va-black underline underline-offset-2"
          >
            {t.recentViewSaved}
          </Link>
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-3">
          <Link
            href={plpProductPath(event?.handle ?? latestHandle)}
            className="group flex gap-3 rounded-none border border-va-lightgray-300 bg-white p-3"
          >
            <div className="relative h-14 w-20 shrink-0 bg-va-lightgray">
              {event?.thumbnail ? (
                <Image
                  src={event.thumbnail}
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
            <div className="min-w-0 flex-1">
              <span className="font-sans text-sm text-va-black group-hover:underline line-clamp-2">
                {event?.title ?? latestHandle}
              </span>
            </div>
          </Link>
          <Link
            href="/mijn-account/bewaard"
            className="font-sans text-sm font-medium text-va-black underline underline-offset-2"
          >
            {t.recentViewSaved}
          </Link>
        </div>
      )}
    </section>
  )
}

function RecentPurchasePanel() {
  const t = defaultMessages.accountPage
  const common = defaultMessages.common
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const { orders } = await commerceClient.listCustomerOrders({ limit: 20 })
        if (cancelled) return
        const sorted = [...orders].sort((a, b) => {
          const ta = new Date(a.created_at ?? 0).getTime()
          const tb = new Date(b.created_at ?? 0).getTime()
          return tb - ta
        })
        setOrder(sorted[0] ?? null)
      } catch {
        if (!cancelled) setOrder(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section className={panelClassName('flex flex-1 flex-col')}>
      <h2 className="font-sans text-base font-bold text-va-black mb-3">{t.recentPurchasedHeading}</h2>
      {loading ? (
        <p className="font-sans text-sm text-va-darkgray" aria-busy="true">
          {common.loadingEllipsis}
        </p>
      ) : !order ? (
        <div className="space-y-2">
          <p className="font-sans text-sm text-va-darkgray">{t.recentPurchasedEmpty}</p>
          <Link
            href="/mijn-account/aankopen"
            className="inline-flex font-sans text-sm font-medium text-va-black underline underline-offset-2"
          >
            {t.recentViewAllPurchases}
          </Link>
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-3">
          <div className="rounded-none border border-va-lightgray-300 bg-white p-4 font-sans text-sm">
            <p className="font-medium text-va-black">
              {t.ordersNumber}{' '}
              {order.display_id != null ? `#${order.display_id}` : order.id.slice(-8)}
            </p>
            {order.created_at ? (
              <p className="mt-1 text-va-darkgray">
                {t.ordersDate}: {formatDateShort(order.created_at)}
              </p>
            ) : null}
            <p className="mt-2 text-va-black">
              {t.ordersTotal}: {formatPriceEur(order.total, 'standard')}
            </p>
          </div>
          <Link
            href="/mijn-account/aankopen"
            className="font-sans text-sm font-medium text-va-black underline underline-offset-2"
          >
            {t.recentViewAllPurchases}
          </Link>
        </div>
      )}
    </section>
  )
}
