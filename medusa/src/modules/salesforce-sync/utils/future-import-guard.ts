import { isOnlineCityLabel } from "../mappings/course-product"
import type { SfCourseProductShape } from "../mappings/course-product"
import type { SfProductgroupShape } from "../mappings/productgroup"
import { isVathuisRecordType } from "../clients/audience-player"
import { linkedOnlineProductgroupId } from "./linked-online-productgroup"
import { isProductgroupVisibleOnWebsite } from "./visible-on-website"

export type FutureImportGuardInput = {
  group: SfProductgroupShape
  children: SfCourseProductShape[]
  manual?: boolean
  /** Referenced as `Linked_Online_Productgroup__c` on another parent group. */
  isLinkedOnlineSlave?: boolean
}

/** Skip auto-import when the group is hidden on the website or all occurrence dates are in the past. Manual imports ignore the date guard, not visibility. */
export function shouldImportProductgroup(input: FutureImportGuardInput): boolean {
  if (!isProductgroupVisibleOnWebsite(input.group)) return false

  if (input.manual) return true

  if (isVathuisRecordType(input.group.Productgroup_Record_Type_Developer_Name__c)) {
    return true
  }

  const now = Date.now()

  if (input.group.Latest_Product_Start_Date__c) {
    return new Date(input.group.Latest_Product_Start_Date__c).getTime() >= now
  }

  const childStarts = input.children
    .map((c) => c.Start_date_time__c)
    .filter(Boolean)
    .map((d) => new Date(d as string).getTime())

  if (!childStarts.length) return false
  return Math.max(...childStarts) >= now
}

function isOnlineOnlyProductgroup(children: SfCourseProductShape[]): boolean {
  return (
    children.length > 0 &&
    children.every((c) => !c.Product_City__c?.trim() || isOnlineCityLabel(c.Product_City__c))
  )
}

/** Bulk CLI: import future groups, VAthuis on-demand, linked-online parents/slaves, or online-only. */
export function shouldBulkImportProductgroup(input: FutureImportGuardInput): boolean {
  if (!isProductgroupVisibleOnWebsite(input.group)) return false

  if (shouldImportProductgroup({ ...input, manual: false })) return true

  if (isVathuisRecordType(input.group.Productgroup_Record_Type_Developer_Name__c)) {
    return true
  }

  if (input.isLinkedOnlineSlave) return true

  if (linkedOnlineProductgroupId(input.group)) return true

  if (isOnlineOnlyProductgroup(input.children)) return true

  return false
}

/** Targeted backfill: VAthuis + linked-online parents and slave catalogs only. */
export function shouldLinkedVathuisBulkImport(input: FutureImportGuardInput): boolean {
  if (!isProductgroupVisibleOnWebsite(input.group)) return false
  return isLinkedVathuisBulkScope(input)
}

function isLinkedVathuisBulkScope(input: FutureImportGuardInput): boolean {
  if (isVathuisRecordType(input.group.Productgroup_Record_Type_Developer_Name__c)) return true
  if (input.isLinkedOnlineSlave) return true
  if (linkedOnlineProductgroupId(input.group)) return true
  return false
}

/**
 * Bulk CLI enqueue: import visible groups per the usual guards, and still process
 * already-imported hidden groups so they can be drafted off the storefront.
 */
export function shouldEnqueueBulkProductgroup(
  input: FutureImportGuardInput,
  options: {
    importAll?: boolean
    linkedVathuisOnly?: boolean
    alreadyImported?: boolean
  } = {}
): boolean {
  const visible = isProductgroupVisibleOnWebsite(input.group)
  if (!visible) {
    if (!options.alreadyImported) return false
    if (options.linkedVathuisOnly) return isLinkedVathuisBulkScope(input)
    return true
  }

  if (options.importAll) return true
  if (options.linkedVathuisOnly) return shouldLinkedVathuisBulkImport(input)
  return shouldBulkImportProductgroup(input)
}
