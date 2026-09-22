import type { SearchDocKind } from "./types"

/** Title, handle, taxonomy — not body. Body matches were too loose (e.g. "Iran" in a Georgia/Armenia intro). */
export const SEARCH_CORE_FIELDS = [
  "title^4",
  "title.autocomplete^3",
  "handle^2",
  "category_labels^2",
  "docent_names^2",
  "city_labels^2",
  "location_names^2",
  "tags",
  "subtitle",
] as const

/** Typo clause: no autocomplete ngrams (fuzzy + edge-ngrams explode) and no body. */
export const SEARCH_FUZZY_FIELDS = ["title^4", "handle^2"] as const

export function buildSearchQuery(
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
            bool: {
              minimum_should_match: 1,
              should: [
                {
                  multi_match: {
                    query: q,
                    fields: [...SEARCH_CORE_FIELDS],
                    type: "cross_fields" as const,
                    operator: "and" as const,
                  },
                },
                {
                  multi_match: {
                    query: q,
                    fields: [...SEARCH_FUZZY_FIELDS],
                    type: "best_fields" as const,
                    operator: "and" as const,
                    fuzziness: 1,
                  },
                },
              ],
            },
          },
        ],
        filter: filters,
      },
    },
    sort: [{ _score: { order: "desc" } }, { "title.keyword": { order: "asc" } }],
  }
}
