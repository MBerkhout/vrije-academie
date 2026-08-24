import type { SfCourseProductShape } from "../mappings/course-product"
import {
  courseProductSalesforceFieldsForPull,
  SF_COURSE_PRODUCT_OBJECT,
} from "../mappings/course-product"
import type { SfProductgroupShape } from "../mappings/productgroup"
import {
  productgroupSalesforceFieldsForPull,
  SF_PRODUCTGROUP_OBJECT,
} from "../mappings/productgroup"
import { formatSoqlDateTime } from "./import-context"
import { linkedOnlineProductgroupId } from "./linked-online-productgroup"
import { chunkArray, queryAllSalesforce } from "./query-all-salesforce"

const SOQL_IN_CHUNK = 200

export type ProductgroupImportPrefetch = {
  groups: SfProductgroupShape[]
  groupsById: Map<string, SfProductgroupShape>
  linkedOnlineSlaveIds: Set<string>
  childrenByGroupId: Map<string, SfCourseProductShape[]>
}

export type PrefetchProductgroupsOptions = {
  /** Only groups (and parents of recently modified children) changed since this time. */
  since?: Date
}

function escapeSoqlId(id: string): string {
  return id.replace(/'/g, "\\'")
}

async function queryChildrenByGroupIds(
  groupIds: string[]
): Promise<Map<string, SfCourseProductShape[]>> {
  const childrenByGroupId = new Map<string, SfCourseProductShape[]>()
  if (!groupIds.length) return childrenByGroupId

  const childFields = courseProductSalesforceFieldsForPull.join(",")

  for (const batch of chunkArray(groupIds, SOQL_IN_CHUNK)) {
    const inList = batch.map((id) => `'${escapeSoqlId(id)}'`).join(",")
    const soql =
      `SELECT ${childFields} FROM ${SF_COURSE_PRODUCT_OBJECT} ` +
      `WHERE Productgroup__c IN (${inList}) ORDER BY Start_date_time__c ASC`
    const rows = await queryAllSalesforce<SfCourseProductShape>(soql)

    for (const row of rows) {
      const groupId = row.Productgroup__c?.trim()
      if (!groupId) continue
      const list = childrenByGroupId.get(groupId)
      if (list) list.push(row)
      else childrenByGroupId.set(groupId, [row])
    }
  }

  return childrenByGroupId
}

async function fetchGroupsByIds(groupIds: string[]): Promise<SfProductgroupShape[]> {
  if (!groupIds.length) return []
  const groupFields = productgroupSalesforceFieldsForPull.join(",")
  const rows: SfProductgroupShape[] = []

  for (const batch of chunkArray(groupIds, SOQL_IN_CHUNK)) {
    const inList = batch.map((id) => `'${escapeSoqlId(id)}'`).join(",")
    const soql = `SELECT ${groupFields} FROM ${SF_PRODUCTGROUP_OBJECT} WHERE Id IN (${inList})`
    rows.push(...(await queryAllSalesforce<SfProductgroupShape>(soql)))
  }

  return rows
}

/** Bulk-fetch product groups, children, and linked-online slave ids for import scripts. */
export async function prefetchProductgroupsForImport(
  options: PrefetchProductgroupsOptions = {}
): Promise<ProductgroupImportPrefetch> {
  const groupFields = productgroupSalesforceFieldsForPull.join(",")
  let groups: SfProductgroupShape[]

  if (options.since) {
    const sinceLiteral = `'${formatSoqlDateTime(options.since)}'`
    const modifiedGroups = await queryAllSalesforce<SfProductgroupShape>(
      `SELECT ${groupFields} FROM ${SF_PRODUCTGROUP_OBJECT} WHERE SystemModstamp >= ${sinceLiteral} ORDER BY Name`
    )

    const childFields = courseProductSalesforceFieldsForPull.join(",")
    const modifiedChildRows = await queryAllSalesforce<{
      Productgroup__c?: string
    }>(
      `SELECT Productgroup__c FROM ${SF_COURSE_PRODUCT_OBJECT} WHERE SystemModstamp >= ${sinceLiteral}`
    )

    const parentIdsFromChildren = [
      ...new Set(
        modifiedChildRows
          .map((r) => r.Productgroup__c?.trim())
          .filter((id): id is string => !!id)
      ),
    ]

    const groupIds = new Set(modifiedGroups.map((g) => g.Id).filter(Boolean) as string[])
    const missingParentIds = parentIdsFromChildren.filter((id) => !groupIds.has(id))
    const extraGroups = missingParentIds.length ? await fetchGroupsByIds(missingParentIds) : []

    groups = [...modifiedGroups, ...extraGroups]
  } else {
    groups = await queryAllSalesforce<SfProductgroupShape>(
      `SELECT ${groupFields} FROM ${SF_PRODUCTGROUP_OBJECT} ORDER BY Name`
    )
  }

  const groupsById = new Map<string, SfProductgroupShape>()
  const linkedOnlineSlaveIds = new Set<string>()

  for (const group of groups) {
    const id = group.Id?.trim()
    if (!id) continue
    groupsById.set(id, group)
    const linkedId = linkedOnlineProductgroupId(group)
    if (linkedId) linkedOnlineSlaveIds.add(linkedId)
  }

  // Ensure linked-online slave/parent groups referenced by candidates are present.
  const missingLinkedIds = [...linkedOnlineSlaveIds].filter((id) => !groupsById.has(id))
  if (missingLinkedIds.length) {
    const linkedGroups = await fetchGroupsByIds(missingLinkedIds)
    for (const group of linkedGroups) {
      const id = group.Id?.trim()
      if (!id) continue
      groupsById.set(id, group)
      groups.push(group)
    }
  }

  const groupIds = [...groupsById.keys()]
  const childrenByGroupId = await queryChildrenByGroupIds(groupIds)

  // Pull children for linked-online slave catalogs referenced by parents.
  const linkedSlaveIds = [...linkedOnlineSlaveIds].filter((id) => !childrenByGroupId.has(id))
  if (linkedSlaveIds.length) {
    const linkedChildren = await queryChildrenByGroupIds(linkedSlaveIds)
    for (const [id, rows] of linkedChildren) {
      childrenByGroupId.set(id, rows)
    }
  }

  return {
    groups,
    groupsById,
    linkedOnlineSlaveIds,
    childrenByGroupId,
  }
}

/** Fetch extra Salesforce groups (e.g. already-imported ids missing from `--since`) into a prefetch. */
export async function mergeSalesforceIdsIntoPrefetch(
  prefetch: ProductgroupImportPrefetch,
  salesforceIds: string[]
): Promise<number> {
  const missing = [
    ...new Set(salesforceIds.map((id) => id.trim()).filter(Boolean)),
  ].filter((id) => !prefetch.groupsById.has(id))
  if (!missing.length) return 0

  const extraGroups = await fetchGroupsByIds(missing)
  for (const group of extraGroups) {
    const id = group.Id?.trim()
    if (!id) continue
    prefetch.groupsById.set(id, group)
    prefetch.groups.push(group)
    const linkedId = linkedOnlineProductgroupId(group)
    if (linkedId) prefetch.linkedOnlineSlaveIds.add(linkedId)
  }

  const extraChildren = await queryChildrenByGroupIds(missing)
  for (const [id, rows] of extraChildren) {
    prefetch.childrenByGroupId.set(id, rows)
  }

  return extraGroups.length
}

export function linkedRecordsForGroup(
  prefetch: ProductgroupImportPrefetch,
  group: SfProductgroupShape
): {
  children: SfCourseProductShape[]
  linkedGroupRecord: SfProductgroupShape | null
  linkedChildRecords: SfCourseProductShape[]
} {
  const groupId = group.Id?.trim() ?? ""
  const children = prefetch.childrenByGroupId.get(groupId) ?? []
  const linkedId = linkedOnlineProductgroupId(group)
  const linkedGroupRecord = linkedId ? prefetch.groupsById.get(linkedId) ?? null : null
  const linkedChildRecords = linkedId ? prefetch.childrenByGroupId.get(linkedId) ?? [] : []

  return { children, linkedGroupRecord, linkedChildRecords }
}
