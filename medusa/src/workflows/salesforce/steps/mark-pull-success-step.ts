import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

import SalesforceSyncModuleService from "../../../modules/salesforce-sync/service"

export type MarkPullSuccessInput = {
  entityType: string
  medusaId: string
  salesforceId: string
  salesforceAccountId?: string | null
}

export const markPullSuccessStep = createStep(
  { name: "salesforce-mark-pull-success", maxRetries: 3, retryInterval: 5 },
  async (input: MarkPullSuccessInput, { container }) => {
    const svc = container.resolve("salesforceSync") as InstanceType<typeof SalesforceSyncModuleService>
    let row = await svc.getStateByMedusaId(input.entityType, input.medusaId)
    if (!row) {
      const [created] = await svc.createSalesforceSyncStates([
        {
          entity_type: input.entityType,
          medusa_id: input.medusaId,
          salesforce_id: input.salesforceId,
          salesforce_account_id: input.salesforceAccountId ?? null,
          last_pulled_at: new Date(),
          last_status: "success",
        },
      ])
      row = created
    } else {
      await svc.updateSalesforceSyncStates({
        id: row.id,
        salesforce_id: input.salesforceId,
        salesforce_account_id: input.salesforceAccountId ?? row.salesforce_account_id,
        last_pulled_at: new Date(),
        last_status: "success",
        last_error: null,
      })
    }
    return new StepResponse({ ok: true as const })
  }
)
