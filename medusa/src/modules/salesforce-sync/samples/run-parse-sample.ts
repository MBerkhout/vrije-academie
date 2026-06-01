import { readFileSync } from "node:fs"
import { join } from "node:path"

/** Shape returned by `GET /services/data/vXX/query?q=...` (subset). */
export type SampleQueryBody = {
  totalSize?: number
  done?: boolean
  records?: Array<Record<string, unknown>>
}

const SAMPLE_REL = join("src", "modules", "salesforce-sync", "samples", "query-response.example.json")

export function loadExampleQueryResponseJson(): string {
  const root = process.cwd()
  return readFileSync(join(root, SAMPLE_REL), "utf8")
}

export function parseSampleQueryResponse(log: { info: (msg: string) => void }): void {
  const raw = loadExampleQueryResponseJson()
  const body = JSON.parse(raw) as SampleQueryBody

  if (typeof body.totalSize !== "number" || !Array.isArray(body.records)) {
    throw new Error("Invalid sample: expected totalSize (number) records (array)")
  }

  log.info(
    `[sync-salesforce] parse-sample OK: totalSize=${body.totalSize} records=${body.records.length} ` +
      `(keys: ${body.records[0] ? Object.keys(body.records[0]).join(", ") : "—"})`
  )
}
