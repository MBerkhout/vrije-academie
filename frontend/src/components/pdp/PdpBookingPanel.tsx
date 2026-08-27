'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { addVariantToCart } from '@/lib/commerce/cart'
import { useWishlist } from '@/lib/commerce/useWishlist'
import { useVathuisAccess } from '@/lib/commerce/use-vathuis-access'
import { defaultMessages } from '@/lib/i18n/messages'
import {
  bookableEventVariants,
  eventHasUnlimitedAvailability,
  eventIsFullySoldOut,
  eventPricePrefixLabel,
  minPositiveBookableQuantity,
} from '@/lib/event-status-presentation'
import { formatPriceEur } from '@/lib/locale-format'
import { cn } from '@/lib/utils'
import type { GeneralSettings } from '@/lib/cms/types'
import type { EventCard } from '@/lib/commerce/types'
import { bookingPanelExternalRegistrationUrl } from '@/lib/commerce/external-registration-url'
import { PdpFeaturedInstructor } from '@/components/pdp/PdpFeaturedInstructor'
import { PdpWaitlistModal } from '@/components/pdp/PdpWaitlistModal'

interface PdpBookingPanelProps {
  event: EventCard
  settings: GeneralSettings | null
  customUrgencyMessage?: string | null
  onlineBadge?: { enabled: boolean; text?: string } | null
  onScrollToSessions?: () => void
  variant?: 'light' | 'dark'
}

function computeSignal(event: EventCard, settings: GeneralSettings | null): string | null {
  const pdp = settings?.pdp
  const threshold = pdp?.lowStockThreshold ?? 5
  const deadlineDays = pdp?.deadlineWarningDays ?? 7
  const countdownDays = pdp?.countdownWindowDays ?? 30
  const templates = pdp?.signalTemplates

  if (eventHasUnlimitedAvailability(event)) return null

  if (eventIsFullySoldOut(event)) return templates?.soldOut ?? 'Volgeboekt'

  const qty = minPositiveBookableQuantity(event) ?? event.min_available_quantity
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

function scrollToEpisodes() {
  document.getElementById('afleveringen')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export function PdpBookingPanel({ event, settings, customUrgencyMessage, onlineBadge, onScrollToSessions, variant = 'light' }: PdpBookingPanelProps) {
  const defaultScrollToSessions = () => {
    document.getElementById('sessies')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  const scrollToSessions = onScrollToSessions ?? defaultScrollToSessions
  const router = useRouter()
  const [addingId, setAddingId] = useState<string | null>(null)
  const [waitlistOpen, setWaitlistOpen] = useState(false)
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
  const waitlistCtaLabel = labels?.waitlistCta ?? t.waitlistCta ?? 'Aanmelden voor wachtlijst'

  const priceFrom = event.price_from
  const pricePrefix = eventPricePrefixLabel(event, {
    from: t.bookingFrom,
    for: t.bookingFor,
  })
  const isSoldOut = eventIsFullySoldOut(event)
  const isBundleOnly = event.purchase_mode === 'bundle_only'
  const { access: vathuisAccess } = useVathuisAccess(isBundleOnly ? event.handle : null)
  const hasPurchasedAccess = Boolean(vathuisAccess.hasAccess)

  const signal = computeSignal(event, settings)

  const bundleVariantId = event.bundle_variant_id
  const singleVariant =
    isBundleOnly && bundleVariantId
      ? (event.variants ?? []).find((v) => v.id === bundleVariantId) ?? null
      : (event.variants ?? []).length === 1
        ? event.variants![0]
        : null

  const handleRegister = async () => {
    if (isBundleOnly && hasPurchasedAccess) {
      scrollToEpisodes()
      return
    }
    const panelExternalUrl = bookingPanelExternalRegistrationUrl(event)
    if (panelExternalUrl) {
      window.open(panelExternalUrl, '_blank', 'noopener,noreferrer')
      return
    }
    if (singleVariant && !isSoldOut) {
      setAddingId(singleVariant.id)
      try {
        await addVariantToCart(singleVariant.id, { event, variant: singleVariant })
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

  const watchEpisodesLabel = labels?.watchEpisodes ?? t.bookingWatchEpisodes ?? 'Afleveringen bekijken'
  const primaryBundleLabel = hasPurchasedAccess ? watchEpisodesLabel : bundleCtaLabel

  const panelClass =
    variant === 'dark'
      ? 'rounded-lg border border-va-darkgray-700 bg-va-darkgray-950 p-5 flex flex-col gap-4 lg:sticky lg:top-24 text-white'
      : 'rounded-lg border border-va-lightgray bg-white p-5 flex flex-col gap-4 lg:sticky lg:top-24'

  const mutedText = variant === 'dark' ? 'text-va-gray-300' : 'text-va-gray'
  const primaryText = variant === 'dark' ? 'text-white' : 'text-va-black'
  const secondaryBtnClass =
    variant === 'dark'
      ? 'w-full border border-va-darkgray-600 text-white font-medium py-3 px-4 rounded-lg hover:bg-va-darkgray-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed'
      : 'w-full border border-va-lightgray text-va-black font-medium py-3 px-4 rounded-lg hover:bg-va-lightgray transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed'

  const externalRegistrationUrl = bookingPanelExternalRegistrationUrl(event)
  const usesExternalRegistration = Boolean(externalRegistrationUrl)
  const hasBookableSession = isBundleOnly || bookableEventVariants(event).length > 0
  const showPrimaryCta = usesExternalRegistration || hasBookableSession
  const primaryCtaClassName =
    'w-full bg-va-yellow text-va-black font-bold py-3 px-4 rounded-lg hover:bg-va-yellow/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-center'

  return (
    <div id="booking-panel" className={panelClass}>
      {/* Price */}
      {priceFrom ? (
        <div>
          {pricePrefix ? <span className={cn('text-xs', mutedText)}>{pricePrefix}</span> : null}
          <div className={cn('text-2xl font-bold', primaryText)}>{formatPriceEur(priceFrom)}</div>
          {isBundleOnly && event.vathuis?.episode_count_label ? (
            <p className={cn('text-sm mt-1', mutedText)}>{event.vathuis.episode_count_label}</p>
          ) : null}
          {isBundleOnly && event.vathuis?.play_time ? (
            <p className={cn('text-sm', mutedText)}>{event.vathuis.play_time}</p>
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
      {showPrimaryCta ? (
        usesExternalRegistration && !isSoldOut ? (
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
            onClick={() => {
              if (isSoldOut && !(isBundleOnly && hasPurchasedAccess)) {
                setWaitlistOpen(true)
                return
              }
              void handleRegister()
            }}
            disabled={addingId !== null}
            className={primaryCtaClassName}
          >
            {isSoldOut && !(isBundleOnly && hasPurchasedAccess)
              ? waitlistCtaLabel
              : addingId
                ? 'Bezig…'
                : isBundleOnly
                  ? primaryBundleLabel
                  : primaryCtaLabel}
          </button>
        )
      ) : null}

      <PdpWaitlistModal open={waitlistOpen} onClose={() => setWaitlistOpen(false)} event={event} />

      <button
        type="button"
        onClick={handleWishlist}
        disabled={wishlistBusy}
        aria-pressed={saved}
        aria-label={wishlistAria}
        className={secondaryBtnClass}
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

      {event.highlighted_instructor ? (
        <PdpFeaturedInstructor instructor={event.highlighted_instructor} variant={variant} />
      ) : null}
    </div>
  )
}
