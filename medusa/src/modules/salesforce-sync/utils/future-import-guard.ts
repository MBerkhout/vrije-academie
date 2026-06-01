import type { SfCourseProductShape } from "../mappings/course-product"
import type { SfProductgroupShape } from "../mappings/productgroup"
import { isVathuisRecordType } from "../clients/audience-player"

export type FutureImportGuardInput = {
  group: SfProductgroupShape
  children: SfCourseProductShape[]
  manual?: boolean
}

/** Skip auto-import when all occurrence dates are in the past. Manual imports always run. */
export function shouldImportProductgroup(input: FutureImportGuardInput): boolean {
  if (input.manual) return true

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

/** Bulk CLI: import future groups, VAthuis on-demand, or online-only occurrences. */
export function shouldBulkImportProductgroup(input: FutureImportGuardInput): boolean {
  if (shouldImportProductgroup({ ...input, manual: false })) return true

  if (isVathuisRecordType(input.group.Productgroup_Record_Type_Developer_Name__c)) {
    return true
  }

  if (
    input.children.length > 0 &&
    input.children.every((c) => !c.Product_City__c?.trim())
  ) {
    return true
  }

  return false
}
