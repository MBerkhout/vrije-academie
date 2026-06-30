import type { SfCourseProductShape } from "../mappings/course-product"
import type { SfProductgroupShape } from "../mappings/productgroup"
import { SF_PRODUCTGROUP_OBJECT } from "../mappings/productgroup"
import type SalesforceSyncModuleService from "../service"

export type ProductgroupChildImportRow = {
  child: SfCourseProductShape
  groupRecordType: string | null | undefined
}

/** Merge direct + linked online children; direct rows win on duplicate SF Ids. */
export function mergeProductgroupChildRows(
  direct: SfCourseProductShape[],
  directRecordType: string | null | undefined,
  linked: SfCourseProductShape[],
  linkedRecordType: string | null | undefined
): ProductgroupChildImportRow[] {
  const seen = new Set<string>()
  const rows: ProductgroupChildImportRow[] = []

  for (const child of direct) {
    const id = child.Id?.trim()
    if (!id || seen.has(id)) continue
    seen.add(id)
    rows.push({ child, groupRecordType: directRecordType })
  }

  for (const child of linked) {
    const id = child.Id?.trim()
    if (!id || seen.has(id)) continue
    seen.add(id)
    rows.push({ child, groupRecordType: linkedRecordType })
  }

  return rows
}

/** Medusa SKU for a child variant; slave catalogs use a distinct prefix to avoid parent merge collisions. */
export function variantSkuForChild(
  childSfId: string,
  opts: { isLinkedOnlineSlave: boolean }
): string {
  return opts.isLinkedOnlineSlave ? `sf-slave-${childSfId}` : `sf-${childSfId}`
}

/** Sync-state key for a child variant; slave rows are namespaced per product group. */
export function variantSyncSalesforceId(
  childSfId: string,
  productgroupSfId: string,
  opts: { isLinkedOnlineSlave: boolean }
): string {
  return opts.isLinkedOnlineSlave
    ? `slave:${productgroupSfId}:${childSfId}`
    : childSfId
}

export function linkedOnlineProductgroupId(
  group: SfProductgroupShape
): string | null {
  const raw = group.Linked_Online_Productgroup__c?.trim()
  return raw || null
}

/** Parent product groups that reference this id as their linked online catalog. */
export async function findParentProductgroupIdsForLinkedOnlineSlave(
  sync: InstanceType<typeof SalesforceSyncModuleService>,
  slaveSalesforceId: string
): Promise<string[]> {
  const escaped = slaveSalesforceId.replace(/'/g, "\\'")
  const q = await sync.query<{ Id?: string }>(
    `SELECT Id FROM ${SF_PRODUCTGROUP_OBJECT} WHERE Linked_Online_Productgroup__c = '${escaped}'`
  )
  return (q.records ?? [])
    .map((r) => r.Id?.trim())
    .filter((id): id is string => !!id)
}
