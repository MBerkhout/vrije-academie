import { sfRequest } from "../client/rest"

type SfQueryPage<T> = {
  records: T[]
  done: boolean
  nextRecordsUrl?: string
}

/** Paginated SOQL query via Salesforce REST API. */
export async function queryAllSalesforce<T>(soql: string): Promise<T[]> {
  const records: T[] = []
  let path = `/query?q=${encodeURIComponent(soql)}`

  while (path) {
    const { data } = await sfRequest<SfQueryPage<T>>("GET", path)
    records.push(...(data.records ?? []))
    if (data.done || !data.nextRecordsUrl) break
    const match = data.nextRecordsUrl.match(/\/services\/data\/v[\d.]+\/(.+)$/)
    path = match ? `/${match[1]}` : ""
  }

  return records
}

export function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}
