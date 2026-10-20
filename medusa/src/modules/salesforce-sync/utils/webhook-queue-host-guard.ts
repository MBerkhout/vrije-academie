import os from "node:os"

/** Skip webhook queue work when the host is under memory or CPU pressure. */
export function shouldDeferWebhookQueueProcessing(): boolean {
  const cpus = os.cpus().length || 1
  const loadThreshold = Number(process.env.SALESFORCE_WEBHOOK_DEFER_LOADAVG)
  const threshold =
    Number.isFinite(loadThreshold) && loadThreshold > 0 ? loadThreshold : cpus * 2
  const [load1] = os.loadavg()
  if (load1 > threshold) return true

  const minFreeMb = Number(process.env.SALESFORCE_WEBHOOK_DEFER_FREE_MB)
  const freeMbThreshold =
    Number.isFinite(minFreeMb) && minFreeMb > 0 ? minFreeMb : 512
  const freeMb = os.freemem() / 1024 / 1024
  if (freeMb < freeMbThreshold) return true

  return false
}
