export type WebhookMethod = "create" | "update" | "delete"

export function webhookQueueBatchSize(): number {
  const n = Number(process.env.SALESFORCE_WEBHOOK_QUEUE_BATCH_SIZE)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 50
}

export function webhookQueueConcurrency(): number {
  const n = Number(process.env.SALESFORCE_WEBHOOK_QUEUE_CONCURRENCY)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 5
}

export function webhookQueueMaxAttempts(): number {
  const n = Number(process.env.SALESFORCE_WEBHOOK_MAX_ATTEMPTS)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 5
}

export function teacherAccountRecordTypeId(): string | null {
  return process.env.SALESFORCE_TEACHER_ACCOUNT_RECORD_TYPE_ID?.trim() || null
}

export function customerPersonAccountRecordTypeId(): string | null {
  return process.env.SALESFORCE_PERSON_ACCOUNT_RECORD_TYPE_ID?.trim() || null
}

export function isWebhookMethod(value: string): value is WebhookMethod {
  return value === "create" || value === "update" || value === "delete"
}
