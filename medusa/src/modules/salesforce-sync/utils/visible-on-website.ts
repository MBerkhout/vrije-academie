import {
  isSalesforceExterneVerhuur,
  isSalesforceVisibleOnWebsite,
} from "../../../lib/salesforce-visible-on-website"
import type { SfCourseProductShape } from "../mappings/course-product"
import type { SfProductgroupShape } from "../mappings/productgroup"

export { isSalesforceExterneVerhuur } from "../../../lib/salesforce-visible-on-website"

function childVisibleOnWebsiteFlag(child: SfCourseProductShape): unknown {
  if ("Visible_On_Website__c" in child) return child.Visible_On_Website__c
  return (child as { Visible_on_website__c?: boolean | null }).Visible_on_website__c
}

export function courseProductRecordTypeDeveloperName(
  child: SfCourseProductShape
): string | null {
  return child.RecordType?.DeveloperName?.trim() || null
}

export function isCourseProductVisibleOnWebsite(child: SfCourseProductShape): boolean {
  if (
    isSalesforceExterneVerhuur(
      courseProductRecordTypeDeveloperName(child),
      child.RecordType?.Name,
      child.Name
    )
  ) {
    return false
  }
  return isSalesforceVisibleOnWebsite(childVisibleOnWebsiteFlag(child))
}

/**
 * Import the group when the product-group checkbox is not unchecked and it is
 * not an Externe verhuur catalog. Hidden children do not hide the group.
 */
export function isProductgroupVisibleOnWebsite(group: SfProductgroupShape): boolean {
  if (
    isSalesforceExterneVerhuur(
      group.Productgroup_Record_Type_Developer_Name__c,
      group.Name
    )
  ) {
    return false
  }
  return isSalesforceVisibleOnWebsite(group.Visible_on_website__c)
}
