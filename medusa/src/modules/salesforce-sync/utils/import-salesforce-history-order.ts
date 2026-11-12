import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { completeOrderWorkflow, createOrderWorkflow } from "@medusajs/medusa/core-flows"

import { grantVathuisFromImportedOrder } from "./grant-vathuis-from-imported-order"
import {
  analyzeRebookedSalesforceOrder,
  loadSalesforceOrderBundle,
} from "./import-rebooked-order"
import { mapSalesforceOrderLines, type SfHistoryOrderItemRow } from "./map-salesforce-order-lines"
import { buildImportedOrderMetadata } from "./order-import-metadata"
import { patchImportedOrderCreatedAt } from "./patch-imported-order-timestamps"
import { resolveSalesforceHistorySalesChannelId } from "./resolve-salesforce-history-channel"
import { resolveDefaultSalesChannelId } from "./resolve-default-sales-channel-id"
import {
  salesforceEffectiveDateToGrantInstant,
  toSalesforceOrderDateMetadata,
} from "./salesforce-order-effective-date"
import { SF_ORDER_OBJECT } from "./salesforce-config"
import { ensureSyncState } from "./upsert-record"
import { importRebookedOrder } from "./import-rebooked-order"
import SalesforceSyncModuleService from "../service"

function escapeSoql(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'")
}

export type SfHistoryOrderHeader = {
  Id: string
  OrderNumber?: string | number | null
  AccountId?: string | null
  EffectiveDate?: string | null
  CreatedDate?: string | null
  TotalAmount?: number | null
  Status?: string | null
  BillingStreet?: string | null
  BillingCity?: string | null
  BillingPostalCode?: string | null
  BillingCountry?: string | null
  OrderItems?: { records?: SfHistoryOrderItemRow[]; totalSize?: number } | null
}

function countryCodeFromSfLabel(label: string | null | undefined): string {
  const l = label?.trim().toLowerCase() ?? ""
  if (l.includes("nether")) return "nl"
  if (l.includes("belg")) return "be"
  if (l.includes("germ") || l.includes("deutsch")) return "de"
  return "nl"
}

function buildAddressFromOrder(order: SfHistoryOrderHeader): Record<string, string> {
  const country = countryCodeFromSfLabel(order.BillingCountry)
  return {
    first_name: "—",
    last_name: "",
    address_1: order.BillingStreet?.trim() || "—",
    city: order.BillingCity?.trim() || "Amsterdam",
    postal_code: order.BillingPostalCode?.trim() || "1016 CH",
    country_code: country,
  }
}

async function resolveDefaultRegionId(container: MedusaContainer): Promise<string> {
  const regionModule = container.resolve(Modules.REGION)
  const regions = await regionModule.listRegions({}, { take: 20 })
  const match =
    regions.find((r: { currency_code?: string }) => r.currency_code?.toLowerCase() === "eur") ??
    regions[0]
  if (!match?.id) throw new Error("No Medusa region found — run npm run seed:region")
  return match.id
}

async function resolveCustomerProfile(
  container: MedusaContainer,
  customerId: string
): Promise<{ email: string; first_name?: string | null; last_name?: string | null }> {
  const customerModule = container.resolve(Modules.CUSTOMER)
  const customer = await customerModule.retrieveCustomer(customerId, {
    select: ["id", "email", "first_name", "last_name"],
  })
  if (!customer.email?.trim()) throw new Error(`Customer ${customerId} has no email`)
  return customer
}

export type ImportHistoryOrderResult =
  | { skipped: true; reason: string }
  | { skipped: false; medusaOrderId: string; created: boolean }

export async function importSalesforceHistoryOrder(
  container: MedusaContainer,
  customerId: string,
  salesforceOrderId: string,
  options?: { prefetched?: SfHistoryOrderHeader }
): Promise<ImportHistoryOrderResult> {
  const sync = container.resolve("salesforceSync") as InstanceType<typeof SalesforceSyncModuleService>
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  if (!(await sync.isIntegrationReady())) {
    throw new Error("Salesforce integration is not configured")
  }

  const existing = await sync.getStateBySalesforceId("order", salesforceOrderId)
  if (existing?.medusa_id) {
    return { skipped: true, reason: "already_linked" }
  }

  let header = options?.prefetched
  if (!header) {
    header = (await sync.retrieve(SF_ORDER_OBJECT, salesforceOrderId, [
      "Id",
      "OrderNumber",
      "AccountId",
      "EffectiveDate",
      "CreatedDate",
      "TotalAmount",
      "Status",
      "BillingStreet",
      "BillingCity",
      "BillingPostalCode",
      "BillingCountry",
    ])) as SfHistoryOrderHeader
    const items = await sync.query<SfHistoryOrderItemRow>(
      `SELECT Id, ProductName__c, UnitPrice, TotalPrice, Quantity, vaProduct__c, Registration__c,
        Registration__r.Status__c,
        Registration__r.Audience_Player_Valid_Until__c,
        vaProduct__r.Name, vaProduct__r.Start_date_time__c, vaProduct__r.Product_City__c,
        vaProduct__r.Account_Teacher__r.Name, vaProduct__r.ProductGroup__r.Name,
        Product2.Name
      FROM OrderItem WHERE OrderId = '${escapeSoql(salesforceOrderId)}'`
    )
    header.OrderItems = { records: items.records }
  }

  if (header.Status !== "Activated") {
    return { skipped: true, reason: "not_activated" }
  }

  const bundle = await loadSalesforceOrderBundle(sync, salesforceOrderId)
  if (analyzeRebookedSalesforceOrder(bundle)) {
    const rebookResult = await importRebookedOrder(container, salesforceOrderId)
    if (rebookResult) {
      return { skipped: false, medusaOrderId: rebookResult.medusaOrderId, created: rebookResult.created }
    }
    return { skipped: true, reason: "rebook_not_importable" }
  }

  const sfItems = header.OrderItems?.records ?? []
  const mapped = await mapSalesforceOrderLines(container, sfItems)
  if (mapped.skippedCancelledOnly || mapped.lines.length === 0) {
    return { skipped: true, reason: "no_importable_lines" }
  }

  const customerState = await sync.getStateByMedusaId("customer", customerId)
  const accountId = String(header.AccountId ?? "").trim()
  if (accountId && customerState?.salesforce_account_id && customerState.salesforce_account_id !== accountId) {
    return { skipped: true, reason: "account_mismatch" }
  }

  const customer = await resolveCustomerProfile(container, customerId)
  const regionId = await resolveDefaultRegionId(container)
  const salesChannelId = await resolveSalesforceHistorySalesChannelId(container).catch(async () =>
    resolveDefaultSalesChannelId(container)
  )
  const address = buildAddressFromOrder(header)

  const grantInstant = salesforceEffectiveDateToGrantInstant(
    header.EffectiveDate,
    header.CreatedDate
  )
  const orderDateMeta = toSalesforceOrderDateMetadata(grantInstant)

  const totalAmount =
    typeof header.TotalAmount === "number" && Number.isFinite(header.TotalAmount)
      ? header.TotalAmount
      : null

  const { result: createdOrder } = await createOrderWorkflow(container).run({
    input: {
      region_id: regionId,
      sales_channel_id: salesChannelId,
      customer_id: customerId,
      email: customer.email,
      currency_code: "eur",
      status: "pending",
      no_notification: true,
      shipping_address: address,
      billing_address: address,
      metadata: {
        ...buildImportedOrderMetadata({
          salesforceOrderId,
          salesforceOrderNumber:
            header.OrderNumber != null ? String(header.OrderNumber) : null,
          salesforceOrderDate: orderDateMeta,
          salesforceTotalAmount: totalAmount,
        }),
        ...(mapped.discountMajor > 0 ? { sf_discount_total_major: mapped.discountMajor } : {}),
      },
      items: mapped.lines.map((line) => ({
        title: line.title,
        quantity: line.quantity,
        unit_price: line.unit_price,
        is_custom_price: true,
        metadata: line.metadata,
      })),
    },
  })

  const medusaOrderId = createdOrder.id
  await completeOrderWorkflow(container).run({ input: { orderIds: [medusaOrderId] } })
  await patchImportedOrderCreatedAt(medusaOrderId, grantInstant)

  await ensureSyncState(sync, "order", medusaOrderId, salesforceOrderId)

  const granted = await grantVathuisFromImportedOrder(container, medusaOrderId)
  if (granted > 0) {
    logger.info(`[sf-order-history] granted ${granted} VA Thuis entitlement(s) for ${medusaOrderId}`)
  }

  return { skipped: false, medusaOrderId, created: true }
}
