/**
 * List Person Account record types and sample customer Account record types.
 *
 *   npx medusa exec ./src/scripts/query-sf-person-account-record-types.ts
 */
import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import SalesforceSyncModuleService from "../modules/salesforce-sync/service"

export default async function querySfPersonAccountRecordTypes({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const sync = container.resolve("salesforceSync") as InstanceType<
    typeof SalesforceSyncModuleService
  >

  if (!(await sync.isIntegrationReady())) {
    logger.error("[query-sf-person-account-rt] Salesforce not configured")
    return
  }

  const recordTypes = await sync.query<{
    Id: string
    Name: string
    DeveloperName: string
    IsPersonType: boolean
    IsActive: boolean
  }>(
    "SELECT Id, Name, DeveloperName, IsPersonType, IsActive FROM RecordType WHERE SobjectType = 'Account' AND IsPersonType = true ORDER BY Name"
  )

  logger.info("[query-sf-person-account-rt] Person Account record types:")
  for (const rt of recordTypes.records) {
    logger.info(
      `  ${rt.Id} | ${rt.Name} | DeveloperName=${rt.DeveloperName} | active=${rt.IsActive}`
    )
  }

  const samples = await sync.query<{
    Id: string
    Name: string
    RecordTypeId: string
    Record_Type__c?: string
    Account_type__c?: string
  }>(
    "SELECT Id, Name, RecordTypeId, Record_Type__c, Account_type__c FROM Account WHERE IsPersonAccount = true AND PersonEmail != null ORDER BY LastModifiedDate DESC LIMIT 10"
  )

  logger.info("[query-sf-person-account-rt] Sample Person Accounts (recent with email):")
  for (const a of samples.records) {
    logger.info(
      `  Account ${a.Id} | ${a.Name} | RecordTypeId=${a.RecordTypeId} | Record_Type__c=${a.Record_Type__c ?? "-"} | Account_type__c=${a.Account_type__c ?? "-"}`
    )
  }

  const rtCounts = await sync.query<{ RecordTypeId: string; cnt: number }>(
    "SELECT RecordTypeId, COUNT(Id) cnt FROM Account WHERE IsPersonAccount = true GROUP BY RecordTypeId ORDER BY COUNT(Id) DESC"
  )
  logger.info("[query-sf-person-account-rt] Person Account counts by RecordTypeId:")
  for (const row of rtCounts.records) {
    const rt = recordTypes.records.find((r) => r.Id === row.RecordTypeId)
    logger.info(
      `  ${row.RecordTypeId} | ${rt?.Name ?? "?"} (${rt?.DeveloperName ?? "?"}) | count=${row.cnt}`
    )
  }
}
