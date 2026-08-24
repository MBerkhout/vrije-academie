import type { EventCard, EventVariant } from './types'

export function trimExternalRegistrationUrl(url?: string | null): string | null {
  const trimmed = url?.trim()
  return trimmed || null
}

/** Child URL when set on the variant; otherwise the product-group URL from the API. */
export function sessionExternalRegistrationUrl(
  variant: Pick<EventVariant, 'external_registration_url'> | null | undefined,
  productUrl?: string | null,
): string | null {
  if (variant && variant.external_registration_url !== undefined) {
    return trimExternalRegistrationUrl(variant.external_registration_url)
  }
  return trimExternalRegistrationUrl(productUrl)
}

/**
 * Booking-panel CTA: a single shared URL, or null when sessions mix cart and
 * partner links (or have different partner URLs) so the user picks a session.
 */
export function bookingPanelExternalRegistrationUrl(
  event: Pick<EventCard, 'external_registration_url' | 'variants'>,
): string | null {
  const productUrl = trimExternalRegistrationUrl(event.external_registration_url)
  const variants = event.variants ?? []
  if (variants.length === 0) return productUrl

  const urls = variants.map((variant) => sessionExternalRegistrationUrl(variant, productUrl))
  const unique = [...new Set(urls.filter((url): url is string => Boolean(url)))]
  const hasCartSession = urls.some((url) => !url)
  if (hasCartSession && unique.length > 0) return null
  if (unique.length === 1) return unique[0]
  if (unique.length > 1) return null
  return productUrl
}
