import { Client } from "@opensearch-project/opensearch"

let client: Client | null = null

export function getSearchIndexName(): string {
  return process.env.SEARCH_INDEX?.trim() || "va-search"
}

export function isOpenSearchConfigured(): boolean {
  return Boolean(process.env.OPENSEARCH_NODE?.trim())
}

export function getOpenSearchClient(): Client | null {
  if (!isOpenSearchConfigured()) return null

  if (!client) {
    const node = process.env.OPENSEARCH_NODE!.trim()
    const username = process.env.OPENSEARCH_USERNAME?.trim()
    const password = process.env.OPENSEARCH_PASSWORD?.trim()

    client = new Client({
      node,
      ...(username && password
        ? { auth: { username, password } }
        : {}),
      ssl: {
        rejectUnauthorized: process.env.OPENSEARCH_SSL_VERIFY !== "false",
      },
    })
  }

  return client
}
