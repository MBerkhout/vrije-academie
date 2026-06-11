export const SEARCH_INDEX_SETTINGS = {
  analysis: {
    analyzer: {
      dutch_search: {
        type: "custom" as const,
        tokenizer: "standard",
        filter: ["lowercase", "asciifolding", "dutch_stemmer"],
      },
      dutch_autocomplete: {
        type: "custom" as const,
        tokenizer: "standard",
        filter: ["lowercase", "asciifolding", "edge_ngram_filter"],
      },
    },
    filter: {
      dutch_stemmer: {
        type: "stemmer" as const,
        language: "dutch",
      },
      edge_ngram_filter: {
        type: "edge_ngram" as const,
        min_gram: 2,
        max_gram: 20,
      },
    },
  },
}

export const SEARCH_INDEX_MAPPINGS = {
  id: { type: "keyword" },
  kind: { type: "keyword" },
  title: {
    type: "text",
    analyzer: "dutch_search",
    fields: {
      autocomplete: { type: "text", analyzer: "dutch_autocomplete", search_analyzer: "dutch_search" },
      keyword: { type: "keyword" },
    },
  },
  subtitle: { type: "text", analyzer: "dutch_search" },
  handle: { type: "text", analyzer: "dutch_search", fields: { keyword: { type: "keyword" } } },
  url: { type: "keyword" },
  body: { type: "text", analyzer: "dutch_search" },
  excerpt: { type: "text", analyzer: "dutch_search" },
  category_labels: { type: "text", analyzer: "dutch_search" },
  docent_names: { type: "text", analyzer: "dutch_search" },
  city_labels: { type: "text", analyzer: "dutch_search" },
  location_names: { type: "text", analyzer: "dutch_search" },
  tags: { type: "text", analyzer: "dutch_search" },
  record_type: { type: "keyword" },
  product_type: { type: "keyword" },
  thumbnail_url: { type: "keyword", index: false },
  product_id: { type: "keyword" },
  has_future_activity: { type: "boolean" },
}
