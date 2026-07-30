import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

import CatalogModuleService from "../../catalog/service"
import { productTypeValueFromSalesforce, SF_PRODUCTGROUP_OBJECT } from "../mappings/productgroup"
import SalesforceSyncModuleService from "../service"
import {
  fetchTeacherAccountProfile,
  type TeacherAccountProfile,
} from "./fetch-teacher-account"
import { queryAllSalesforce } from "./query-all-salesforce"
import { resolveDefaultSalesChannelId } from "./resolve-default-sales-channel-id"

const ENTITY_PRODUCTGROUP = "productgroup"

type CatalogCategory = Awaited<
  ReturnType<InstanceType<typeof CatalogModuleService>["listCategories"]>
>[number]

type NativeCategoryRow = {
  id?: string
  name?: string | null
  handle?: string
}

async function resolveDefaultShippingProfileId(container: MedusaContainer): Promise<string> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY) as {
    graph: (opts: { entity: string; fields: string[] }) => Promise<{ data?: { id?: string }[] }>
  }
  const { data: profiles } = await query.graph({
    entity: "shipping_profile",
    fields: ["id"],
  })
  const id = profiles?.[0]?.id
  if (!id) {
    throw new Error(
      "No shipping profile found. Create a default shipping profile in Medusa Admin before importing product groups."
    )
  }
  return id
}

/**
 * Shared caches and coordination for one bulk import run.
 * Avoids repeated DB/SF lookups and serializes docent link mutations per product.
 */
export class BulkImportContext {
  private shippingProfileId?: string
  private salesChannelId?: string
  private catalogCategories?: CatalogCategory[]
  private nativeCategories?: NativeCategoryRow[]
  private productTypeIds = new Map<string, string | null>()
  private teacherProfiles = new Map<string, TeacherAccountProfile | null>()
  private linkedOnlineParentIdsBySlave = new Map<string, string[]>()
  private productgroupStateBySfId = new Map<
    string,
    { mapping_version?: string | null; medusa_id?: string }
  >()
  private variantStateBySfId = new Map<string, { medusa_id?: string }>()
  private salesChannelLinkedProductIds = new Set<string>()
  private docentLinkChains = new Map<string, Promise<unknown>>()

  readonly pendingCatalogCategoryIds = new Set<string>()
  readonly pendingNativeCategoryIds = new Set<string>()
  readonly pendingDocentIds = new Set<string>()

  constructor(
    readonly skipSanitySync = false,
    readonly skipUnchanged = false
  ) {}

  static async create(
    container: MedusaContainer,
    sync: InstanceType<typeof SalesforceSyncModuleService>,
    options: {
      skipSanitySync?: boolean
      skipUnchanged?: boolean
      linkedOnlineParentIdsBySlave?: Map<string, string[]>
    } = {}
  ): Promise<BulkImportContext> {
    const ctx = new BulkImportContext(!!options.skipSanitySync, !!options.skipUnchanged)
    if (options.linkedOnlineParentIdsBySlave) {
      ctx.linkedOnlineParentIdsBySlave = options.linkedOnlineParentIdsBySlave
    }

    const states = await sync.listSalesforceSyncStates({ entity_type: ENTITY_PRODUCTGROUP })
    for (const row of states) {
      if (row.salesforce_id) {
        ctx.productgroupStateBySfId.set(row.salesforce_id, {
          mapping_version: row.mapping_version,
          medusa_id: row.medusa_id,
        })
      }
    }

    return ctx
  }

  getProductgroupState(salesforceId: string) {
    return this.productgroupStateBySfId.get(salesforceId) ?? null
  }

  getVariantMedusaId(variantSyncKey: string): string | null {
    return this.variantStateBySfId.get(variantSyncKey)?.medusa_id ?? null
  }

  setProductgroupFingerprint(salesforceId: string, fingerprint: string, medusaId: string): void {
    this.productgroupStateBySfId.set(salesforceId, {
      mapping_version: fingerprint,
      medusa_id: medusaId,
    })
  }

  setVariantMedusaId(variantSyncKey: string, medusaId: string): void {
    this.variantStateBySfId.set(variantSyncKey, { medusa_id: medusaId })
  }

  getLinkedOnlineParentIds(slaveSalesforceId: string): string[] {
    return this.linkedOnlineParentIdsBySlave.get(slaveSalesforceId) ?? []
  }

  async getShippingProfileId(container: MedusaContainer): Promise<string> {
    if (!this.shippingProfileId) {
      this.shippingProfileId = await resolveDefaultShippingProfileId(container)
    }
    return this.shippingProfileId
  }

  async getSalesChannelId(container: MedusaContainer): Promise<string> {
    if (!this.salesChannelId) {
      this.salesChannelId = await resolveDefaultSalesChannelId(container)
    }
    return this.salesChannelId
  }

  isProductLinkedToSalesChannel(productId: string): boolean {
    return this.salesChannelLinkedProductIds.has(productId)
  }

  markProductLinkedToSalesChannel(productId: string): void {
    this.salesChannelLinkedProductIds.add(productId)
  }

  async getProductTypeId(
    container: MedusaContainer,
    recordTypeDeveloperName: string | null | undefined
  ): Promise<string | null> {
    const value = productTypeValueFromSalesforce(recordTypeDeveloperName)
    if (this.productTypeIds.has(value)) {
      return this.productTypeIds.get(value) ?? null
    }
    const productModule = container.resolve(Modules.PRODUCT) as {
      listProductTypes: (f: { value: string }) => Promise<{ id?: string }[]>
      createProductTypes: (d: { value: string }) => Promise<{ id?: string } | { id?: string }[]>
    }
    const existing = await productModule.listProductTypes({ value })
    if (existing[0]?.id) {
      this.productTypeIds.set(value, existing[0].id)
      return existing[0].id
    }
    const created = await productModule.createProductTypes({ value })
    const row = Array.isArray(created) ? created[0] : created
    const id = row?.id ?? null
    this.productTypeIds.set(value, id)
    return id
  }

  async getCatalogCategories(
    catalog: InstanceType<typeof CatalogModuleService>
  ): Promise<CatalogCategory[]> {
    if (!this.catalogCategories) {
      this.catalogCategories = await catalog.listCategories({}, { take: 1000 })
    }
    return this.catalogCategories
  }

  addCatalogCategory(category: CatalogCategory): void {
    if (!this.catalogCategories) {
      this.catalogCategories = [category]
      return
    }
    if (!this.catalogCategories.some((c) => c.id === category.id)) {
      this.catalogCategories.push(category)
    }
  }

  async getNativeCategories(container: MedusaContainer): Promise<NativeCategoryRow[]> {
    if (!this.nativeCategories) {
      const productModule = container.resolve(Modules.PRODUCT) as {
        listProductCategories: (
          f: Record<string, unknown>,
          o?: { take?: number }
        ) => Promise<NativeCategoryRow[]>
      }
      this.nativeCategories = await productModule.listProductCategories({}, { take: 1000 })
    }
    return this.nativeCategories
  }

  addNativeCategory(category: NativeCategoryRow): void {
    if (!category.id) return
    if (!this.nativeCategories) {
      this.nativeCategories = [category]
      return
    }
    if (!this.nativeCategories.some((c) => c.id === category.id)) {
      this.nativeCategories.push(category)
    }
  }

  async getTeacherProfile(
    sync: InstanceType<typeof SalesforceSyncModuleService>,
    accountId: string
  ): Promise<TeacherAccountProfile | null> {
    const id = accountId.trim()
    if (!id) return null
    if (this.teacherProfiles.has(id)) {
      return this.teacherProfiles.get(id) ?? null
    }
    const profile = await fetchTeacherAccountProfile(sync, id)
    this.teacherProfiles.set(id, profile)
    return profile
  }

  trackCatalogCategory(categoryId: string): void {
    if (this.skipSanitySync) {
      this.pendingCatalogCategoryIds.add(categoryId)
    }
  }

  trackNativeCategory(categoryId: string): void {
    if (this.skipSanitySync) {
      this.pendingNativeCategoryIds.add(categoryId)
    }
  }

  trackDocent(docentId: string): void {
    if (this.skipSanitySync) {
      this.pendingDocentIds.add(docentId)
    }
  }

  /** Serialize docent link mutations per product (avoids concurrent link.create races). */
  async withDocentLinkLock<T>(productId: string, fn: () => Promise<T>): Promise<T> {
    const prev = this.docentLinkChains.get(productId) ?? Promise.resolve()
    const run = prev.then(fn)
    this.docentLinkChains.set(
      productId,
      run.catch(() => undefined)
    )
    return run
  }
}

/** Bulk-fetch parent group ids for each linked-online slave catalog. */
export async function prefetchLinkedOnlineParentIdsBySlave(): Promise<Map<string, string[]>> {
  const rows = await queryAllSalesforce<{ Id?: string; Linked_Online_Productgroup__c?: string }>(
    `SELECT Id, Linked_Online_Productgroup__c FROM ${SF_PRODUCTGROUP_OBJECT} WHERE Linked_Online_Productgroup__c != null`
  )

  const map = new Map<string, string[]>()
  for (const row of rows) {
    const slaveId = row.Linked_Online_Productgroup__c?.trim()
    const parentId = row.Id?.trim()
    if (!slaveId || !parentId) continue
    const list = map.get(slaveId) ?? []
    list.push(parentId)
    map.set(slaveId, list)
  }
  return map
}

export function parseSinceArg(raw: string | undefined): Date | null {
  if (!raw?.trim()) return null
  const d = new Date(raw.trim())
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Invalid --since date: ${raw}`)
  }
  return d
}

export function formatSoqlDateTime(date: Date): string {
  return date.toISOString()
}
