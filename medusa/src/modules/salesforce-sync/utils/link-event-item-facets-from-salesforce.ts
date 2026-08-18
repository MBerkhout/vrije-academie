import type { MedusaContainer } from "@medusajs/framework/types"

import { resolveOrCreateCity } from "../../../lib/resolve-city"
import { resolveOrCreateLocation } from "../../../lib/resolve-location"
import CatalogModuleService from "../../catalog/service"
import type { SfCourseProductShape } from "../mappings/course-product"
import { inferDeliveryType, isOnlineCityLabel } from "../mappings/course-product"
import type { SfProductgroupShape } from "../mappings/productgroup"
import SalesforceSyncModuleService from "../service"
import { fetchTeacherAccountProfile } from "./fetch-teacher-account"
import type { BulkImportContext } from "./import-context"
import {
  ensureDocentFromSalesforceTeacher,
  resolveInstructorFromChild,
} from "./link-docent-from-salesforce"

type SfLocationAccountRelation = {
  Id?: string
  Name?: string
}

export type EventItemFacetIds = {
  catalog_city_id: string | null
  catalog_location_id: string | null
  docent_id: string | null
}

function resolveLocationNameFromChild(child: SfCourseProductShape): string | null {
  const explicit = child.Product_Location_Name__c?.trim()
  if (explicit) return explicit

  const accountRelation = (child as Record<string, unknown>).Account__r as
    | SfLocationAccountRelation
    | undefined
  return accountRelation?.Name?.trim() || null
}

/**
 * Resolve linked city, location, and docent ids for an event item from Salesforce child fields.
 */
export async function resolveEventItemFacetIdsFromSalesforce(
  container: MedusaContainer,
  child: SfCourseProductShape,
  group: SfProductgroupShape,
  groupRecordType?: string | null,
  importContext?: BulkImportContext
): Promise<EventItemFacetIds> {
  const catalog = container.resolve("catalog") as InstanceType<typeof CatalogModuleService>
  const sync = container.resolve("salesforceSync") as InstanceType<
    typeof SalesforceSyncModuleService
  >

  const delivery = inferDeliveryType(child, groupRecordType)
  const isOffline = delivery === "offline"
  const cityLabel = child.Product_City__c?.trim() || null

  let catalogCityId: string | null = null
  let citySlug: string | null = null

  if (isOffline && cityLabel && !isOnlineCityLabel(cityLabel)) {
    const city = await resolveOrCreateCity(catalog, cityLabel)
    catalogCityId = city?.id ?? null
    citySlug = city?.slug ?? null
  }

  let catalogLocationId: string | null = null
  const locationName = resolveLocationNameFromChild(child)
  const salesforceAccountId = child.Account__c?.trim() || null

  if (isOffline && (locationName || salesforceAccountId)) {
    const location = await resolveOrCreateLocation(catalog, {
      name: locationName ?? cityLabel ?? "Locatie",
      citySlug,
      roomName: child.Product_Location_Room_Name__c?.trim() || null,
      salesforceAccountId,
      salesforceRoomId: child.Product_Location_Room__c?.trim() || null,
    })
    catalogLocationId = location?.id ?? null
  }

  let docentId: string | null = null
  const instructor = resolveInstructorFromChild(group, child)
  if (instructor.salesforceId && instructor.name) {
    const account = importContext
      ? await importContext.getTeacherProfile(sync, instructor.salesforceId)
      : await fetchTeacherAccountProfile(sync, instructor.salesforceId)

    docentId = await ensureDocentFromSalesforceTeacher(
      container,
      sync,
      {
        salesforceId: instructor.salesforceId,
        name: account?.name ?? instructor.name,
        bio: account?.bio ?? null,
        photoUrl: account?.photoUrl ?? null,
        role: account?.role ?? "Docent",
      },
      importContext
    )

    if (docentId && importContext?.skipSanitySync) {
      importContext.trackDocent(docentId)
    }
  }

  return {
    catalog_city_id: catalogCityId,
    catalog_location_id: catalogLocationId,
    docent_id: docentId,
  }
}
