import { isSalesforceVisibleOnWebsite } from "../../../lib/salesforce-visible-on-website"
import type { SfCourseProductShape } from "../mappings/course-product"
import type { SfProductgroupShape } from "../mappings/productgroup"

function childVisibleOnWebsiteFlag(child: SfCourseProductShape): unknown {
  if ("Visible_On_Website__c" in child) return child.Visible_On_Website__c
  return (child as { Visible_on_website__c?: boolean | null }).Visible_on_website__c
}

export function isCourseProductVisibleOnWebsite(child: SfCourseProductShape): boolean {
  return isSalesforceVisibleOnWebsite(childVisibleOnWebsiteFlag(child))
}

/**
 * Import the group when the product-group checkbox is not unchecked, and at least
 * one child is visible (or there are no children yet).
 */
export function isProductgroupVisibleOnWebsite(
  group: SfProductgroupShape,
  children: SfCourseProductShape[]
): boolean {
  if (!isSalesforceVisibleOnWebsite(group.Visible_on_website__c)) return false

  const withId = children.filter((child) => child.Id)
  if (!withId.length) return true
  return withId.some(isCourseProductVisibleOnWebsite)
}
