import { isOnlineCityLabel } from "../mappings/course-product"
import type { SfCourseProductShape } from "../mappings/course-product"
import type { SfProductgroupShape } from "../mappings/productgroup"
import { isVathuisRecordType } from "../clients/audience-player"
import { linkedOnlineProductgroupId } from "./linked-online-productgroup"

export type FutureImportGuardInput = {
  group: SfProductgroupShape
  children: SfCourseProductShape[]
  manual?: boolean
  /** Referenced as `Linked_Online_Productgroup__c` on another parent group. */
  isLinkedOnlineSlave?: boolean
}

/** Skip auto-import when all occurrence dates are in the past. Manual imports always run. */
export function shouldImportProductgroup(input: FutureImportGuardInput): boolean {
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
  if (isVathuisRecordType(input.group.Productgroup_Record_Type_Developer_Name__c)) return true
  if (input.isLinkedOnlineSlave) return true
  if (linkedOnlineProductgroupId(input.group)) return true
  return false
}
