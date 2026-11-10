import { sfRequest } from "../client/rest"

export type SObjectFieldDescribe = {
  name: string
  createable: boolean
  updateable: boolean
  label?: string
  type?: string
}

type DescribeResponse = {
  fields?: Array<{
    name: string
    createable?: boolean
    updateable?: boolean
    label?: string
    type?: string
  }>
}

const describeCache = new Map<string, SObjectFieldDescribe[]>()

/** Cached Salesforce sObject describe (fields + create/update flags). */
export async function loadSObjectFieldDescribe(
  sobject: string
): Promise<SObjectFieldDescribe[] | null> {
  const cached = describeCache.get(sobject)
  if (cached) return cached

  try {
    const { data } = await sfRequest<DescribeResponse>(
      "GET",
      `/sobjects/${encodeURIComponent(sobject)}/describe`
    )
    const fields = (data.fields ?? []).map((f) => ({
      name: f.name,
      createable: !!f.createable,
      updateable: !!f.updateable,
      label: typeof f.label === "string" ? f.label : undefined,
      type: typeof f.type === "string" ? f.type : undefined,
    }))
    describeCache.set(sobject, fields)
    return fields
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (/NOT_FOUND|NOT FOUND|resource does not exist/i.test(message)) return null
    throw err
  }
}

export function filterFieldsForSalesforceWrite(
  fields: Record<string, unknown>,
  describe: SObjectFieldDescribe[],
  mode: "create" | "update"
): Record<string, unknown> {
  const allowed = new Set(
    describe
      .filter((f) => (mode === "create" ? f.createable : f.updateable))
      .map((f) => f.name)
  )
  return Object.fromEntries(
    Object.entries(fields).filter(([key, value]) => value !== undefined && allowed.has(key))
  )
}

/** Drop keys that are not writable on the connected org (describe cache). */
export async function filterFieldsForConnectedOrg(
  sobject: string,
  fields: Record<string, unknown>,
  mode: "create" | "update"
): Promise<Record<string, unknown>> {
  const describe = await loadSObjectFieldDescribe(sobject)
  if (!describe) return fields
  return filterFieldsForSalesforceWrite(fields, describe, mode)
}

/** SOQL SELECT list: only fields that exist on the object in this org. */
export async function soqlFieldList(
  sobject: string,
  candidates: string[]
): Promise<string> {
  const describe = await loadSObjectFieldDescribe(sobject)
  if (!describe) return candidates.join(", ")
  const names = new Set(describe.map((f) => f.name))
  return candidates.filter((f) => names.has(f)).join(", ")
}

/** Fields whose API name or label matches (for SOQL/debug). */
export function filterSObjectFieldsByPattern(
  fields: SObjectFieldDescribe[],
  pattern: RegExp
): SObjectFieldDescribe[] {
  return fields.filter(
    (f) =>
      pattern.test(f.name) ||
      (typeof f.label === "string" && pattern.test(f.label))
  )
}

/** Test helper */
export function clearSalesforceDescribeCache(): void {
  describeCache.clear()
}
