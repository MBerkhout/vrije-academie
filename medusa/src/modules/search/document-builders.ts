import type { MedusaContainer } from "@medusajs/framework/types"
import { createClient } from "@sanity/client"

import CatalogModuleService from "../catalog/service"
import PeopleModuleService from "../people/service"
import { stripHtmlToPlainText } from "../salesforce-sync/mappings/productgroup"
import { productHasFutureAvailableSession } from "../../lib/event-session-eligibility"
import { getPlpListingSnapshot } from "../../lib/store-listing-snapshot"
import type { CityRef } from "../../lib/city-refs"
import type { SearchDocument } from "./types"

function truncateExcerpt(s: string | null | undefined, max = 200): string | undefined {
  if (!s) return undefined
  const t = s.trim()
  if (!t) return undefined
  if (t.length <= max) return t
  return `${t.slice(0, max - 1).trimEnd()}…`
}

function plainBodyFromProduct(row: Record<string, unknown>): string {
  const parts: string[] = []
  const description = String(row.description ?? "").trim()
  if (description) parts.push(description)

  const metadata = (row.metadata ?? {}) as Record<string, unknown>
  for (const key of [
    "salesforce_subtitle",
    "salesforce_seo_title",
    "salesforce_seo_description",
    "salesforce_web_body",
    "salesforce_web_trigger",
    "salesforce_description_html",
  ]) {
    const raw = metadata[key]
    if (typeof raw === "string" && raw.trim()) {
      parts.push(stripHtmlToPlainText(raw))
    }
  }

  return parts.filter(Boolean).join("\n")
}

function locationNamesFromVariants(row: Record<string, unknown>): string[] {
  const variants = (row.variants ?? []) as Record<string, unknown>[]
  const names = new Set<string>()
  for (const v of variants) {
    const ei = v.event_item as { location_name?: string | null } | null | undefined
    const name = ei?.location_name?.trim()
    if (name) names.add(name)
  }
  return [...names]
}

function cityLabelsFromProduct(row: Record<string, unknown>): string[] {
  const cities = (row.cities ?? []) as Array<string | CityRef>
  const labels = new Set<string>()
  for (const c of cities) {
    if (typeof c === "string") {
      const t = c.trim()
      if (t) labels.add(t)
    } else if (c && typeof c === "object") {
      const label = (c as CityRef).label?.trim() || (c as CityRef).slug?.trim()
      if (label) labels.add(label)
    }
  }
  return [...labels]
}

function eventItemsFromProduct(row: Record<string, unknown>) {
  const variants = (row.variants ?? []) as Record<string, unknown>[]
  return variants
    .map((v) => v.event_item)
    .filter(Boolean) as { start_at?: string | null; available_quantity?: number | null }[]
}

function productHasFutureActivity(row: Record<string, unknown>): boolean {
  const eventItems = eventItemsFromProduct(row)
  if (!eventItems.length) return true
  return productHasFutureAvailableSession(eventItems)
}

export function buildProductSearchDoc(row: Record<string, unknown>): SearchDocument | null {
  const id = String(row.id ?? "").trim()
  const handle = String(row.handle ?? "").trim()
  const title = String(row.title ?? "").trim()
  if (!id || !handle || !title) return null

  const categories = (row.categories ?? []) as { label?: string }[]
  const docenten = (row.docenten ?? []) as { name?: string }[]
  const tags = (row.tags ?? []) as { value?: string }[]
  const body = plainBodyFromProduct(row)

  return {
    id: `product-${id}`,
    kind: "product",
    product_id: id,
    title,
    handle,
    subtitle: String(row.record_type ?? row.product_type ?? "Activiteit"),
    url: `/ons-aanbod/${handle}`,
    body: body || null,
    excerpt: truncateExcerpt(body || String(row.description ?? "")),
    category_labels: categories.map((c) => c.label?.trim()).filter(Boolean) as string[],
    docent_names: docenten.map((d) => d.name?.trim()).filter(Boolean) as string[],
    city_labels: cityLabelsFromProduct(row),
    location_names: locationNamesFromVariants(row),
    tags: tags.map((t) => t.value?.trim()).filter(Boolean) as string[],
    record_type: (row.record_type as string | null) ?? null,
    product_type: (row.product_type as string | null) ?? null,
    thumbnail_url: (row.thumbnail as string | null) ?? null,
    has_future_activity: productHasFutureActivity(row),
  }
}

export type SanityCategoryEditorial = {
  medusaId: string
  slug: string
  label: string
  title?: string | null
  description?: string | null
  linkUrl?: string | null
  thumbnailUrl?: string | null
  seoTitle?: string | null
  seoDescription?: string | null
}

function normalizeCategoryHref(slug: string, linkUrl?: string | null): string {
  const raw = linkUrl?.trim()
  if (!raw) return `/ons-aanbod/${slug}`
  if (/^https?:\/\//i.test(raw) || raw.startsWith("mailto:")) return raw
  return raw.startsWith("/") ? raw : `/${raw.replace(/^\//, "")}`
}

export function buildCategorySearchDoc(
  cat: { id: string; slug: string; label: string },
  editorial?: SanityCategoryEditorial | null
): SearchDocument | null {
  const slug = cat.slug?.trim()
  const label = cat.label?.trim()
  if (!slug || !label) return null

  const displayTitle = editorial?.title?.trim() || label
  const description = editorial?.description?.trim() || ""
  const seoTitle = editorial?.seoTitle?.trim() || ""
  const seoDescription = editorial?.seoDescription?.trim() || ""
  const body = [label, displayTitle, description, seoTitle, seoDescription].filter(Boolean).join("\n")

  return {
    id: `category-${cat.id}`,
    kind: "category",
    title: displayTitle,
    handle: slug,
    subtitle: "Categorie",
    url: normalizeCategoryHref(slug, editorial?.linkUrl),
    body: body || label,
    excerpt: truncateExcerpt(description || seoDescription || label),
    thumbnail_url: editorial?.thumbnailUrl ?? null,
  }
}

function getSanitySearchReadClient() {
  const projectId = process.env.SANITY_PROJECT_ID?.trim()
  const dataset = process.env.SANITY_DATASET?.trim() || "production"
  const token = process.env.SANITY_WRITE_TOKEN?.trim()

  if (!projectId || !token) return null

  return createClient({
    projectId,
    dataset,
    token,
    apiVersion: "2024-01-01",
    useCdn: false,
  })
}

export async function fetchSanityCategoryEditorialMap(): Promise<Map<string, SanityCategoryEditorial>> {
  const client = getSanitySearchReadClient()
  const map = new Map<string, SanityCategoryEditorial>()
  if (!client) return map

  const rows = await client.fetch<SanityCategoryEditorial[]>(`
    *[_type == "category" && defined(medusaId) && defined(slug)] {
      "medusaId": medusaId,
      slug,
      label,
      title,
      description,
      linkUrl,
      "thumbnailUrl": coalesce(image.asset->url, imageUrl),
      "seoTitle": seo.metaTitle,
      "seoDescription": seo.metaDescription
    }
  `)

  for (const row of rows ?? []) {
    const medusaId = row.medusaId?.trim()
    if (medusaId) map.set(medusaId, row)
  }

  return map
}

export async function fetchSanityCategoryEditorialByMedusaId(
  medusaId: string
): Promise<SanityCategoryEditorial | null> {
  const client = getSanitySearchReadClient()
  if (!client) return null

  return client.fetch<SanityCategoryEditorial | null>(
    `*[_type == "category" && medusaId == $medusaId][0] {
      "medusaId": medusaId,
      slug,
      label,
      title,
      description,
      linkUrl,
      "thumbnailUrl": coalesce(image.asset->url, imageUrl),
      "seoTitle": seo.metaTitle,
      "seoDescription": seo.metaDescription
    }`,
    { medusaId }
  )
}

export async function fetchSanityCategoryEditorialBySanityId(
  sanityId: string
): Promise<SanityCategoryEditorial | null> {
  const client = getSanitySearchReadClient()
  if (!client) return null

  return client.fetch<SanityCategoryEditorial | null>(
    `*[_id == $id][0] {
      "medusaId": medusaId,
      slug,
      label,
      title,
      description,
      linkUrl,
      "thumbnailUrl": coalesce(image.asset->url, imageUrl),
      "seoTitle": seo.metaTitle,
      "seoDescription": seo.metaDescription
    }`,
    { id: sanityId }
  )
}

export async function buildCommerceSearchDocs(
  scope: MedusaContainer
): Promise<SearchDocument[]> {
  const snapshot = await getPlpListingSnapshot(scope)
  const catalog = scope.resolve("catalog") as InstanceType<typeof CatalogModuleService>
  const people = scope.resolve("people") as InstanceType<typeof PeopleModuleService>

  const docs: SearchDocument[] = []

  for (const row of snapshot.list) {
    const doc = buildProductSearchDoc(row)
    if (doc) docs.push(doc)
  }

  const [categories, cities, docenten, categoryEditorial] = await Promise.all([
    catalog.listCategories({}, { take: 1000, order: { sort_order: "ASC" } }),
    catalog.listCities({}, { take: 1000, order: { sort_order: "ASC" } }),
    people.listDocents({}, { take: 1000 }),
    fetchSanityCategoryEditorialMap(),
  ])

  for (const cat of categories) {
    const slug = cat.slug?.trim()
    const label = cat.label?.trim()
    if (!slug || !label) continue
    const doc = buildCategorySearchDoc(
      { id: cat.id, slug, label },
      categoryEditorial.get(cat.id) ?? null
    )
    if (doc) docs.push(doc)
  }

  for (const city of cities) {
    const slug = city.slug?.trim()
    const label = city.label?.trim()
    if (!slug || !label) continue
    docs.push({
      id: `city-${city.id}`,
      kind: "city",
      title: label,
      handle: slug,
      subtitle: "Plaats",
      url: `/ons-aanbod/plaats/${slug}`,
      body: label,
      city_labels: [label],
    })
  }

  for (const docent of docenten) {
    const slug = docent.slug?.trim()
    const name = docent.name?.trim()
    if (!slug || !name) continue
    const subjectTags = Array.isArray(docent.subject_tags)
      ? (docent.subject_tags as string[]).filter(Boolean)
      : []
    const bio = docent.bio?.trim() || ""
    docs.push({
      id: `docent-${docent.id}`,
      kind: "docent",
      title: name,
      handle: slug,
      subtitle: docent.role?.trim() || "Docent",
      url: `/ons-aanbod?docent=${encodeURIComponent(slug)}`,
      body: [bio, ...subjectTags].filter(Boolean).join("\n") || null,
      excerpt: truncateExcerpt(bio),
      docent_names: [name],
      tags: subjectTags,
    })
  }

  return docs
}

export type SanitySearchRow = {
  _id: string
  _type: "page" | "person"
  title?: string | null
  slug?: string | null
  seoDescription?: string | null
  role?: string | null
  bio?: string | null
  subjectTags?: string[] | null
  profileUrl?: string | null
}

export function buildSanitySearchDoc(row: SanitySearchRow): SearchDocument | null {
  if (row._type === "page") {
    const title = row.title?.trim()
    const slug = row.slug?.trim()
    if (!title || !slug) return null
    const href = slug === "/" ? "/" : slug.startsWith("/") ? slug : `/${slug}`
    const excerpt = truncateExcerpt(row.seoDescription)
    return {
      id: `sanity-page-${row._id}`,
      kind: "page",
      title,
      handle: slug,
      subtitle: "Pagina",
      url: href,
      body: [row.seoDescription?.trim()].filter(Boolean).join("\n") || null,
      excerpt: excerpt ?? null,
    }
  }

  if (row._type === "person") {
    const title = row.title?.trim()
    const profileUrl = row.profileUrl?.trim()
    if (!title || !profileUrl) return null
    const subjectTags = (row.subjectTags ?? []).filter(Boolean)
    const bio = row.bio?.trim() || ""
    return {
      id: `sanity-person-${row._id}`,
      kind: "person",
      title,
      subtitle: row.role?.trim() || "Team",
      url: profileUrl,
      body: [bio, ...subjectTags].filter(Boolean).join("\n") || null,
      excerpt: truncateExcerpt(bio),
      tags: subjectTags,
    }
  }

  return null
}
