'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { addVariantToCart } from '@/lib/commerce/cart'
import { useWishlist } from '@/lib/commerce/useWishlist'
import { defaultMessages, interpolate } from '@/lib/i18n/messages'
import { absolutizeUrl } from '@/lib/json-ld'
import { plpProductPath } from '@/lib/routes'
import { formatPriceEur } from '@/lib/locale-format'
import type { GeneralSettings } from '@/lib/cms/types'
import type { EventCard } from '@/lib/commerce/types'

interface PdpBookingPanelProps {
  event: EventCard
  settings: GeneralSettings | null
  customUrgencyMessage?: string | null
  onlineBadge?: { enabled: boolean; text?: string } | null
  onScrollToSessions?: () => void
}

function computeSignal(event: EventCard, settings: GeneralSettings | null): string | null {
  const pdp = settings?.pdp
  const threshold = pdp?.lowStockThreshold ?? 5
  const deadlineDays = pdp?.deadlineWarningDays ?? 7
  const countdownDays = pdp?.countdownWindowDays ?? 30
  const templates = pdp?.signalTemplates

  const qty = event.min_available_quantity
  if (qty === 0) return templates?.soldOut ?? 'Volgeboekt'
  if (qty !== null && qty !== undefined && qty <= threshold) {
    return (templates?.lowStock ?? 'Nog maar {n} plaatsen beschikbaar').replace('{n}', String(qty))
  }

  // Check if any session deadline is within deadlineWarningDays
  const variants = event.variants ?? []
  const now = Date.now()
  const soonDeadline = variants.some((v) => {
    const dl = v.event_item?.registration_deadline_at
    if (!dl) return false
    const diff = (new Date(dl).getTime() - now) / (1000 * 60 * 60 * 24)
    return diff >= 0 && diff <= deadlineDays
  })
  if (soonDeadline) return templates?.deadlineSoon ?? 'Inschrijving sluit bijna'

  // Check if earliest start is within countdownDays
  if (event.earliest_start_at) {
    const diffDays = Math.ceil((new Date(event.earliest_start_at).getTime() - now) / (1000 * 60 * 60 * 24))
    if (diffDays >= 0 && diffDays <= countdownDays) {
      return (templates?.startSoon ?? 'Cursus start over {d} dagen').replace('{d}', String(diffDays))
    }
  }

  return null
}

export function PdpBookingPanel({ event, settings, customUrgencyMessage, onlineBadge, onScrollToSessions }: PdpBookingPanelProps) {
  const defaultScrollToSessions = () => {
    document.getElementById('sessies')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  const scrollToSessions = onScrollToSessions ?? defaultScrollToSessions
  const router = useRouter()
  const [addingId, setAddingId] = useState<string | null>(null)
  const { isInWishlist, pendingHandle, toggle, loading: wishlistLoading } = useWishlist()
  const labels = settings?.pdp?.labels
  const t = defaultMessages.pdp

  const primaryCtaLabel = labels?.primaryCta ?? 'Direct inschrijven'
  const bundleCtaLabel = labels?.bundleCta ?? 'Koop alle lessen'
  const saved = isInWishlist(event.handle)
  const wishlistLabel = saved
    ? (labels?.wishlistSaved ?? t.bookingWishlistSaved)
    : (labels?.wishlist ?? t.bookingWishlist)
  const freeTrialLabel = labels?.freeTrialBadge ?? 'Gratis proefles'
  const soldOutLabel = labels?.soldOutLabel ?? 'Volgeboekt'

  const priceFrom = event.price_from
  const isSoldOut = event.min_available_quantity === 0
  const isBundleOnly = event.purchase_mode === 'bundle_only'

  const signal = computeSignal(event, settings)

  const bundleVariantId = event.bundle_variant_id
  const singleVariant =
    isBundleOnly && bundleVariantId
      ? (event.variants ?? []).find((v) => v.id === bundleVariantId) ?? null
      : (event.variants ?? []).length === 1
        ? event.variants![0]
        : null

  const handleRegister = async () => {
    if (event.external_registration_url?.trim()) {
      window.open(event.external_registration_url.trim(), '_blank', 'noopener,noreferrer')
      return
    }
    if (singleVariant && !isSoldOut) {
      setAddingId(singleVariant.id)
      try {
        await addVariantToCart(singleVariant.id)
        router.push('/winkelwagen')
      } finally {
        setAddingId(null)
      }
    } else if (!isBundleOnly) {
      scrollToSessions()
    }
  }

  const handleWishlist = () => {
    void toggle(event.handle)
  }

  const wishlistBusy = wishlistLoading || pendingHandle === event.handle
  const wishlistAria = saved ? t.wishlistToggleRemoveAria : t.wishlistToggleAddAria

  const productUrl = absolutizeUrl(plpProductPath(event.handle))
  const inviteSubject = interpolate(t.bookingInviteEmailSubject, { title: event.title })
  const inviteBody = interpolate(t.bookingInviteEmailBody, {
    title: event.title,
    url: productUrl,
  })
  const inviteHref = `mailto:?subject=${encodeURIComponent(inviteSubject)}&body=${encodeURIComponent(inviteBody)}`
  const shareMailSubject = interpolate(t.bookingShareEmailSubject, { title: event.title })
  const shareMailBody = interpolate(t.bookingShareEmailBody, { url: productUrl })
  const shareMailHref = `mailto:?subject=${encodeURIComponent(shareMailSubject)}&body=${encodeURIComponent(shareMailBody)}`
  const facebookShareHref = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(productUrl)}`
  const linkedInShareHref = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(productUrl)}`

  const inviteLabel = labels?.inviteSomeone ?? t.bookingInviteSomeone

  const iconBtnClass =
    'inline-flex h-9 w-9 items-center justify-center border border-va-lightgray text-va-black transition-colors hover:bg-va-lightgray'

  const externalRegistrationUrl = event.external_registration_url?.trim() || null
  const usesExternalRegistration = Boolean(externalRegistrationUrl)
  const primaryCtaClassName =
    'w-full bg-va-yellow text-va-black font-bold py-3 px-4 rounded-none hover:bg-va-yellow/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-center'

  return (
    <div id="booking-panel" className="rounded-none border border-va-lightgray bg-white p-5 flex flex-col gap-4 lg:sticky lg:top-24">
      {/* Price */}
      {priceFrom ? (
        <div>
          {!isBundleOnly ? <span className="text-xs text-va-gray">Vanaf</span> : null}
          <div className="text-2xl font-bold text-va-black">{formatPriceEur(priceFrom, 'whole')}</div>
          {isBundleOnly && event.vathuis?.episode_count_label ? (
            <p className="text-sm text-va-gray mt-1">{event.vathuis.episode_count_label}</p>
          ) : null}
          {isBundleOnly && event.vathuis?.play_time ? (
            <p className="text-sm text-va-gray">{event.vathuis.play_time}</p>
          ) : null}
        </div>
      ) : null}

      {/* Free trial badge */}
      {event.has_free_trial && (
        <Badge variant="freeTrial" size="md">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {freeTrialLabel}
        </Badge>
      )}

      {/* Online badge */}
      {onlineBadge?.enabled && (
        <Badge variant="online" size="md" className="w-fit">
          {onlineBadge.text ?? settings?.pdp?.onlineBadgeDefaultText ?? 'Nu ook online te volgen!'}
        </Badge>
      )}

      {/* Urgency signal */}
      {(customUrgencyMessage ?? signal) && (
        <p className="text-sm text-va-orange font-medium">
          {customUrgencyMessage ?? signal}
        </p>
      )}

      {/* CTA buttons */}
      {usesExternalRegistration && !isSoldOut ? (
        <a
          href={externalRegistrationUrl!}
          target="_blank"
          rel="noopener noreferrer"
          className={primaryCtaClassName}
        >
          {primaryCtaLabel}
        </a>
      ) : (
        <button
          onClick={() => void handleRegister()}
          disabled={isSoldOut || addingId !== null}
          className={primaryCtaClassName}
        >
          {isSoldOut ? soldOutLabel : addingId ? 'Bezig…' : isBundleOnly ? bundleCtaLabel : primaryCtaLabel}
        </button>
      )}

      <button
        type="button"
        onClick={handleWishlist}
        disabled={wishlistBusy}
        aria-pressed={saved}
        aria-label={wishlistAria}
        className="w-full border border-va-lightgray text-va-black font-medium py-3 px-4 rounded-none hover:bg-va-lightgray transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg
          className="w-4 h-4 shrink-0"
          fill={saved ? 'currentColor' : 'none'}
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
          />
        </svg>
        {wishlistBusy ? t.wishlistPending : wishlistLabel}
      </button>

      <a
        href={inviteHref}
        className="w-full border border-va-lightgray text-va-black font-medium py-3 px-4 rounded-none hover:bg-va-lightgray transition-colors flex items-center justify-center gap-2 text-center"
      >
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
          />
        </svg>
        {inviteLabel}
      </a>

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-va-black shrink-0">{t.bookingShare}</span>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={facebookShareHref}
            target="_blank"
            rel="noopener noreferrer"
            className={iconBtnClass}
            aria-label={t.shareFacebookAria}
          >
            <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24" aria-hidden>
              <path d="M22 12a10 10 0 1 0-11.5 9.9v-7H7.9V12h2.6V9.8c0-2.6 1.6-4 3.9-4 1.1 0 2.2.2 2.2.2v2.4h-1.2c-1.2 0-1.6.7-1.6 1.5V12h2.7l-.4 2.9h-2.3v7A10 10 0 0 0 22 12" />
            </svg>
          </a>
          <a href={shareMailHref} className={iconBtnClass} aria-label={t.shareEmailAria}>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </a>
          <a
            href={linkedInShareHref}
            target="_blank"
            rel="noopener noreferrer"
            className={iconBtnClass}
            aria-label={t.shareLinkedInAria}
          >
            <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24" aria-hidden>
              <path d="M4.98 3.5C4.98 4.88 3.86 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.5 8h4V24h-4V8zm7.5 0h3.8v2.2h.1c.5-1 1.8-2.2 3.8-2.2 4 0 4.8 2.6 4.8 6v8h-4v-7.1c0-1.7 0-3.7-2.3-3.7-2.3 0-2.6 1.8-2.6 3.6V24h-4V8z" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  )
}
