import { isFutureSession } from "../../../lib/event-session-eligibility"
import { isOnlineCityLabel } from "../mappings/course-product"
import type { SfCourseProductShape } from "../mappings/course-product"

export function isOnlineLikeSalesforceChild(child: SfCourseProductShape): boolean {
  const city = child.Product_City__c?.trim()
  return !city || isOnlineCityLabel(city)
}

/** True when there is at least one future bookable session and every future session is online-like. */
export function onlyOnlineFutureSessionsRemain(
  children: SfCourseProductShape[],
  now: Date = new Date()
): boolean {
  if (!children.length) return false
  const nowMs = now.getTime()
  const future = children.filter((child) => {
    const start = child.Start_date_time__c
    if (!start) return isOnlineLikeSalesforceChild(child)
    return isFutureSession({ start_at: start }, nowMs)
  })
  if (!future.length) return false
  return future.every(isOnlineLikeSalesforceChild)
}
