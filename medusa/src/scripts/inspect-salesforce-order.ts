/**
 * Read-only Salesforce dump for an order and related records.
 *
 *   npm run salesforce:inspect-order -- --medusa-id=order_...
 *   npm run salesforce:inspect-order -- --display-id=6
 *   npm run salesforce:inspect-order -- --order-nr=6
 *   npm run salesforce:inspect-order -- --salesforce-id=801...
 *   npm run salesforce:inspect-order -- --salesforce-id=801... --out=./tmp/order.json
 */
import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { mkdirSync, writeFileSync } from "node:fs"
import { dirname } from "node:path"

import {
  ORDER_EXTERNAL_ID_FIELD,
  SF_ORDER_OBJECT,
  usesSalesforceMedusaCustomFields,
} from "../modules/salesforce-sync/utils/salesforce-config"
import { resolveOrderIdByDisplayId } from "../modules/salesforce-sync/utils/resolve-order-id-by-display-id"
import SalesforceSyncModuleService from "../modules/salesforce-sync/service"
import { salesforceAuthMode } from "../modules/salesforce-sync/utils/is-configured"

function arg(name: string): string | undefined {
  const p = process.argv.find((a) => a.startsWith(`${name}=`))
  return p?.split("=").slice(1).join("=")
}

function parseDisplayIdArg(): number | undefined {
  const raw = arg("--display-id") ?? arg("--order-nr")
  if (raw == null || raw === "") return undefined
  const n = Number(raw)
  if (!Number.isInteger(n) || n < 1) {
    throw new Error(`Invalid display id: ${raw} (expected a positive integer)`)
  }
  return n
}

function escapeSoql(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'")
}

export default async function inspectSalesforceOrder({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const sync = container.resolve("salesforceSync") as InstanceType<
    typeof SalesforceSyncModuleService
  >

  if (!(await sync.isIntegrationReady())) {
    logger.error("[salesforce:inspect-order] Not configured. See docs/SALESFORCE_SYNC.md")
    return
  }

  const medusaIdArg = arg("--medusa-id")?.trim()
  const displayId = parseDisplayIdArg()
  const salesforceIdArg = arg("--salesforce-id")?.trim()
  const outPath = arg("--out")?.trim()

  if (medusaIdArg && displayId != null) {
    logger.error("[salesforce:inspect-order] Provide --medusa-id or --display-id/--order-nr, not both")
    return
  }

  if (!medusaIdArg && displayId == null && !salesforceIdArg) {
    logger.info(
      "[salesforce:inspect-order] Usage: --medusa-id=order_... | --display-id=N | --order-nr=N | --salesforce-id=801... [--out=path.json]"
    )
    return
  }

  logger.info(`[salesforce:inspect-order] auth mode: ${salesforceAuthMode()}`)

  let medusaId = medusaIdArg ?? ""
  if (displayId != null) {
    medusaId = await resolveOrderIdByDisplayId(container, displayId)
    logger.info(`[salesforce:inspect-order] resolved display_id ${displayId} → ${medusaId}`)
  }

  let salesforceId = salesforceIdArg ?? ""
  if (medusaId && !salesforceId) {
    const row = await sync.getStateByMedusaId("order", medusaId)
    salesforceId = row?.salesforce_id ?? ""
    if (!salesforceId && usesSalesforceMedusaCustomFields()) {
      try {
        const q = await sync.query<{ Id: string }>(
          `SELECT Id FROM ${SF_ORDER_OBJECT} WHERE ${ORDER_EXTERNAL_ID_FIELD} = '${escapeSoql(medusaId)}' LIMIT 1`
        )
        salesforceId = q.records[0]?.Id ?? ""
      } catch {
        /* external id field may not exist yet */
      }
    }
  }

  if (!salesforceId) {
    logger.error(
      `[salesforce:inspect-order] No Salesforce Order found for ${medusaId ?? salesforceIdArg}`
    )
    return
  }

  const order = await sync.retrieve(SF_ORDER_OBJECT, salesforceId, [
    "Id",
    "OrderNumber",
    "Status",
    "TotalAmount",
    "Website_Order__c",
    "Order_Origin__c",
    "Payment_Method__c",
    "Ideal_Transaction_Id__c",
    "Description",
    ...(usesSalesforceMedusaCustomFields() ? [ORDER_EXTERNAL_ID_FIELD] : []),
  ])

  const orderItemFields = usesSalesforceMedusaCustomFields()
    ? "Id, OrderItemNumber, Product_Name__c, UnitPrice, TotalPrice, Quantity, Is_Discount__c, Is_Voucher__c, vaProduct__c, Registration__c, Discount_Code__c, Voucher__c, Medusa_Order_Item_Id__c"
    : "Id, OrderItemNumber, Product_Name__c, UnitPrice, TotalPrice, Quantity, Is_Discount__c, Is_Voucher__c, vaProduct__c, Registration__c, Discount_Code__c, Voucher__c"

  const items = await sync.query<Record<string, unknown>>(
    `SELECT ${orderItemFields} FROM OrderItem WHERE OrderId = '${escapeSoql(salesforceId)}'`
  )

  const regIds = [
    ...new Set(
      items.records
        .map((i) => i.Registration__c)
        .filter((id): id is string => typeof id === "string" && !!id)
    ),
  ]

  const registrations: Record<string, unknown>[] = []
  for (const regId of regIds) {
    const reg = await sync.retrieve("Registration__c", regId, [
      "Id",
      "Name",
      "Status__c",
      "Origin__c",
      "vaProduct__c",
      "Order__c",
      "Total_Price__c",
      ...(usesSalesforceMedusaCustomFields() ? ["Medusa_Registration_Id__c"] : []),
    ])
    registrations.push(reg)
  }

  const vouchers = await sync.query<Record<string, unknown>>(
    `SELECT Id, Code__c, Original_Amount__c, Type__c, Source_Order__c, Beneficiary_Name__c FROM Voucher__c WHERE Source_Order__c = '${escapeSoql(salesforceId)}'`
  )

  const dump = {
    medusa_id: medusaId || null,
    salesforce_order_id: salesforceId,
    order,
    order_items: items.records,
    registrations,
    vouchers: vouchers.records,
  }

  const json = JSON.stringify(dump, null, 2)
  if (outPath) {
    mkdirSync(dirname(outPath), { recursive: true })
    writeFileSync(outPath, json, "utf8")
    logger.info(`[salesforce:inspect-order] wrote ${outPath}`)
  } else {
    logger.info(json.length > 20_000 ? `${json.slice(0, 20_000)}… (truncated)` : json)
  }
}
