import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { completeOrderWorkflow, createOrderWorkflow } from "@medusajs/medusa/core-flows"

import { buildEventLineItemMetadata } from "../../../lib/event-line-item-metadata"
import { SF_ORDER_OBJECT, SF_REGISTRATION_OBJECT } from "./salesforce-config"
import { buildRegistrationExternalId } from "./build-registration-id"
import { ensureSyncState } from "./upsert-record"
import {
  buildHiddenFromAccountMetadata,
  buildImportedOrderMetadata,
  REBOOKED_REGISTRATION_STATUS,
} from "./order-import-metadata"
import { resolveDefaultSalesChannelId } from "./resolve-default-sales-channel-id"
import SalesforceSyncModuleService from "../service"

export type SfOrderItemRow = {
  Id?: string
  ProductName__c?: string
  UnitPrice?: number
  TotalPrice?: number
  Quantity?: number
  vaProduct__c?: string
  Registration__c?: string
}

export type SfRegistrationRow = {
  Id?: string
  Status__c?: string
  Order__c?: string
  vaProduct__c?: string
}

export type SalesforceOrderBundle = {
  salesforceOrderId: string
  order: Record<string, unknown>
  orderItems: SfOrderItemRow[]
  registrationsById: Map<string, SfRegistrationRow>
}

export type RebookedOrderAnalysis = {
  salesforceOrderId: string
  creditLine: SfOrderItemRow
  enrollmentLine: SfOrderItemRow
  newRegistration: SfRegistrationRow
  rebookedRegistration: SfRegistrationRow
  originalSalesforceOrderId: string
}

export type ImportRebookedOrderResult = {
  medusaOrderId: string
  created: boolean
  hiddenOriginalOrderId: string | null
}

function escapeSoql(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'")
}

function asNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

export async function loadSalesforceOrderBundle(
  sync: InstanceType<typeof SalesforceSyncModuleService>,
  salesforceOrderId: string
): Promise<SalesforceOrderBundle> {
  const order = await sync.retrieve(SF_ORDER_OBJECT, salesforceOrderId, [
    "Id",
    "OrderNumber",
    "AccountId",
    "Status",
    "TotalAmount",
    "Website_Order__c",
    "Order_Origin__c",
    "EffectiveDate",
  ])

  const items = await sync.query<SfOrderItemRow>(
    `SELECT Id, ProductName__c, UnitPrice, TotalPrice, Quantity, vaProduct__c, Registration__c FROM OrderItem WHERE OrderId = '${escapeSoql(salesforceOrderId)}'`
  )

  const regIds = [
    ...new Set(
      items.records
        .map((item) => item.Registration__c)
        .filter((id): id is string => typeof id === "string" && !!id)
    ),
  ]

  const registrationsById = new Map<string, SfRegistrationRow>()
  for (const regId of regIds) {
    const reg = await sync.retrieve(SF_REGISTRATION_OBJECT, regId, [
      "Id",
      "Status__c",
      "Order__c",
      "vaProduct__c",
    ])
    registrationsById.set(regId, reg as SfRegistrationRow)
  }

  return {
    salesforceOrderId,
    order,
    orderItems: items.records,
    registrationsById,
  }
}

/** Pure analysis: is this Salesforce order an omboeking we can import? */
export function analyzeRebookedSalesforceOrder(
  bundle: SalesforceOrderBundle
): RebookedOrderAnalysis | null {
  const creditLines = bundle.orderItems.filter((item) => asNumber(item.Quantity) < 0)
  if (!creditLines.length) return null

  for (const creditLine of creditLines) {
    const regId = creditLine.Registration__c
    if (!regId) continue
    const registration = bundle.registrationsById.get(regId)
    if (!registration || registration.Status__c !== REBOOKED_REGISTRATION_STATUS) continue

    const originalSalesforceOrderId = registration.Order__c?.trim()
    if (!originalSalesforceOrderId) continue

    const enrollmentLine = bundle.orderItems.find((item) => {
      if (asNumber(item.Quantity) <= 0) return false
      const itemRegId = item.Registration__c
      if (!itemRegId) return false
      const itemReg = bundle.registrationsById.get(itemRegId)
      return itemReg?.Status__c === "Ingeschreven"
    })

    if (!enrollmentLine?.vaProduct__c || !enrollmentLine.Registration__c) continue

    const newRegistration = bundle.registrationsById.get(enrollmentLine.Registration__c)
    if (!newRegistration) continue

    return {
      salesforceOrderId: bundle.salesforceOrderId,
      creditLine,
      enrollmentLine,
      newRegistration,
      rebookedRegistration: registration,
      originalSalesforceOrderId,
    }
  }

  return null
}

async function resolveVariantIdForVaProduct(
  sync: InstanceType<typeof SalesforceSyncModuleService>,
  vaProductId: string
): Promise<string | null> {
  const rows = await sync.listSalesforceSyncStates({
    entity_type: "variant",
    salesforce_id: vaProductId,
  })
  const preferred =
    rows.find((row) => row.last_status === "success") ??
    rows.sort((a, b) => {
      const ta = a.updated_at ? new Date(a.updated_at).getTime() : 0
      const tb = b.updated_at ? new Date(b.updated_at).getTime() : 0
      return tb - ta
    })[0]
  return preferred?.medusa_id ?? null
}

async function resolveCustomerIdForAccount(
  sync: InstanceType<typeof SalesforceSyncModuleService>,
  accountId: string
): Promise<string | null> {
  const row = await sync.getStateBySalesforceAccountId("customer", accountId)
  return row?.medusa_id ?? null
}

async function resolveDefaultRegionId(container: MedusaContainer): Promise<string> {
  const regionModule = container.resolve(Modules.REGION)
  const regions = await regionModule.listRegions({}, { take: 20 })
  const match =
    regions.find((r: { currency_code?: string }) => r.currency_code?.toLowerCase() === "eur") ??
    regions[0]
  if (!match?.id) {
    throw new Error("No Medusa region found — run npm run seed:region")
  }
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
  if (!customer.email?.trim()) {
    throw new Error(`Customer ${customerId} has no email`)
  }
  return customer
}

async function resolveAddressFromOriginalOrder(
  container: MedusaContainer,
  originalMedusaOrderId: string | null
): Promise<Record<string, string> | null> {
  if (!originalMedusaOrderId) return null
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "order",
    fields: [
      "shipping_address.first_name",
      "shipping_address.last_name",
      "shipping_address.address_1",
      "shipping_address.city",
      "shipping_address.postal_code",
      "shipping_address.country_code",
    ],
    filters: { id: originalMedusaOrderId },
  })
  const row = (data?.[0] ?? null) as {
    shipping_address?: {
      first_name?: string | null
      last_name?: string | null
      address_1?: string | null
      city?: string | null
      postal_code?: string | null
      country_code?: string | null
    } | null
  } | null
  const addr = row?.shipping_address
  if (!addr?.country_code) return null
  return {
    first_name: addr.first_name?.trim() || "—",
    last_name: addr.last_name?.trim() || "",
    address_1: addr.address_1?.trim() || "—",
    city: addr.city?.trim() || "Amsterdam",
    postal_code: addr.postal_code?.trim() || "1016 CH",
    country_code: addr.country_code.trim().toLowerCase(),
  }
}

function defaultAddress(profile: {
  first_name?: string | null
  last_name?: string | null
}): Record<string, string> {
  return {
    first_name: profile.first_name?.trim() || "—",
    last_name: profile.last_name?.trim() || "",
    address_1: "—",
    city: "Amsterdam",
    postal_code: "1016 CH",
    country_code: "nl",
  }
}

async function hideOriginalOrder(
  container: MedusaContainer,
  originalMedusaOrderId: string,
  replacedBySalesforceOrderId: string,
  replacedByMedusaOrderId: string
): Promise<void> {
  const orderModule = container.resolve(Modules.ORDER)
  const original = await orderModule.retrieveOrder(originalMedusaOrderId, {
    select: ["id", "metadata"],
  })
  const metadata = {
    ...((original.metadata ?? {}) as Record<string, unknown>),
    ...buildHiddenFromAccountMetadata({
      replacedBySalesforceOrderId,
      replacedByMedusaOrderId,
    }),
  }
  await orderModule.updateOrders(originalMedusaOrderId, { metadata })
}

export async function importRebookedOrder(
  container: MedusaContainer,
  salesforceOrderId: string
): Promise<ImportRebookedOrderResult | null> {
  const sync = container.resolve("salesforceSync") as InstanceType<
    typeof SalesforceSyncModuleService
  >

  if (!(await sync.isIntegrationReady())) {
    throw new Error("Salesforce integration is not configured")
  }

  const existing = await sync.getStateBySalesforceId("order", salesforceOrderId)
  if (existing?.medusa_id) {
    return {
      medusaOrderId: existing.medusa_id,
      created: false,
      hiddenOriginalOrderId: null,
    }
  }

  const bundle = await loadSalesforceOrderBundle(sync, salesforceOrderId)
  const analysis = analyzeRebookedSalesforceOrder(bundle)
  if (!analysis) return null

  const originalOrderState = await sync.getStateBySalesforceId(
    "order",
    analysis.originalSalesforceOrderId
  )
  const originalMedusaOrderId = originalOrderState?.medusa_id ?? null
  if (!originalMedusaOrderId) {
    throw new Error(
      `Original Salesforce order ${analysis.originalSalesforceOrderId} is not linked to a Medusa order`
    )
  }

  const accountId = String(bundle.order.AccountId ?? "").trim()
  if (!accountId) {
    throw new Error(`Salesforce order ${salesforceOrderId} has no AccountId`)
  }

  const customerId = await resolveCustomerIdForAccount(sync, accountId)
  if (!customerId) {
    throw new Error(`No Medusa customer linked to Salesforce account ${accountId}`)
  }

  const variantId = await resolveVariantIdForVaProduct(
    sync,
    String(analysis.enrollmentLine.vaProduct__c)
  )
  if (!variantId) {
    throw new Error(
      `No Medusa variant linked to vaProduct ${analysis.enrollmentLine.vaProduct__c}`
    )
  }

  const customer = await resolveCustomerProfile(container, customerId)
  const regionId = await resolveDefaultRegionId(container)
  const salesChannelId = await resolveDefaultSalesChannelId(container)
  const address =
    (await resolveAddressFromOriginalOrder(container, originalMedusaOrderId)) ??
    defaultAddress(customer)

  const lineMetadata = await buildEventLineItemMetadata(container, variantId)
  const unitPrice = asNumber(analysis.enrollmentLine.UnitPrice)
  const title =
    analysis.enrollmentLine.ProductName__c?.trim() ||
    analysis.newRegistration.vaProduct__c ||
    "Inschrijving"

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
      metadata: buildImportedOrderMetadata({
        salesforceOrderId,
        replacesSalesforceOrderId: analysis.originalSalesforceOrderId,
        replacesMedusaOrderId: originalMedusaOrderId,
      }),
      items: [
        {
          variant_id: variantId,
          quantity: 1,
          title,
          unit_price: unitPrice,
          metadata: lineMetadata,
        },
      ],
    },
  })

  const medusaOrderId = createdOrder.id
  await completeOrderWorkflow(container).run({ input: { orderIds: [medusaOrderId] } })

  const orderModule = container.resolve(Modules.ORDER)
  const orderWithItems = await orderModule.retrieveOrder(medusaOrderId, {
    relations: ["items"],
  })
  const lineItemId = orderWithItems.items?.[0]?.id
  if (lineItemId && analysis.newRegistration.Id) {
    const registrationExternalId = buildRegistrationExternalId(medusaOrderId, lineItemId, 0)
    await ensureSyncState(sync, "order", medusaOrderId, salesforceOrderId)
    await ensureSyncState(
      sync,
      "registration",
      registrationExternalId,
      analysis.newRegistration.Id
    )
  } else {
    await ensureSyncState(sync, "order", medusaOrderId, salesforceOrderId)
  }

  await hideOriginalOrder(
    container,
    originalMedusaOrderId,
    salesforceOrderId,
    medusaOrderId
  )

  return {
    medusaOrderId,
    created: true,
    hiddenOriginalOrderId: originalMedusaOrderId,
  }
}

/** Webhook/CLI entry: import when applicable, otherwise null. */
export async function importRebookedOrderIfApplicable(
  container: MedusaContainer,
  salesforceOrderId: string
): Promise<ImportRebookedOrderResult | null> {
  return importRebookedOrder(container, salesforceOrderId)
}
