import type { MedusaContainer } from "@medusajs/framework/types"
import { createClient } from "@sanity/client"

import { getPlpListingSnapshot } from "../../lib/store-listing-snapshot"
import {
  buildCommerceSearchDocs,
  buildCategorySearchDoc,
  buildProductSearchDoc,
  buildSanitySearchDoc,
  fetchSanityCategoryEditorialByMedusaId,
  fetchSanityCategoryEditorialBySanityId,
  type SanitySearchRow,
} from "./document-builders"
import { getOpenSearchClient, getSearchIndexName, isOpenSearchConfigured } from "./client"
import { SEARCH_INDEX_MAPPINGS, SEARCH_INDEX_SETTINGS } from "./index-mapping"
import type {
  SearchDocKind,
  SearchDocument,
  SearchHit,
  SearchSuggestionsResult,
  SiteSearchResult,
} from "./types"

const SUGGEST_KINDS: SearchDocKind[] = ["product", "category", "city", "page"]
const FULL_KINDS: SearchDocKind[] = [
  "product",
  "category",
  "city",
  "page",
  "docent",
  "person",
]

function truncateExcerpt(s: string | null | undefined, max = 200): string | undefined {
  if (!s) return undefined
  const t = s.trim()
  if (!t) return undefined
  if (t.length <= max) return t
  return `${t.slice(0, max - 1).trimEnd()}…`
}

function docToHit(doc: SearchDocument): SearchHit {
  return {
    id: doc.id,
    kind: doc.kind,
    title: doc.title,
    subtitle: doc.subtitle ?? undefined,
    href: doc.url,
    excerpt: doc.excerpt ?? truncateExcerpt(doc.body),
    thumbnailUrl: doc.thumbnail_url ?? undefined,
  }
}

function buildSearchQuery(
  q: string,
  kinds: SearchDocKind[],
  limit: number,
  options?: { futureProductsOnly?: boolean }
): Record<string, unknown> {
  const filters: Record<string, unknown>[] = [{ terms: { kind: kinds } }]

  if (options?.futureProductsOnly) {
    filters.push({
      bool: {
        should: [
          { term: { has_future_activity: true } },
          { bool: { must_not: [{ term: { kind: "product" } }] } },
        ],
        minimum_should_match: 1,
      },
    })
  }

  return {
    size: limit,
    query: {
      bool: {
        must: [
          {
            multi_match: {
              query: q,
              fields: [
                "title^4",
                "title.autocomplete^3",
                "handle^2",
                "body",
                "excerpt",
                "category_labels^2",
                "docent_names^2",
                "city_labels^2",
                "location_names^2",
                "tags",
                "subtitle",
              ],
              type: "best_fields" as const,
              fuzziness: "AUTO" as const,
              prefix_length: 1,
            },
          },
        ],
        filter: filters,
      },
    },
    sort: [{ _score: { order: "desc" } }, { "title.keyword": { order: "asc" } }],
  }
}

function getSanityReadClient() {
  const projectId = process.env.SANITY_PROJECT_ID?.trim()
  const dataset = process.env.SANITY_DATASET?.trim() || "production"
  const token = process.env.SANITY_WRITE_TOKEN?.trim()

  if (!projectId || !token) {
    throw new Error("SANITY_PROJECT_ID and SANITY_WRITE_TOKEN must be set for Sanity search indexing")
  }

  return createClient({
    projectId,
    dataset,
    token,
    apiVersion: "2024-01-01",
    useCdn: false,
  })
}

export default class SearchModuleService {
  isEnabled(): boolean {
    return isOpenSearchConfigured()
  }

  async ensureIndex(): Promise<void> {
    const client = getOpenSearchClient()
    if (!client) return

    const index = getSearchIndexName()
    const exists = await client.indices.exists({ index })
    if (exists.body) {
      // Analysis settings are fixed at index creation — do not call putSettings on an open index.
      return
    }

    await client.indices.create({
      index,
      body: {
        settings: SEARCH_INDEX_SETTINGS,
        mappings: { properties: SEARCH_INDEX_MAPPINGS as never },
      },
    })
  }

  /** Drop and recreate the index (used by full reindex). */
  async recreateIndex(): Promise<void> {
    const client = getOpenSearchClient()
    if (!client) return

    const index = getSearchIndexName()
    const exists = await client.indices.exists({ index })
    if (exists.body) {
      await client.indices.delete({ index })
    }

    await client.indices.create({
      index,
      body: {
        settings: SEARCH_INDEX_SETTINGS,
        mappings: { properties: SEARCH_INDEX_MAPPINGS as never },
      },
    })
  }

  async bulkUpsert(docs: SearchDocument[]): Promise<void> {
    const client = getOpenSearchClient()
    if (!client || !docs.length) return

    await this.ensureIndex()

    const index = getSearchIndexName()
    const body = docs.flatMap((doc) => [{ index: { _index: index, _id: doc.id } }, doc])
    const result = await client.bulk({ refresh: true, body })

    if (result.body.errors) {
      const failed = (result.body.items ?? []).filter(
        (item: { index?: { error?: unknown } }) => item.index?.error
      )
      throw new Error(`OpenSearch bulk upsert failed: ${JSON.stringify(failed.slice(0, 3))}`)
    }
  }

  async deleteDoc(id: string): Promise<void> {
    const client = getOpenSearchClient()
    if (!client) return

    const index = getSearchIndexName()
    try {
      await client.delete({ index, id, refresh: true })
    } catch (err: unknown) {
      const status = (err as { meta?: { statusCode?: number } })?.meta?.statusCode
      if (status === 404) return
      throw err
    }
  }

  async searchHits(
    q: string,
    options?: { kinds?: SearchDocKind[]; limit?: number; futureProductsOnly?: boolean }
  ): Promise<SearchHit[]> {
    const trimmed = q.trim()
    if (!trimmed) return []

    const client = getOpenSearchClient()
    if (!client) return []

    const kinds = options?.kinds ?? FULL_KINDS
    const limit = options?.limit ?? 25

    const result = await client.search({
      index: getSearchIndexName(),
      body: buildSearchQuery(trimmed, kinds, limit, {
        futureProductsOnly: options?.futureProductsOnly,
      }) as Record<string, unknown>,
    })

    const hits = (result.body.hits?.hits ?? []) as Array<{ _source?: SearchDocument }>
    return hits
      .map((h) => (h._source ? docToHit(h._source) : null))
      .filter((h): h is SearchHit => h !== null)
  }

  async searchRankedProductIds(q: string, limit = 500): Promise<string[]> {
    const trimmed = q.trim()
    if (!trimmed) return []

    const client = getOpenSearchClient()
    if (!client) return []

    const result = await client.search({
      index: getSearchIndexName(),
      body: buildSearchQuery(trimmed, ["product"], limit) as Record<string, unknown>,
    })

    const hits = (result.body.hits?.hits ?? []) as Array<{ _source?: SearchDocument }>
    const ids: string[] = []
    for (const hit of hits) {
      const productId = hit._source?.product_id
      if (productId) ids.push(productId)
    }
    return ids
  }

  groupSuggestHits(hits: SearchHit[]): SearchSuggestionsResult {
    const out: SearchSuggestionsResult = {
      products: [],
      categories: [],
      places: [],
      pages: [],
    }

    for (const hit of hits) {
      if (hit.kind === "category" && out.categories.length < 4) {
        out.categories.push(hit)
      } else if (hit.kind === "product" && out.products.length < 6) {
        out.products.push(hit)
      } else if (hit.kind === "city" && out.places.length < 4) {
        out.places.push(hit)
      } else if (hit.kind === "page" && out.pages.length < 4) {
        out.pages.push(hit)
      }
    }

    return out
  }

  async searchSuggest(q: string): Promise<SearchSuggestionsResult> {
    const hits = await this.searchHits(q, {
      kinds: SUGGEST_KINDS,
      limit: 32,
      futureProductsOnly: true,
    })
    return this.groupSuggestHits(hits)
  }

  async searchSite(q: string): Promise<SiteSearchResult> {
    const hits = await this.searchHits(q, { kinds: FULL_KINDS, limit: 25 })
    return { hits, count: hits.length }
  }

  async reindexCommerce(scope: MedusaContainer): Promise<number> {
    if (!this.isEnabled()) return 0
    const docs = await buildCommerceSearchDocs(scope)
    await this.bulkUpsert(docs)
    return docs.length
  }

  async reindexProductById(scope: MedusaContainer, productId: string): Promise<void> {
    if (!this.isEnabled()) return

    const snapshot = await getPlpListingSnapshot(scope)
    const row = snapshot.list.find((p: Record<string, unknown>) => String(p.id) === productId)
    if (!row) {
      await this.deleteDoc(`product-${productId}`)
      return
    }

    const doc = buildProductSearchDoc(row)
    if (!doc) {
      await this.deleteDoc(`product-${productId}`)
      return
    }

    await this.bulkUpsert([doc])
  }

  async reindexCatalogEntity(
    kind: "category" | "city" | "docent",
    entity: {
      id: string
      slug?: string | null
      label?: string | null
      name?: string | null
      role?: string | null
      bio?: string | null
      subject_tags?: unknown
    }
  ): Promise<void> {
    if (!this.isEnabled()) return

    let doc: SearchDocument | null = null

    if (kind === "category") {
      const slug = entity.slug?.trim()
      const label = entity.label?.trim()
      if (!slug || !label) return
      const editorial = await fetchSanityCategoryEditorialByMedusaId(entity.id)
      doc = buildCategorySearchDoc({ id: entity.id, slug, label }, editorial)
    } else if (kind === "city") {
      const slug = entity.slug?.trim()
      const label = entity.label?.trim()
      if (!slug || !label) return
      doc = {
        id: `city-${entity.id}`,
        kind: "city",
        title: label,
        handle: slug,
        subtitle: "Plaats",
        url: `/ons-aanbod/plaats/${slug}`,
        body: label,
        city_labels: [label],
      }
    } else {
      const slug = entity.slug?.trim()
      const name = entity.name?.trim()
      if (!slug || !name) return
      const subjectTags = Array.isArray(entity.subject_tags)
        ? (entity.subject_tags as string[]).filter(Boolean)
        : []
      const bio = entity.bio?.trim() || ""
      doc = {
        id: `docent-${entity.id}`,
        kind: "docent",
        title: name,
        handle: slug,
        subtitle: entity.role?.trim() || "Docent",
        url: `/ons-aanbod?docent=${encodeURIComponent(slug)}`,
        body: [bio, ...subjectTags].filter(Boolean).join("\n") || null,
        excerpt: truncateExcerpt(bio),
        docent_names: [name],
        tags: subjectTags,
      }
    }

    if (doc) await this.bulkUpsert([doc])
  }

  async fetchSanitySearchRows(): Promise<SanitySearchRow[]> {
    const client = getSanityReadClient()
    const rows = await client.fetch<SanitySearchRow[]>(`
      *[_type in ["page", "person"] && !(_id in path("drafts.**"))] {
        _id,
        _type,
        "title": select(_type == "page" => title, _type == "person" => name),
        "slug": select(_type == "page" => slug.current),
        "seoDescription": select(_type == "page" => seo.metaDescription),
        "role": select(_type == "person" => role),
        "bio": select(_type == "person" => bio),
        "subjectTags": select(_type == "person" => subjectTags),
        "profileUrl": select(_type == "person" => profileUrl)
      }
    `)
    return rows ?? []
  }

  async reindexSanityContent(): Promise<number> {
    if (!this.isEnabled()) return 0
    const rows = await this.fetchSanitySearchRows()
    const docs = rows
      .map((row) => buildSanitySearchDoc(row))
      .filter((doc): doc is SearchDocument => doc !== null)
    await this.bulkUpsert(docs)
    return docs.length
  }

  async upsertSanityDocById(sanityId: string): Promise<void> {
    if (!this.isEnabled()) return
    const client = getSanityReadClient()
    const row = await client.fetch<
      | (SanitySearchRow & { medusaId?: string | null })
      | ({ _type: "category"; medusaId?: string | null })
      | null
    >(
      `*[_id == $id][0] {
        _id,
        _type,
        medusaId,
        "title": select(_type == "page" => title, _type == "person" => name),
        "slug": select(_type == "page" => slug.current, _type == "category" => slug),
        "seoDescription": select(_type == "page" => seo.metaDescription),
        "role": select(_type == "person" => role),
        "bio": select(_type == "person" => bio),
        "subjectTags": select(_type == "person" => subjectTags),
        "profileUrl": select(_type == "person" => profileUrl),
        label
      }`,
      { id: sanityId }
    )

    if (!row) return

    if (row._type === "category") {
      await this.reindexCategoryFromSanityId(sanityId)
      return
    }

    if (row._type !== "page" && row._type !== "person") {
      await this.deleteSanityDocById(sanityId)
      return
    }

    const doc = buildSanitySearchDoc(row as SanitySearchRow)
    if (!doc) {
      await this.deleteSanityDocById(sanityId)
      return
    }

    await this.bulkUpsert([doc])
  }

  async reindexCategoryFromSanityId(sanityCategoryId: string): Promise<void> {
    if (!this.isEnabled()) return

    const editorial = await fetchSanityCategoryEditorialBySanityId(sanityCategoryId)
    if (!editorial?.medusaId || !editorial.slug?.trim() || !editorial.label?.trim()) {
      return
    }

    const doc = buildCategorySearchDoc(
      {
        id: editorial.medusaId,
        slug: editorial.slug.trim(),
        label: editorial.label.trim(),
      },
      editorial
    )
    if (doc) await this.bulkUpsert([doc])
  }

  async deleteSanityDocById(sanityId: string): Promise<void> {
    await Promise.all([
      this.deleteDoc(`sanity-page-${sanityId}`),
      this.deleteDoc(`sanity-person-${sanityId}`),
    ])
  }

  async fullReindex(scope: MedusaContainer): Promise<{ commerce: number; sanity: number }> {
    if (!this.isEnabled()) {
      return { commerce: 0, sanity: 0 }
    }
    await this.recreateIndex()
    const commerce = await this.reindexCommerce(scope)
    const sanity = await this.reindexSanityContent()
    return { commerce, sanity }
  }
}
