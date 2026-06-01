/**
 * Schema.org JSON-LD helpers: one place for @context, absolute URLs, and safe serialization.
 * Use with `<script type="application/ld+json">` or the `<JsonLd />` component.
 */

import type { EventCard } from '@/lib/commerce/types'
import { plpProductPath } from '@/lib/routes'

export const SCHEMA_ORG = 'https://schema.org' as const

const DEFAULT_SITE_ORIGIN = 'https://vrijeacademie.nl'
export const ORG_NAME = 'Vrije Academie' as const

/** Canonical site origin (no trailing slash). */
export function getSiteOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, '')
  return raw || DEFAULT_SITE_ORIGIN
}

/** Turn a path or full URL into an absolute URL for JSON-LD. */
export function absolutizeUrl(pathOrUrl: string): string {
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
    return pathOrUrl
  }
  const base = getSiteOrigin()
  const path = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`
  return `${base}${path}`
}

/**
 * Serialize for `dangerouslySetInnerHTML` so `</script>` in strings cannot break out of the tag.
 */
export function stringifyJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}

export function schemaInStockUrl(inStock: boolean): string {
  return inStock ? `${SCHEMA_ORG}/InStock` : `${SCHEMA_ORG}/SoldOut`
}

/** EUR offer price as a decimal string (Schema.org expects string or number). */
export function schemaPriceFromCents(cents: number): string {
  return (cents / 100).toFixed(2)
}

export function buildOrganizationEntity(): {
  '@type': 'Organization'
  name: string
  url: string
} {
  const url = getSiteOrigin()
  return {
    '@type': 'Organization',
    name: ORG_NAME,
    url,
  }
}

export interface BreadcrumbJsonLdItem {
  name: string
  /** Path (e.g. product listing base from `PLP_BASE_PATH`) or full URL */
  item: string
}

export function buildBreadcrumbListJsonLd(items: BreadcrumbJsonLdItem[]): Record<string, unknown> {
  return {
    '@context': SCHEMA_ORG,
    '@type': 'BreadcrumbList',
    itemListElement: items.map((entry, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: entry.name,
      item: absolutizeUrl(entry.item),
    })),
  }
}

/** Crumbs as used by `<Breadcrumbs />` — only entries with `href` are included. */
export function buildBreadcrumbListFromCrumbs(
  crumbs: { label: string; href?: string }[]
): Record<string, unknown> {
  const items = crumbs
    .filter((c): c is { label: string; href: string } => Boolean(c.href))
    .map((c) => ({ name: c.label, item: c.href }))
  return buildBreadcrumbListJsonLd(items)
}

export interface ItemListJsonLdEntry {
  path: string
  name: string
}

export function buildItemListJsonLd(options: {
  name: string
  numberOfItems: number
  items: ItemListJsonLdEntry[]
}): Record<string, unknown> {
  return {
    '@context': SCHEMA_ORG,
    '@type': 'ItemList',
    name: options.name,
    numberOfItems: options.numberOfItems,
    itemListElement: options.items.map((row, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: absolutizeUrl(row.path),
      name: row.name,
    })),
  }
}

type PdpEventForJsonLd = Pick<
  EventCard,
  | 'title'
  | 'description'
  | 'image_urls'
  | 'thumbnail'
  | 'record_type'
  | 'cities'
  | 'earliest_start_at'
  | 'price_from'
  | 'min_available_quantity'
>

/**
 * Product detail Course or Event structured data (same rules as previous inline object).
 */
export function buildPdpEventOrCourseJsonLd(
  handle: string,
  event: PdpEventForJsonLd
): Record<string, unknown> {
  const isCourse = event.record_type === 'collegereeks' || !event.record_type
  const origin = getSiteOrigin()
  const path = plpProductPath(handle)

  const base: Record<string, unknown> = {
    '@context': SCHEMA_ORG,
    '@type': isCourse ? 'Course' : 'Event',
    name: event.title,
    description: event.description ?? undefined,
    image: event.image_urls?.[0] ?? event.thumbnail ?? undefined,
    url: absolutizeUrl(path),
  }

  if (isCourse) {
    base.provider = buildOrganizationEntity()
  } else {
    base.organizer = buildOrganizationEntity()
    base.startDate = event.earliest_start_at ?? undefined
    base.location = event.cities?.[0]
      ? { '@type': 'Place', name: event.cities[0] }
      : { '@type': 'VirtualLocation', url: origin }
    if (event.price_from != null) {
      base.offers = {
        '@type': 'Offer',
        price: schemaPriceFromCents(event.price_from),
        priceCurrency: 'EUR',
        availability: schemaInStockUrl(event.min_available_quantity !== 0),
      }
    }
  }

  return base
}
