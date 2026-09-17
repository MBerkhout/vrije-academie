import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"

import { SF_COURSE_PRODUCT_OBJECT } from "../mappings/course-product"
import { SF_PRODUCTGROUP_OBJECT } from "../mappings/productgroup"
import { sfRequest } from "../client/rest"
import SalesforceSyncModuleService from "../service"
import { childSalesforceIdFromVariantSyncKey } from "./linked-online-productgroup"
import {
  PRODUCT_EXTERNAL_ID_FIELD,
  PRODUCT_GROUP_ID_FIELD,
  VARIANT_EXTERNAL_ID_FIELD,
} from "./medusa-custom-fields-spec"

const COMPOSITE_CHUNK = 200
const LIST_PAGE = 1000

export type MedusaIdBackfillLogger = {
  info: (msg: string) => void
  warn: (msg: string) => void
  error: (msg: string) => void
}

export type SalesforceIdPatch = {
  objectApiName: string
  salesforceId: string
  fields: Record<string, unknown>
}

export type CompositeSaveResult = {
  id?: string
  success: boolean
  errors?: Array<{ message?: string; statusCode?: string }>
}

export function isSalesforceIdMissingFieldError(message: string): boolean {
  return /INVALID_FIELD|No such column|Didn't understand/i.test(message)
}

export async function compositePatchSalesforceRecords(
  patches: SalesforceIdPatch[]
): Promise<CompositeSaveResult[]> {
  if (!patches.length) return []
  const { data } = await sfRequest<CompositeSaveResult[]>("PATCH", "/composite/sobjects", {
    body: {
      allOrNone: false,
      records: patches.map((p) => ({
        attributes: { type: p.objectApiName },
        Id: p.salesforceId,
        ...p.fields,
      })),
    },
  })
  return Array.isArray(data) ? data : []
}

async function listAllSyncStates(
  sync: InstanceType<typeof SalesforceSyncModuleService>,
  entityType: string
) {
  const rows: Array<{ medusa_id: string; salesforce_id: string | null }> = []
  let skip = 0
  while (true) {
    const page = await sync.listSalesforceSyncStates(
      { entity_type: entityType },
      { take: LIST_PAGE, skip }
    )
    rows.push(...page)
    if (page.length < LIST_PAGE) break
    skip += LIST_PAGE
  }
  return rows
}

function firstUniqueBySalesforceId(patches: SalesforceIdPatch[]): SalesforceIdPatch[] {
  const seen = new Set<string>()
  const out: SalesforceIdPatch[] = []
  for (const patch of patches) {
    if (seen.has(patch.salesforceId)) continue
    seen.add(patch.salesforceId)
    out.push(patch)
  }
  return out
}

export async function collectProductgroupMedusaIdPatches(
  sync: InstanceType<typeof SalesforceSyncModuleService>
): Promise<SalesforceIdPatch[]> {
  const states = await listAllSyncStates(sync, "productgroup")
  return firstUniqueBySalesforceId(
    states
      .filter((row) => row.medusa_id && childSalesforceIdFromVariantSyncKey(row.salesforce_id))
      .map((row) => ({
        objectApiName: SF_PRODUCTGROUP_OBJECT,
        salesforceId: row.salesforce_id!.trim(),
        fields: { [PRODUCT_EXTERNAL_ID_FIELD]: row.medusa_id },
      }))
  )
}

export async function collectVariantMedusaIdPatches(
  container: MedusaContainer,
  sync: InstanceType<typeof SalesforceSyncModuleService>
): Promise<SalesforceIdPatch[]> {
  const states = await listAllSyncStates(sync, "variant")
  const usable = states
    .map((row) => {
      const salesforceId = childSalesforceIdFromVariantSyncKey(row.salesforce_id)
      if (!salesforceId || !row.medusa_id) return null
      return { medusaId: row.medusa_id, salesforceId }
    })
    .filter((row): row is { medusaId: string; salesforceId: string } => !!row)

  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const parentByVariant = new Map<string, string>()
  for (let i = 0; i < usable.length; i += LIST_PAGE) {
    const chunk = usable.slice(i, i + LIST_PAGE)
    const { data: variants } = await query.graph({
      entity: "product_variant",
      fields: ["id", "product_id"],
      filters: { id: chunk.map((row) => row.medusaId) },
    })
    for (const variant of variants ?? []) {
      const id = typeof variant.id === "string" ? variant.id : null
      const productId = typeof variant.product_id === "string" ? variant.product_id : null
      if (id && productId) parentByVariant.set(id, productId)
    }
  }

  return firstUniqueBySalesforceId(
    usable.map((row) => ({
      objectApiName: SF_COURSE_PRODUCT_OBJECT,
      salesforceId: row.salesforceId,
      fields: {
        [VARIANT_EXTERNAL_ID_FIELD]: row.medusaId,
        ...(parentByVariant.get(row.medusaId)
          ? { [PRODUCT_GROUP_ID_FIELD]: parentByVariant.get(row.medusaId) }
          : {}),
      },
    }))
  )
}

export async function applyMedusaIdPatches(
  patches: SalesforceIdPatch[],
  logger: MedusaIdBackfillLogger,
  opts?: { dryRun?: boolean }
): Promise<{ ok: number; failed: number }> {
  if (opts?.dryRun) {
    logger.info(`[salesforce-ids] Dry run — would patch ${patches.length} records`)
    return { ok: 0, failed: 0 }
  }

  let ok = 0
  let failed = 0
  for (let i = 0; i < patches.length; i += COMPOSITE_CHUNK) {
    const chunk = patches.slice(i, i + COMPOSITE_CHUNK)
    let results: CompositeSaveResult[]
    try {
      results = await compositePatchSalesforceRecords(chunk)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (isSalesforceIdMissingFieldError(message)) {
        throw new Error(
          `${message} — re-run npm run salesforce:create-fields so vaProductgroup__c / vaProduct__c have Medusa_* fields`
        )
      }
      throw err
    }
    results.forEach((result, index) => {
      if (result.success) {
        ok++
        return
      }
      failed++
      const patch = chunk[index]
      const error = result.errors?.map((e) => e.message).filter(Boolean).join("; ") || "unknown error"
      logger.warn(
        `[salesforce-ids] failed ${patch?.objectApiName} ${patch?.salesforceId}: ${error}`
      )
    })
    logger.info(`[salesforce-ids] patched ${Math.min(i + chunk.length, patches.length)}/${patches.length}`)
  }
  return { ok, failed }
}

export async function backfillMedusaIdsToSalesforce(
  container: MedusaContainer,
  logger: MedusaIdBackfillLogger,
  opts?: { dryRun?: boolean }
): Promise<{ groups: number; variants: number; ok: number; failed: number }> {
  const sync = container.resolve("salesforceSync") as InstanceType<typeof SalesforceSyncModuleService>
  const groupPatches = await collectProductgroupMedusaIdPatches(sync)
  const variantPatches = await collectVariantMedusaIdPatches(container, sync)
  logger.info(
    `[salesforce-ids] ${groupPatches.length} product groups, ${variantPatches.length} sessions to patch`
  )
  const applied = await applyMedusaIdPatches([...groupPatches, ...variantPatches], logger, opts)
  return {
    groups: groupPatches.length,
    variants: variantPatches.length,
    ok: applied.ok,
    failed: applied.failed,
  }
}

/** Write Medusa ids onto the Salesforce rows this import just linked (no-op if fields are missing). */
export async function writeImportedProductgroupMedusaIds(input: {
  sync: InstanceType<typeof SalesforceSyncModuleService>
  logger: MedusaIdBackfillLogger
  productgroupSalesforceId: string
  productId: string
  variants: Array<{ salesforceId: string; medusaId: string }>
}): Promise<void> {
  const patches: SalesforceIdPatch[] = [
    {
      objectApiName: SF_PRODUCTGROUP_OBJECT,
      salesforceId: input.productgroupSalesforceId,
      fields: { [PRODUCT_EXTERNAL_ID_FIELD]: input.productId },
    },
    ...firstUniqueBySalesforceId(
      input.variants
        .map((row) => {
          const salesforceId = childSalesforceIdFromVariantSyncKey(row.salesforceId) ?? row.salesforceId
          if (!childSalesforceIdFromVariantSyncKey(salesforceId)) return null
          return {
            objectApiName: SF_COURSE_PRODUCT_OBJECT,
            salesforceId,
            fields: {
              [VARIANT_EXTERNAL_ID_FIELD]: row.medusaId,
              [PRODUCT_GROUP_ID_FIELD]: input.productId,
            },
          } satisfies SalesforceIdPatch
        })
        .filter((row): row is SalesforceIdPatch => !!row)
    ),
  ]
  try {
    await applyMedusaIdPatches(patches, input.logger)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (isSalesforceIdMissingFieldError(message)) {
      input.logger.warn(`[salesforce-ids] skipped write-back (Medusa_* fields missing on product group): ${message}`)
      return
    }
    input.logger.warn(`[salesforce-ids] write-back failed: ${message}`)
  }
}
