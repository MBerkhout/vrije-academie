import {
  SF_CONTACT_OBJECT,
  SF_PERSON_ACCOUNT_OBJECT,
  splitAccountPushFields,
} from "../mappings/customer"
import type SalesforceSyncModuleService from "../service"

export async function updateAccountWithDuplicateRetry(
  svc: InstanceType<typeof SalesforceSyncModuleService>,
  accountId: string,
  fields: Record<string, unknown>
): Promise<void> {
  if (Object.keys(fields).length === 0) return
  try {
    await svc.updateRecord(SF_PERSON_ACCOUNT_OBJECT, accountId, fields)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (!message.includes("DUPLICATES_DETECTED")) throw err
    await svc.updateRecord(SF_PERSON_ACCOUNT_OBJECT, accountId, fields, {
      allowDuplicateSave: true,
    })
  }
}

export async function updateContactWithDuplicateRetry(
  svc: InstanceType<typeof SalesforceSyncModuleService>,
  contactId: string,
  fields: Record<string, unknown>
): Promise<void> {
  if (Object.keys(fields).length === 0) return
  try {
    await svc.updateRecord(SF_CONTACT_OBJECT, contactId, fields)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (!message.includes("DUPLICATES_DETECTED")) throw err
    await svc.updateRecord(SF_CONTACT_OBJECT, contactId, fields, {
      allowDuplicateSave: true,
    })
  }
}

export async function patchPersonAccountFields(
  svc: InstanceType<typeof SalesforceSyncModuleService>,
  accountId: string,
  accountFields: Record<string, unknown>
): Promise<void> {
  if (Object.keys(accountFields).length === 0) return

  const { profileFields, addressFields } = splitAccountPushFields(accountFields)
  await updateAccountWithDuplicateRetry(svc, accountId, profileFields)
  await updateAccountWithDuplicateRetry(svc, accountId, addressFields)
}