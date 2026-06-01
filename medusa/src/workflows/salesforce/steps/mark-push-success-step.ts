import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

import SalesforceSyncModuleService from "../../../modules/salesforce-sync/service"
import type { SalesforceEntityType } from "../entity-types"

export type MarkPushSuccessInput = {
  skipped?: boolean
  entityType: SalesforceEntityType
  medusaId: string
  salesforceId: string | null
}

export const markPushSuccessStep = createStep(
  { name: "salesforce-mark-push-success", maxRetries: 3, retryInterval: 5 },
  async (input: MarkPushSuccessInput, { container }) => {
    if (input.skipped || !input.salesforceId) {
      return new StepResponse<{ ok: boolean; skipped?: boolean; id?: string }>({
        ok: true,
        skipped: true,
      })
    }
    const svc = container.resolve("salesforceSync") as InstanceType<typeof SalesforceSyncModuleService>
    let row = await svc.getStateByMedusaId(input.entityType, input.medusaId)
    if (!row) {
      const [created] = await svc.createSalesforceSyncStates([
        {
          entity_type: input.entityType,
          medusa_id: input.medusaId,
          salesforce_id: input.salesforceId,
          last_pushed_at: new Date(),
          last_status: "success",
          last_error: null,
          failure_count: 0,
          severity: null,
          next_retry_at: null,
        },
      ])
      row = created
    } else {
      await svc.updateSalesforceSyncStates({
        id: row.id,
        salesforce_id: input.salesforceId,
        last_pushed_at: new Date(),
        last_status: "success",
        last_error: null,
        failure_count: 0,
        severity: null,
        next_retry_at: null,
      })
    }
    return new StepResponse<{ ok: boolean; skipped?: boolean; id?: string }>({
      ok: true,
      id: row?.id,
    })
  }
)
