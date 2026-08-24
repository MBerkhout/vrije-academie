import { defineRouteConfig } from "@medusajs/admin-sdk"
import { BuildingStorefront } from "@medusajs/icons"
import { Button, Container, Heading, Table, Checkbox, Badge } from "@medusajs/ui"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"

import { SalesforceOAuthPanel } from "./oauth-panel"

type FailureRow = {
  id: string
  entityType: string
  medusaId: string
  salesforceId: string | null
  lastStatus: string | null
  lastError: string | null
  failureCount: number
  lastPushedAt: string | Date | null
  openInSalesforceUrl: string | null
}

type WebhookQueueStats = {
  pending: number
  processing: number
  failed: number
  done: number
  skipped: number
  doneLast24h: number
  oldestPendingAt: string | null
}

type WebhookEventRow = {
  id: string
  objectType: string
  method: string
  salesforceId: string
  entityType: string | null
  medusaId: string | null
  status: string
  attempts: number
  error: string | null
  receivedAt: string
  processedAt: string | null
}

const STATUS_OPTIONS = ["pending", "processing", "done", "failed", "skipped"] as const

function formatWhen(value: string | Date | null | undefined): string {
  if (!value) return "—"
  const d = typeof value === "string" ? new Date(value) : value
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString()
}

function statusBadgeColor(status: string): "green" | "red" | "orange" | "blue" | "grey" {
  if (status === "done") return "green"
  if (status === "failed") return "red"
  if (status === "processing") return "blue"
  if (status === "pending") return "orange"
  return "grey"
}

const SalesforceSyncPage = () => {
  const [items, setItems] = useState<FailureRow[]>([])
  const [loadingFailures, setLoadingFailures] = useState(true)
  const [selected, setSelected] = useState<Record<string, boolean>>({})

  const [queueStats, setQueueStats] = useState<WebhookQueueStats | null>(null)
  const [queueEvents, setQueueEvents] = useState<WebhookEventRow[]>([])
  const [queueStatusFilter, setQueueStatusFilter] = useState<string>("")
  const [loadingQueue, setLoadingQueue] = useState(true)

  const loadFailures = async () => {
    setLoadingFailures(true)
    try {
      const res = await fetch("/admin/salesforce/failures?status=error,retrying&limit=100", {
        credentials: "include",
      })
      const json = (await res.json()) as { items: FailureRow[] }
      setItems(json.items ?? [])
    } finally {
      setLoadingFailures(false)
    }
  }

  const loadQueue = async () => {
    setLoadingQueue(true)
    try {
      const params = new URLSearchParams({ limit: "100" })
      if (queueStatusFilter) params.set("status", queueStatusFilter)
      const res = await fetch(`/admin/salesforce/webhook-queue?${params.toString()}`, {
        credentials: "include",
      })
      const json = (await res.json()) as {
        stats: WebhookQueueStats
        events: WebhookEventRow[]
      }
      setQueueStats(json.stats ?? null)
      setQueueEvents(json.events ?? [])
    } finally {
      setLoadingQueue(false)
    }
  }

  useEffect(() => {
    void loadFailures()
  }, [])

  useEffect(() => {
    void loadQueue()
  }, [queueStatusFilter])

  const medusaPath = (row: FailureRow) => {
    if (row.entityType === "customer") return `/customers/${row.medusaId}`
    if (row.entityType === "order") return `/orders/${row.medusaId}`
    if (row.entityType === "product") return `/products/${row.medusaId}`
    if (row.entityType === "variant") return `/products`
    return "/"
  }

  const retryFailure = async (id: string) => {
    await fetch(`/admin/salesforce/failures/${id}/retry`, {
      method: "POST",
      credentials: "include",
    })
    await loadFailures()
  }

  const retryBulkFailures = async () => {
    const ids = Object.entries(selected).filter(([, v]) => v).map(([k]) => k)
    if (!ids.length) return
    await fetch("/admin/salesforce/failures/retry-bulk", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    })
    setSelected({})
    await loadFailures()
  }

  const retryWebhookEvent = async (id: string) => {
    await fetch(`/admin/salesforce/webhook-queue/${id}/retry`, {
      method: "POST",
      credentials: "include",
    })
    await loadQueue()
  }

  const processQueueNow = async () => {
    await fetch("/admin/salesforce/webhook-queue/process", {
      method: "POST",
      credentials: "include",
    })
    await loadQueue()
  }

  return (
    <Container className="p-6 flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <Heading level="h1">Salesforce sync</Heading>
        <div className="flex gap-2">
          <Button size="small" variant="secondary" onClick={() => void loadQueue()} disabled={loadingQueue}>
            Refresh queue
          </Button>
          <Button
            size="small"
            variant="secondary"
            onClick={() => void loadFailures()}
            disabled={loadingFailures}
          >
            Refresh failures
          </Button>
        </div>
      </div>

      <SalesforceOAuthPanel />

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <Heading level="h2">Webhook queue</Heading>
          <Button size="small" variant="primary" onClick={() => void processQueueNow()}>
            Process queue now
          </Button>
        </div>
        <p className="text-ui-fg-subtle txt-compact-small">
          Inbound Salesforce webhooks are logged here, then processed into Medusa (and batched Sanity sync).
        </p>

        {queueStats ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-lg border border-ui-border-base p-3">
              <div className="txt-compact-small text-ui-fg-subtle">Pending</div>
              <div className="text-xl font-semibold">{queueStats.pending}</div>
            </div>
            <div className="rounded-lg border border-ui-border-base p-3">
              <div className="txt-compact-small text-ui-fg-subtle">Processing</div>
              <div className="text-xl font-semibold">{queueStats.processing}</div>
            </div>
            <div className="rounded-lg border border-ui-border-base p-3">
              <div className="txt-compact-small text-ui-fg-subtle">Failed</div>
              <div className="text-xl font-semibold">{queueStats.failed}</div>
            </div>
            <div className="rounded-lg border border-ui-border-base p-3">
              <div className="txt-compact-small text-ui-fg-subtle">Done (24h)</div>
              <div className="text-xl font-semibold">{queueStats.doneLast24h}</div>
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2 items-center">
          <span className="txt-compact-small text-ui-fg-subtle">Filter status:</span>
          <Button
            size="small"
            variant={queueStatusFilter === "" ? "primary" : "secondary"}
            onClick={() => setQueueStatusFilter("")}
          >
            All
          </Button>
          {STATUS_OPTIONS.map((status) => (
            <Button
              key={status}
              size="small"
              variant={queueStatusFilter === status ? "primary" : "secondary"}
              onClick={() => setQueueStatusFilter(status)}
            >
              {status}
            </Button>
          ))}
        </div>

        {loadingQueue ? (
          <span className="txt-compact-small">Loading queue…</span>
        ) : (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Status</Table.HeaderCell>
                <Table.HeaderCell>Object</Table.HeaderCell>
                <Table.HeaderCell>Method</Table.HeaderCell>
                <Table.HeaderCell>SF Id</Table.HeaderCell>
                <Table.HeaderCell>Entity</Table.HeaderCell>
                <Table.HeaderCell>Attempts</Table.HeaderCell>
                <Table.HeaderCell>Received</Table.HeaderCell>
                <Table.HeaderCell>Error</Table.HeaderCell>
                <Table.HeaderCell />
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {queueEvents.map((row) => (
                <Table.Row key={row.id}>
                  <Table.Cell>
                    <Badge color={statusBadgeColor(row.status)}>{row.status}</Badge>
                  </Table.Cell>
                  <Table.Cell>{row.objectType}</Table.Cell>
                  <Table.Cell>{row.method}</Table.Cell>
                  <Table.Cell className="font-mono text-xs">{row.salesforceId}</Table.Cell>
                  <Table.Cell>{row.entityType ?? "—"}</Table.Cell>
                  <Table.Cell>{row.attempts}</Table.Cell>
                  <Table.Cell>{formatWhen(row.receivedAt)}</Table.Cell>
                  <Table.Cell className="max-w-xs truncate" title={row.error ?? ""}>
                    {row.error ?? "—"}
                  </Table.Cell>
                  <Table.Cell>
                    {(row.status === "failed" || row.status === "skipped") && (
                      <Button size="small" variant="secondary" onClick={() => void retryWebhookEvent(row.id)}>
                        Retry
                      </Button>
                    )}
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <Heading level="h2">Sync failures</Heading>
        <p className="text-ui-fg-subtle txt-compact-small">
          Workflow failures after retries. Use Push/Pull on entity detail widgets for manual runs.
        </p>
        {Object.keys(selected).some((k) => selected[k]) ? (
          <Button size="small" variant="primary" onClick={() => void retryBulkFailures()}>
            Retry selected
          </Button>
        ) : null}
        {loadingFailures ? (
          <span className="txt-compact-small">Loading…</span>
        ) : (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell />
                <Table.HeaderCell>Entity</Table.HeaderCell>
                <Table.HeaderCell>Medusa ID</Table.HeaderCell>
                <Table.HeaderCell>Failures</Table.HeaderCell>
                <Table.HeaderCell>Last error</Table.HeaderCell>
                <Table.HeaderCell />
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {items.map((row) => (
                <Table.Row key={row.id}>
                  <Table.Cell>
                    <Checkbox
                      checked={!!selected[row.id]}
                      onCheckedChange={(c) =>
                        setSelected((s) => ({ ...s, [row.id]: c === true }))
                      }
                    />
                  </Table.Cell>
                  <Table.Cell>{row.entityType}</Table.Cell>
                  <Table.Cell>
                    <Link className="text-ui-fg-interactive underline" to={medusaPath(row)}>
                      {row.medusaId}
                    </Link>
                  </Table.Cell>
                  <Table.Cell>{row.failureCount}</Table.Cell>
                  <Table.Cell className="max-w-md truncate" title={row.lastError ?? ""}>
                    {row.lastError ?? "—"}
                  </Table.Cell>
                  <Table.Cell className="flex gap-2">
                    {row.openInSalesforceUrl ? (
                      <Button
                        size="small"
                        variant="secondary"
                        type="button"
                        onClick={() =>
                          window.open(row.openInSalesforceUrl!, "_blank", "noopener,noreferrer")
                        }
                      >
                        Salesforce
                      </Button>
                    ) : null}
                    <Button size="small" variant="primary" onClick={() => void retryFailure(row.id)}>
                      Retry
                    </Button>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        )}
      </section>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Salesforce sync",
  icon: BuildingStorefront,
})

export default SalesforceSyncPage
