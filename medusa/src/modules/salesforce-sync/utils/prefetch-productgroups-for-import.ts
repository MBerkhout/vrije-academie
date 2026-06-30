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
import { linkedOnlineProductgroupId } from "./linked-online-productgroup"
import { chunkArray, queryAllSalesforce } from "./query-all-salesforce"

const SOQL_IN_CHUNK = 200

export type ProductgroupImportPrefetch = {
  groups: SfProductgroupShape[]
  groupsById: Map<string, SfProductgroupShape>
  linkedOnlineSlaveIds: Set<string>
  childrenByGroupId: Map<string, SfCourseProductShape[]>
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

/** Bulk-fetch product groups, children, and linked-online slave ids for import scripts. */
export async function prefetchProductgroupsForImport(): Promise<ProductgroupImportPrefetch> {
  const groupFields = productgroupSalesforceFieldsForPull.join(",")
  const groups = await queryAllSalesforce<SfProductgroupShape>(
    `SELECT ${groupFields} FROM ${SF_PRODUCTGROUP_OBJECT} ORDER BY Name`
  )

  const groupsById = new Map<string, SfProductgroupShape>()
  const linkedOnlineSlaveIds = new Set<string>()

  for (const group of groups) {
    const id = group.Id?.trim()
    if (!id) continue
    groupsById.set(id, group)
    const linkedId = linkedOnlineProductgroupId(group)
    if (linkedId) linkedOnlineSlaveIds.add(linkedId)
  }

  const groupIds = [...groupsById.keys()]
  const childrenByGroupId = await queryChildrenByGroupIds(groupIds)

  return {
    groups,
    groupsById,
    linkedOnlineSlaveIds,
    childrenByGroupId,
  }
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
