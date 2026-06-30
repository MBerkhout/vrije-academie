import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"

import SalesforceSyncModuleService from "../../../modules/salesforce-sync/service"
import { pushCustomerToSalesforceWorkflowId } from "../push-customer-salesforce"

import type { PreparePushOrderOutput } from "./prepare-push-order-step"

export type EnsureOrderCustomerInput = Pick<
  PreparePushOrderOutput,
  "skipped" | "customerId" | "medusaId"
>

export type EnsureOrderCustomerOutput = {
  skipped: boolean
  salesforceAccountId: string | null
  salesforceContactId: string | null
}

export const ensureOrderCustomerSalesforceStep = createStep(
  { name: "ensure-order-customer-salesforce", maxRetries: 3, retryInterval: 10 },
  async (input: EnsureOrderCustomerInput, { container }) => {
    if (input.skipped) {
      return new StepResponse<EnsureOrderCustomerOutput>({
        skipped: true,
        salesforceAccountId: null,
        salesforceContactId: null,
      })
    }

    if (!input.customerId) {
      throw new Error(
        `Order ${input.medusaId} has no customer — cannot create Salesforce Registration__c`
      )
    }

    const sync = container.resolve("salesforceSync") as InstanceType<
      typeof SalesforceSyncModuleService
    >
    let row = await sync.getStateByMedusaId("customer", input.customerId)

    if (!row?.salesforce_id || !row.salesforce_account_id) {
      const engine = container.resolve(Modules.WORKFLOW_ENGINE) as {
        run: (id: string, opts: Record<string, unknown>) => Promise<unknown>
      }
      await engine.run(pushCustomerToSalesforceWorkflowId, {
        input: { customerId: input.customerId },
        context: { eventGroupId: input.customerId },
        throwOnError: true,
      })
      row = await sync.getStateByMedusaId("customer", input.customerId)
    }

    if (!row?.salesforce_id || !row.salesforce_account_id) {
      throw new Error(
        `Customer ${input.customerId} has no Salesforce Person Account link after push`
      )
    }

    return new StepResponse<EnsureOrderCustomerOutput>({
      skipped: false,
      salesforceAccountId: row.salesforce_account_id,
      salesforceContactId: row.salesforce_id,
    })
  }
)
