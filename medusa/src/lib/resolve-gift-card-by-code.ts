import type { MedusaContainer } from "@medusajs/framework/types"

import { exploreGiftCardFromSalesforce } from "./explore-gift-card-from-salesforce"
import { refreshGiftCardBalanceFromSalesforce } from "./refresh-gift-card-from-salesforce"
import { GIFT_CARD_MODULE } from "../modules/gift-card"
import GiftCardModuleService from "../modules/gift-card/service"

type GiftCardRow = Awaited<ReturnType<GiftCardModuleService["listGiftCards"]>>[number]

/** Local gift card by code, optionally importing from Salesforce Voucher__c when missing. */
export async function resolveGiftCardByCode(
  container: MedusaContainer,
  rawCode: string,
  opts?: { exploreSalesforce?: boolean }
): Promise<GiftCardRow | null> {
  const gift = container.resolve(GIFT_CARD_MODULE) as InstanceType<typeof GiftCardModuleService>
  const code = gift.normalizeCode(rawCode)
  const local = await gift.getByCode(code)
  if (local) {
    if (opts?.exploreSalesforce === false) {
      return local
    }
    return refreshGiftCardBalanceFromSalesforce(container, local, code)
  }
  if (opts?.exploreSalesforce === false) {
    return null
  }
  return exploreGiftCardFromSalesforce(container, code)
}
