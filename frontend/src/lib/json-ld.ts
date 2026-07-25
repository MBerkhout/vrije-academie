/**
 * Schema.org JSON-LD helpers: one place for @context, absolute URLs, and safe serialization.
 * Use with `<script type="application/ld+json">` or the `<JsonLd />` component.
 */

import type { EventCard, EventVariant } from '@/lib/commerce/types'
import type { ProductSeoSource } from '@/lib/cms/seo-metadata'
import {
  resolveSeoDescription,
  resolveSeoImageUrl,
  resolveSeoTitle,
} from '@/lib/cms/seo-metadata'
import type { GeneralSettings } from '@/lib/cms/types'
import { eventIsFullySoldOut } from '@/lib/event-status-presentation'
import { plpProductPath } from '@/lib/routes'

export const SCHEMA_ORG = 'https://schema.org' as const

const DEFAULT_SITE_ORIGIN = 'https://vrijeacademie.nl'
export const ORG_NAME = 'Vrije Academie' as const
export const ORGANIZATION_ID_FRAGMENT = '#organization' as const

/** Canonical site origin (no trailing slash). */
export function getSiteOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, '')
  return raw || DEFAULT_SITE_ORIGIN
}

/** Stable `@id` for the sitewide Organization entity. */
export function getOrganizationId(): string {
  return `${getSiteOrigin()}${ORGANIZATION_ID_FRAGMENT}`
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

/** Lightweight Organization reference for nested provider/organizer fields. */
export function buildOrganizationReference(): { '@id': string } {
  return { '@id': getOrganizationId() }
}

/** @deprecated Prefer `buildOrganizationReference()` in nested schemas; sitewide uses `buildOrganizationJsonLd()`. */
export function buildOrganizationEntity(): {
  '@type': 'Organization'
  name: string
  url: string
} {
  return {
    '@type': 'Organization',
    name: ORG_NAME,
    url: getSiteOrigin(),
  }
}

function extractPhoneNumber(phone?: string | null): string | undefined {
  if (!phone?.trim()) return undefined
  const match = phone.match(/[\d][\d\s\-().]{6,}/)
  return match?.[0]?.replace(/\s+/g, ' ').trim()
}

function resolveOrganizationLogo(settings?: GeneralSettings | null): string | undefined {
  return (
    settings?.organization?.logo?.asset?.url ??
    settings?.header?.logo?.asset?.url ??
    undefined
  )
}

function resolveOrganizationSameAs(settings?: GeneralSettings | null): string[] | undefined {
  const explicit = settings?.organization?.sameAs
    ?.map((entry) => entry.url?.trim())
    .filter((url): url is string => Boolean(url))
  if (explicit?.length) return explicit

  const social = settings?.footer?.socialLinks
    ?.map((link) => link.url?.trim())
    .filter((url): url is string => Boolean(url))
  return social?.length ? social : undefined
}

/** Full sitewide Organization JSON-LD with optional Sanity enrichment. */
export function buildOrganizationJsonLd(
  settings?: GeneralSettings | null,
): Record<string, unknown> {
  const contact = settings?.footer?.contact
  const org = settings?.organization
  const logo = resolveOrganizationLogo(settings)
  const sameAs = resolveOrganizationSameAs(settings)
  const telephone =
    org?.telephone?.trim() || extractPhoneNumber(contact?.phone) || undefined
  const email = org?.email?.trim() || contact?.email?.trim() || undefined

  return {
    '@context': SCHEMA_ORG,
    '@type': 'Organization',
    '@id': getOrganizationId(),
    name: org?.legalName?.trim() || ORG_NAME,
    url: getSiteOrigin(),
    ...(logo && { logo }),
    ...(contact?.address?.trim() && { address: contact.address.trim() }),
    ...(telephone && { telephone }),
    ...(email && { email }),
    ...(sameAs && { sameAs }),
  }
}

export function buildWebSiteJsonLd(): Record<string, unknown> {
  const origin = getSiteOrigin()
  return {
    '@context': SCHEMA_ORG,
    '@type': 'WebSite',
    name: ORG_NAME,
    url: origin,
    publisher: buildOrganizationReference(),
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${origin}/zoeken?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }
}

export function buildWebPageJsonLd(options: {
  name: string
  description?: string
  url: string
  image?: string
}): Record<string, unknown> {
  return {
    '@context': SCHEMA_ORG,
    '@type': 'WebPage',
    name: options.name,
    description: options.description,
    url: absolutizeUrl(options.url),
    ...(options.image && { image: options.image }),
    isPartOf: {
      '@type': 'WebSite',
      name: ORG_NAME,
      url: getSiteOrigin(),
    },
    publisher: buildOrganizationReference(),
  }
}

export function buildCollectionPageJsonLd(options: {
  name: string
  description?: string
  url: string
  image?: string
}): Record<string, unknown> {
  return {
    '@context': SCHEMA_ORG,
    '@type': 'CollectionPage',
    name: options.name,
    description: options.description,
    url: absolutizeUrl(options.url),
    ...(options.image && { image: options.image }),
    isPartOf: {
      '@type': 'WebSite',
      name: ORG_NAME,
      url: getSiteOrigin(),
    },
    publisher: buildOrganizationReference(),
  }
}

export interface FaqJsonLdItem {
  question: string
  answer: string
}

export function buildFaqPageJsonLd(items: FaqJsonLdItem[]): Record<string, unknown> | null {
  const entities = items
    .filter((item) => item.question.trim() && item.answer.trim())
    .map((item) => ({
      '@type': 'Question',
      name: item.question.trim(),
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer.trim(),
      },
    }))

  if (!entities.length) return null

  return {
    '@context': SCHEMA_ORG,
    '@type': 'FAQPage',
    mainEntity: entities,
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
  crumbs: { label: string; href?: string }[],
): Record<string, unknown> {
  const items = crumbs
    .filter((c): c is { label: string; href: string } => Boolean(c.href))
    .map((c) => ({ name: c.label, item: c.href }))
  return buildBreadcrumbListJsonLd(items)
}

export interface ItemListJsonLdEntry {
  path: string
  name: string
  image?: string
  priceFromCents?: number | null
  inStock?: boolean
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
    itemListElement: options.items.map((row, i) => {
      const item: Record<string, unknown> = {
        '@type': 'ListItem',
        position: i + 1,
        url: absolutizeUrl(row.path),
        name: row.name,
      }
      if (row.image) item.image = row.image
      if (row.priceFromCents != null) {
        item.offers = {
          '@type': 'Offer',
          price: schemaPriceFromCents(row.priceFromCents),
          priceCurrency: 'EUR',
          availability: schemaInStockUrl(row.inStock !== false),
        }
      }
      return item
    }),
  }
}

export function resolveProductSchemaFields(
  source: ProductSeoSource | null | undefined,
  event: {
    title: string
    description?: string | null
    image_urls?: string[]
    thumbnail?: string | null
  },
): { name: string; description?: string; image?: string } {
  const name =
    resolveSeoTitle(source?.seo, source?.seoTitle?.trim() || event.title) ?? event.title
  const description =
    resolveSeoDescription(
      source?.seo,
      source?.seoDescription?.trim() || event.description?.slice(0, 160) || undefined,
    ) ?? undefined
  const image =
    resolveSeoImageUrl(source?.seo) ?? event.image_urls?.[0] ?? event.thumbnail ?? undefined
  return { name, description, image }
}

function buildPersonEntity(person: {
  name: string
  photo_url?: string | null
}): Record<string, unknown> {
  return {
    '@type': 'Person',
    name: person.name,
    ...(person.photo_url && { image: person.photo_url }),
  }
}

function buildOfferFromPrice(
  priceCents: number,
  inStock: boolean,
): Record<string, unknown> {
  return {
    '@type': 'Offer',
    price: schemaPriceFromCents(priceCents),
    priceCurrency: 'EUR',
    availability: schemaInStockUrl(inStock),
  }
}

function resolveEventAttendanceMode(deliveryTypes?: string[] | null): string | undefined {
  if (!deliveryTypes?.length) return undefined
  const hasOnline = deliveryTypes.some(
    (type) => type === 'online' || type === 'pre_recorded',
  )
  const hasOffline = deliveryTypes.some((type) => type === 'offline')
  if (hasOnline && hasOffline) return `${SCHEMA_ORG}/MixedEventAttendanceMode`
  if (hasOnline) return `${SCHEMA_ORG}/OnlineEventAttendanceMode`
  if (hasOffline) return `${SCHEMA_ORG}/OfflineEventAttendanceMode`
  return undefined
}

function buildPlaceFromVariant(variant: EventVariant): Record<string, unknown> | undefined {
  const item = variant.event_item
  if (!item) return undefined

  if (item.delivery_type === 'online' || item.delivery_type === 'pre_recorded') {
    return { '@type': 'VirtualLocation', url: getSiteOrigin() }
  }

  const name = [item.location_name, item.city].filter(Boolean).join(', ')
  if (!name) return undefined

  return {
    '@type': 'Place',
    name,
    ...(item.city && {
      address: {
        '@type': 'PostalAddress',
        addressLocality: item.city,
      },
    }),
  }
}

function buildCourseInstances(
  variants?: EventVariant[] | null,
): Record<string, unknown>[] | undefined {
  if (!variants?.length) return undefined

  const instances = variants
    .filter((variant) => variant.purchasable !== false && variant.event_item)
    .map((variant) => {
      const item = variant.event_item!
      const price = variant.prices?.[0]?.amount
      const location = buildPlaceFromVariant(variant)

      return {
        '@type': 'CourseInstance',
        name: variant.title,
        startDate: item.start_at ?? undefined,
        endDate: item.end_at ?? undefined,
        courseMode:
          item.delivery_type === 'online'
            ? 'online'
            : item.delivery_type === 'offline'
              ? 'onsite'
              : undefined,
        ...(location && { location }),
        ...(price != null && {
          offers: buildOfferFromPrice(price, item.available_quantity !== 0),
        }),
      }
    })

  return instances.length ? instances : undefined
}

function resolvePrimaryEventLocation(
  event: PdpEventForJsonLd,
): Record<string, unknown> | undefined {
  const variantWithLocation = event.variants?.find((variant) => variant.event_item)
  const fromVariant = variantWithLocation
    ? buildPlaceFromVariant(variantWithLocation)
    : undefined
  if (fromVariant) return fromVariant

  if (event.cities?.[0]) {
    return { '@type': 'Place', name: event.cities[0] }
  }

  return { '@type': 'VirtualLocation', url: getSiteOrigin() }
}

function resolveEventEndDate(event: PdpEventForJsonLd): string | undefined {
  const endDates = (event.variants ?? [])
    .map((variant) => variant.event_item?.end_at)
    .filter((value): value is string => Boolean(value))
  if (!endDates.length) return undefined
  return endDates.sort().at(-1)
}

type PdpEventForJsonLd = Pick<
  EventCard,
  | 'title'
  | 'description'
  | 'image_urls'
  | 'thumbnail'
  | 'record_type'
  | 'cities'
  | 'delivery_types'
  | 'instructors'
  | 'earliest_start_at'
  | 'price_from'
  | 'min_available_quantity'
  | 'variants'
  | 'purchase_mode'
  | 'bundle_variant_id'
>

export interface PdpJsonLdOptions {
  seo?: ProductSeoSource | null
  productPath?: string
  /** VA Thuis PDPs are always courses. */
  forceCourse?: boolean
}

/**
 * Product detail Course or Event structured data with commerce + editorial enrichment.
 */
export function buildPdpEventOrCourseJsonLd(
  handle: string,
  event: PdpEventForJsonLd,
  options: PdpJsonLdOptions = {},
): Record<string, unknown> {
  const isCourse =
    options.forceCourse || event.record_type === 'collegereeks' || !event.record_type
  const path = options.productPath ?? plpProductPath(handle)
  const fields = resolveProductSchemaFields(options.seo, event)
  const instructors = event.instructors?.map(buildPersonEntity)
  const courseInstances = buildCourseInstances(event.variants)
  const inStock = !eventIsFullySoldOut(event)

  const base: Record<string, unknown> = {
    '@context': SCHEMA_ORG,
    '@type': isCourse ? 'Course' : 'Event',
    name: fields.name,
    description: fields.description,
    image: fields.image,
    url: absolutizeUrl(path),
  }

  if (isCourse) {
    base.provider = buildOrganizationReference()
    if (instructors?.length === 1) base.instructor = instructors[0]
    else if (instructors && instructors.length > 1) base.instructor = instructors
    if (courseInstances?.length) base.hasCourseInstance = courseInstances
    if (event.price_from != null) {
      base.offers = buildOfferFromPrice(event.price_from, inStock)
    }
  } else {
    base.organizer = buildOrganizationReference()
    base.startDate = event.earliest_start_at ?? undefined
    base.endDate = resolveEventEndDate(event)
    base.location = resolvePrimaryEventLocation(event)
    const attendanceMode = resolveEventAttendanceMode(event.delivery_types)
    if (attendanceMode) base.eventAttendanceMode = attendanceMode
    if (instructors?.length === 1) base.performer = instructors[0]
    else if (instructors && instructors.length > 1) base.performer = instructors
    if (event.price_from != null) {
      base.offers = buildOfferFromPrice(event.price_from, inStock)
    }
  }

  return base
}
