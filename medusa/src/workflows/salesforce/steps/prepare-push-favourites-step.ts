import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"

import {
  parseWishlistHandles,
  SF_FAVOURITES_HASH_METADATA_KEY,
} from "../../../lib/customer-wishlist"
import SalesforceSyncModuleService from "../../../modules/salesforce-sync/service"
import { favouritesWishlistFingerprint } from "../../../modules/salesforce-sync/utils/favourites-fingerprint"
import { customerHasLegacyImportPending } from "./prepare-push-customer-step"

export type PreparePushFavouritesInput = { customerId: string }

export type PreparePushFavouritesOutput = {
  skipped: boolean
  skipReason?: string
  customerId: string
  contactId: string | null
  accountId: string | null
  handles: string[]
}

export const preparePushFavouritesStep = createStep(
  { name: "prepare-push-favourites", maxRetries: 1, retryInterval: 2 },
  async (input: PreparePushFavouritesInput, { container }) => {
    const sync = container.resolve("salesforceSync") as InstanceType<
      typeof SalesforceSyncModuleService
    >
    const row = await sync.getStateByMedusaId("customer", input.customerId)
    if (row?.incoming_lock_until && new Date(row.incoming_lock_until) > new Date()) {
      return new StepResponse<PreparePushFavouritesOutput>({
        skipped: true,
        skipReason: "incoming_lock",
        customerId: input.customerId,
        contactId: row.salesforce_id ?? null,
        accountId: row.salesforce_account_id ?? null,
        handles: [],
      })
    }

    const customerService = container.resolve(Modules.CUSTOMER)
    const [customer] = await customerService.listCustomers({ id: input.customerId }, { take: 1 })
    if (!customer) {
      throw new Error(`Customer ${input.customerId} not found`)
    }

    const metadata = (customer.metadata ?? {}) as Record<string, unknown>
    if (customerHasLegacyImportPending(metadata)) {
      return new StepResponse<PreparePushFavouritesOutput>({
        skipped: true,
        skipReason: "legacy_import_pending",
        customerId: input.customerId,
        contactId: row?.salesforce_id ?? null,
        accountId: row?.salesforce_account_id ?? null,
        handles: [],
      })
    }

    const handles = parseWishlistHandles(metadata)
    const fingerprint = favouritesWishlistFingerprint(handles)
    const storedHash = metadata[SF_FAVOURITES_HASH_METADATA_KEY]
    if (typeof storedHash === "string" && storedHash === fingerprint) {
      return new StepResponse<PreparePushFavouritesOutput>({
        skipped: true,
        skipReason: "favourites_unchanged",
        customerId: input.customerId,
        contactId: row?.salesforce_id ?? null,
        accountId: row?.salesforce_account_id ?? null,
        handles,
      })
    }

    return new StepResponse<PreparePushFavouritesOutput>({
      skipped: false,
      customerId: input.customerId,
      contactId: row?.salesforce_id ?? null,
      accountId: row?.salesforce_account_id ?? null,
      handles,
    })
  }
)
