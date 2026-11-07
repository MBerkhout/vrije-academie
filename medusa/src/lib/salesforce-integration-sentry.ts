import type SalesforceSyncModuleService from "../modules/salesforce-sync/service"

import { captureWithContext } from "./sentry"

const WARN_INTERVAL_MS = 15 * 60 * 1000
let lastIntegrationNotReadyWarnAt = 0

export async function salesforceIntegrationReady(
  sync: InstanceType<typeof SalesforceSyncModuleService>,
  context: { subscriber: string }
): Promise<boolean> {
  if (await sync.isIntegrationReady()) return true
  const env = process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV
  if (env !== "production") return false
  const now = Date.now()
  if (now - lastIntegrationNotReadyWarnAt < WARN_INTERVAL_MS) return false
  lastIntegrationNotReadyWarnAt = now
  captureWithContext(new Error(`Salesforce integration not ready (${context.subscriber})`), {
    tags: {
      flow: "salesforce-sync",
      kind: "integration-not-ready",
      subscriber: context.subscriber,
    },
  })
  return false
}
