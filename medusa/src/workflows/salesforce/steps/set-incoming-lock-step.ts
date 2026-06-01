import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

import SalesforceSyncModuleService from "../../../modules/salesforce-sync/service"

const LOCK_MS = 10_000

export const setIncomingLockStep = createStep(
  { name: "salesforce-set-incoming-lock", maxRetries: 2, retryInterval: 5 },
  async (input: { entityType: string; medusaId: string }, { container }) => {
    const sync = container.resolve("salesforceSync") as InstanceType<typeof SalesforceSyncModuleService>
    const until = new Date(Date.now() + LOCK_MS)
    let row = await sync.getStateByMedusaId(input.entityType, input.medusaId)
    if (!row) {
      const [created] = await sync.createSalesforceSyncStates([
        {
          entity_type: input.entityType,
          medusa_id: input.medusaId,
          incoming_lock_until: until,
          last_status: "retrying",
        },
      ])
      row = created
    } else {
      await sync.updateSalesforceSyncStates({
        id: row.id,
        incoming_lock_until: until,
        last_status: "retrying",
      })
    }
    return new StepResponse({ until })
  }
)
