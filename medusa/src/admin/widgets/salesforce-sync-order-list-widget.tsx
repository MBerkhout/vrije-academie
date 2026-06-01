import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container, Text } from "@medusajs/ui"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"

/**
 * Banner on order list when there are Salesforce sync failures.
 */
const SalesforceSyncOrderListWidget = () => {
  const [count, setCount] = useState(0)
  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/admin/salesforce/failures?status=error&limit=100", {
          credentials: "include",
        })
        const json = (await res.json()) as { count?: number; items?: unknown[] }
        setCount(Array.isArray(json.items) ? json.items.length : json.count ?? 0)
      } catch {
        setCount(0)
      }
    })()
  }, [])

  if (!count) return null

  return (
    <Container className="mb-4 border-ui-border-warning bg-ui-bg-subtle-hover">
      <div className="flex items-center justify-between gap-4 px-4 py-3">
        <Text size="small">
          {count} Salesforce sync failure(s).{" "}
          <Link to="/salesforce-sync" className="text-ui-fg-interactive underline">
            Open Salesforce sync
          </Link>
        </Text>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({ zone: "order.list.before" })
export default SalesforceSyncOrderListWidget
