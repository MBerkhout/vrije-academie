import { Button } from "@medusajs/ui"
import { useEffect, useState } from "react"

declare const __MEDUSA_ADMIN_SALESFORCE_INSTANCE_BASE__: string

type StatusJson = {
  configured?: boolean
  salesforceId?: string | null
  salesforceAccountId?: string | null
  lastPushedAt?: string | null
  lastPulledAt?: string | null
  lastStatus?: string | null
  lastError?: string | null
  failureCount?: number
  openInSalesforceUrl?: string | null
  salesforceObject?: string
  instanceUrl?: string | null
}

function fallbackSfUrl(
  sobject: string | undefined,
  sfId: string | undefined,
  instanceUrl?: string | null,
  salesforceAccountId?: string | null
): string | null {
  const raw =
    instanceUrl?.trim() ||
    (typeof __MEDUSA_ADMIN_SALESFORCE_INSTANCE_BASE__ !== "undefined"
      ? __MEDUSA_ADMIN_SALESFORCE_INSTANCE_BASE__
      : "")
  const base = raw.replace(/\/$/, "")
  if (!base) return null

  if (salesforceAccountId) {
    return `${base}/lightning/r/Account/${salesforceAccountId}/view`
  }

  if (!sobject || !sfId) return null
  return `${base}/lightning/r/${sobject}/${sfId}/view`
}

export function SalesforceEntityPanel(props: {
  apiSegment: "customers" | "orders" | "products" | "variants"
  entityId: string
  showPull?: boolean
}) {
  const { apiSegment, entityId, showPull = true } = props
  const [status, setStatus] = useState<StatusJson | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/admin/salesforce/${apiSegment}/${entityId}`, { credentials: "include" })
      const json = (await res.json()) as StatusJson
      setStatus(json)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [apiSegment, entityId])

  const push = async () => {
    setBusy(true)
    try {
      await fetch(`/admin/salesforce/${apiSegment}/${entityId}/push`, {
        method: "POST",
        credentials: "include",
      })
      await load()
    } finally {
      setBusy(false)
    }
  }

  const pull = async () => {
    if (!showPull) return
    setBusy(true)
    try {
      await fetch(`/admin/salesforce/${apiSegment}/${entityId}/pull`, {
        method: "POST",
        credentials: "include",
      })
      await load()
    } finally {
      setBusy(false)
    }
  }

  const openUrl =
    status?.openInSalesforceUrl ||
    fallbackSfUrl(
      status?.salesforceObject ?? undefined,
      status?.salesforceId ?? undefined,
      status?.instanceUrl,
      status?.salesforceAccountId
    )

  if (status?.configured === false) {
    return (
      <div className="rounded-md border border-ui-border-base bg-ui-bg-subtle px-4 py-3">
        <span className="txt-compact-small text-ui-fg-subtle">Salesforce not configured (env vars).</span>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-md border border-ui-border-base bg-ui-bg-subtle px-4 py-3">
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="txt-compact-small font-medium">Salesforce</span>
        {loading ? (
          <span className="txt-compact-xsmall text-ui-fg-subtle">Checking…</span>
        ) : (
          <span className="txt-compact-xsmall text-ui-fg-subtle break-words">
            {status?.lastStatus === "error"
              ? `Error (${status.failureCount ?? 0}x): ${status.lastError ?? ""}`
              : status?.lastPushedAt
                ? `Last pushed ${new Date(status.lastPushedAt).toLocaleString()}`
                : status?.salesforceId
                  ? `Linked ${status.salesforceId}`
                  : "Not synced"}
          </span>
        )}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {openUrl ? (
          <Button
            size="small"
            variant="secondary"
            type="button"
            onClick={() => window.open(openUrl, "_blank", "noopener,noreferrer")}
          >
            Open in Salesforce
          </Button>
        ) : null}
        {showPull ? (
          <Button size="small" variant="secondary" onClick={() => void pull()} disabled={busy}>
            Pull
          </Button>
        ) : null}
        <Button size="small" variant="secondary" onClick={() => void push()} disabled={busy}>
          {busy ? "…" : "Push"}
        </Button>
      </div>
    </div>
  )
}
