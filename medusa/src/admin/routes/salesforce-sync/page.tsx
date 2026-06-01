import { defineRouteConfig } from "@medusajs/admin-sdk"
import { BuildingStorefront } from "@medusajs/icons"
import { Button, Container, Heading, Table, Checkbox } from "@medusajs/ui"
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

const SalesforceSyncPage = () => {
  const [items, setItems] = useState<FailureRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Record<string, boolean>>({})

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch("/admin/salesforce/failures?status=error,retrying&limit=100", {
        credentials: "include",
      })
      const json = (await res.json()) as { items: FailureRow[] }
      setItems(json.items ?? [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const medusaPath = (row: FailureRow) => {
    if (row.entityType === "customer") return `/customers/${row.medusaId}`
    if (row.entityType === "order") return `/orders/${row.medusaId}`
    if (row.entityType === "product") return `/products/${row.medusaId}`
    if (row.entityType === "variant") return `/products` // variant deep link varies; list is OK
    return "/"
  }

  const retryOne = async (id: string) => {
    await fetch(`/admin/salesforce/failures/${id}/retry`, {
      method: "POST",
      credentials: "include",
    })
    await load()
  }

  const retryBulk = async () => {
    const ids = Object.entries(selected).filter(([, v]) => v).map(([k]) => k)
    if (!ids.length) return
    await fetch("/admin/salesforce/failures/retry-bulk", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    })
    setSelected({})
    await load()
  }

  return (
    <Container className="p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <Heading level="h1">Salesforce sync</Heading>
        <Button size="small" variant="secondary" onClick={() => void load()} disabled={loading}>
          Refresh failures
        </Button>
      </div>
      <SalesforceOAuthPanel />
      <Heading level="h2">Sync failures</Heading>
      <p className="text-ui-fg-subtle txt-compact-small">
        Failures and retries. Use Push/Pull on entity detail widgets for manual runs.
      </p>
      {Object.keys(selected).some((k) => selected[k]) ? (
        <Button size="small" variant="primary" onClick={() => void retryBulk()}>
          Retry selected
        </Button>
      ) : null}
      {loading ? (
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
                      onClick={() => window.open(row.openInSalesforceUrl!, "_blank", "noopener,noreferrer")}
                    >
                      Salesforce
                    </Button>
                  ) : null}
                  <Button size="small" variant="primary" onClick={() => void retryOne(row.id)}>
                    Retry
                  </Button>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Salesforce sync",
  icon: BuildingStorefront,
})

export default SalesforceSyncPage
