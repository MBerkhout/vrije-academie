import type SalesforceSyncModuleService from "../service"

/** Upsert by external id; returns Salesforce record Id. */
export async function upsertSalesforceRecord(
  sync: InstanceType<typeof SalesforceSyncModuleService>,
  sobject: string,
  externalIdField: string,
  externalId: string,
  fields: Record<string, unknown>
): Promise<string> {
  const { id } = await sync.upsertByExternalId(sobject, externalIdField, externalId, fields)
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
  if (salesforceId) {
    await sync.updateRecord(sobject, salesforceId, fields)
    return salesforceId
  }
  try {
    return await upsertSalesforceRecord(sync, sobject, externalIdField, externalId, fields)
  } catch (err) {
    const msg = (err as Error).message ?? ""
    if (/INVALID_FIELD|No such column/i.test(msg)) {
      const { id } = await sync.createRecord(sobject, {
        ...fields,
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
