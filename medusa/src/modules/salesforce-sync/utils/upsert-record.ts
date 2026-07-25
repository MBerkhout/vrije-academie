import type SalesforceSyncModuleService from "../service"
import {
  SALESFORCE_DISCOUNT_PRODUCT2_ID,
  SF_ORDER_ITEM_OBJECT,
  SF_REGISTRATION_OBJECT,
} from "./salesforce-config"
import {
  stripMedusaCustomFields,
  usesSalesforceMedusaCustomFields,
} from "./salesforce-medusa-fields"

function escapeSoql(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'")
}

/** Upsert by external id; returns Salesforce record Id. */
export async function upsertSalesforceRecord(
  sync: InstanceType<typeof SalesforceSyncModuleService>,
  sobject: string,
  externalIdField: string,
  externalId: string,
  fields: Record<string, unknown>
): Promise<string> {
  const cleanFields = stripMedusaCustomFields(fields)
  if (!usesSalesforceMedusaCustomFields()) {
    const { id } = await sync.createRecord(sobject, cleanFields)
    return id
  }
  const { id } = await sync.upsertByExternalId(sobject, externalIdField, externalId, cleanFields)
  return id
}

/** Create or patch when we already know the Salesforce Id (no external id field on object). */
export async function upsertSalesforceRecordById(
  sync: InstanceType<typeof SalesforceSyncModuleService>,
  sobject: string,
  salesforceId: string | null | undefined,
  externalIdField: string,
  externalId: string,
  fields: Record<string, unknown>
): Promise<string> {
  const cleanFields = stripMedusaCustomFields(fields)
  if (salesforceId) {
    let patchFields = cleanFields
    if (sobject === SF_ORDER_ITEM_OBJECT && !usesSalesforceMedusaCustomFields()) {
      patchFields = Object.fromEntries(
        Object.entries(cleanFields).filter(([key]) =>
          ["UnitPrice", "Quantity", "Registration__c", "vaProduct__c"].includes(key)
        )
      )
    }
    await sync.updateRecord(sobject, salesforceId, patchFields)
    return salesforceId
  }
  if (!usesSalesforceMedusaCustomFields()) {
    const { id } = await sync.createRecord(sobject, cleanFields)
    return id
  }
  try {
    return await upsertSalesforceRecord(sync, sobject, externalIdField, externalId, cleanFields)
  } catch (err) {
    const msg = (err as Error).message ?? ""
    if (/INVALID_FIELD|No such column/i.test(msg)) {
      const { id } = await sync.createRecord(sobject, {
        ...cleanFields,
        [externalIdField]: externalId,
      })
      return id
    }
    throw err
  }
}

export async function findSalesforceIdByExternalId(
  sync: InstanceType<typeof SalesforceSyncModuleService>,
  sobject: string,
  externalIdField: string,
  externalId: string
): Promise<string | null> {
  if (!usesSalesforceMedusaCustomFields()) return null
  const escaped = externalId.replace(/\\/g, "\\\\").replace(/'/g, "\\'")
  try {
    const q = await sync.query<{ Id: string }>(
      `SELECT Id FROM ${sobject} WHERE ${externalIdField} = '${escaped}' LIMIT 1`
    )
    return q.records[0]?.Id ?? null
  } catch {
    return null
  }
}

export async function findRegistrationByOrderAndVaProduct(
  sync: InstanceType<typeof SalesforceSyncModuleService>,
  salesforceOrderId: string,
  vaProductId: string
): Promise<string | null> {
  const orderId = escapeSoql(salesforceOrderId)
  const vaId = escapeSoql(vaProductId)
  const q = await sync.query<{ Id: string }>(
    `SELECT Id FROM ${SF_REGISTRATION_OBJECT} WHERE Order__c = '${orderId}' AND vaProduct__c = '${vaId}' ORDER BY CreatedDate ASC LIMIT 1`
  )
  return q.records[0]?.Id ?? null
}

export async function findOrderItemByOrderRegistration(
  sync: InstanceType<typeof SalesforceSyncModuleService>,
  salesforceOrderId: string,
  registrationId: string,
  kind: "product" | "discount",
  vaProductId?: string
): Promise<string | null> {
  const orderId = escapeSoql(salesforceOrderId)
  const regId = escapeSoql(registrationId)
  const filter =
    kind === "product" && vaProductId
      ? `AND vaProduct__c = '${escapeSoql(vaProductId)}'`
      : kind === "discount"
        ? `AND Product2Id = '${escapeSoql(SALESFORCE_DISCOUNT_PRODUCT2_ID)}'`
        : ""
  const q = await sync.query<{ Id: string }>(
    `SELECT Id FROM ${SF_ORDER_ITEM_OBJECT} WHERE OrderId = '${orderId}' AND Registration__c = '${regId}' ${filter} ORDER BY CreatedDate ASC LIMIT 1`
  )
  return q.records[0]?.Id ?? null
}

export async function ensureSyncState(
  sync: InstanceType<typeof SalesforceSyncModuleService>,
  entityType: string,
  medusaId: string,
  salesforceId: string
): Promise<void> {
  const row = await sync.getStateByMedusaId(entityType, medusaId)
  const payload = {
    entity_type: entityType,
    medusa_id: medusaId,
    salesforce_id: salesforceId,
    last_pushed_at: new Date(),
    last_status: "success",
    last_error: null,
    failure_count: 0,
    severity: null,
    next_retry_at: null,
  }
  if (!row) {
    await sync.createSalesforceSyncStates([payload])
    return
  }
  await sync.updateSalesforceSyncStates({ id: row.id, ...payload })
}

export async function resolveExistingSalesforceId(
  sync: InstanceType<typeof SalesforceSyncModuleService>,
  entityType: string,
  medusaId: string,
  externalLookup: () => Promise<string | null>
): Promise<string | null> {
  const fromState = (await sync.getStateByMedusaId(entityType, medusaId))?.salesforce_id
  if (fromState) return fromState
  return externalLookup()
}

export async function findVoucherIdByCode(
  sync: InstanceType<typeof SalesforceSyncModuleService>,
  code: string
): Promise<string | null> {
  const normalized = code.replace(/^GIFT-/i, "").trim()
  if (!normalized) return null
  const escaped = normalized.replace(/\\/g, "\\\\").replace(/'/g, "\\'")
  const q = await sync.query<{ Id: string }>(
    `SELECT Id FROM Voucher__c WHERE Code__c = '${escaped}' LIMIT 1`
  )
  return q.records[0]?.Id ?? null
}

export async function resolveGiftCardProduct2Id(
  sync: InstanceType<typeof SalesforceSyncModuleService>
): Promise<string> {
  const env = process.env.SALESFORCE_GIFTCARD_PRODUCT2_ID?.trim()
  if (env) return env
  const q = await sync.query<{ Id: string }>(
    `SELECT Id FROM Product2 WHERE Name = 'Cadeaubon' LIMIT 1`
  )
  const id = q.records[0]?.Id
  if (!id) {
    throw new Error(
      "Gift card Product2 not found — set SALESFORCE_GIFTCARD_PRODUCT2_ID or create Product2 Cadeaubon in Salesforce"
    )
  }
  return id
}

export async function resolveVoucherProduct2Id(
  sync: InstanceType<typeof SalesforceSyncModuleService>
): Promise<string> {
  const env = process.env.SALESFORCE_VOUCHER_PRODUCT2_ID?.trim()
  if (env) return env
  const q = await sync.query<{ Id: string }>(
    `SELECT Id FROM Product2 WHERE Name = 'Voucher' LIMIT 1`
  )
  const id = q.records[0]?.Id
  if (id) return id
  return process.env.SALESFORCE_DISCOUNT_PRODUCT2_ID?.trim() || "01t1t000001j7i9AAA"
}
