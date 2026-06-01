import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { AdminProductCategory, DetailWidgetProps } from "@medusajs/types"
import { Button, Container, Heading } from "@medusajs/ui"
import { useEffect, useState } from "react"

import { sanityStructureCategoryUrl } from "../../utils/sanity-structure-url"

declare const __MEDUSA_ADMIN_SANITY_STUDIO_BASE__: string

function pickOpenInSanityUrlFromStatusJson(json: Record<string, unknown>): string | null {
  const a = json.openInSanityUrl ?? json.open_in_sanity_url
  if (typeof a === "string" && a.length > 0) return a
  return null
}

function studioCategoryStructureUrl(medusaCategoryId: string): string | null {
  const raw =
    typeof __MEDUSA_ADMIN_SANITY_STUDIO_BASE__ !== "undefined" ? __MEDUSA_ADMIN_SANITY_STUDIO_BASE__ : ""
  const base = raw.replace(/\/$/, "")
  if (!base) return null
  return sanityStructureCategoryUrl(base, medusaCategoryId)
}

const ProductCategorySanityWidget = ({
  data: category,
}: DetailWidgetProps<AdminProductCategory>) => {
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null | undefined>(undefined)
  const [sanityOpenUrlOverride, setSanityOpenUrlOverride] = useState<string | null | undefined>(undefined)
  const [pushing, setPushing] = useState(false)

  const resolvedOpenInSanityUrl =
    (typeof sanityOpenUrlOverride === "string" && sanityOpenUrlOverride) ||
    studioCategoryStructureUrl(category.id) ||
    null

  const loadStatus = async () => {
    setLastSyncedAt(undefined)
    try {
      const res = await fetch(`/admin/sanity/categories/${category.id}`, {
        credentials: "include",
      })
      const json = (await res.json()) as Record<string, unknown>
      setLastSyncedAt((json.lastSyncedAt as string | null | undefined) ?? null)
      setSanityOpenUrlOverride(pickOpenInSanityUrlFromStatusJson(json))
    } catch {
      setLastSyncedAt(null)
      setSanityOpenUrlOverride(null)
    }
  }

  useEffect(() => {
    void loadStatus()
  }, [category.id])

  const syncToSanity = async () => {
    setPushing(true)
    try {
      const res = await fetch(`/admin/sanity/categories/${category.id}`, {
        method: "POST",
        credentials: "include",
      })
      const json = (await res.json()) as Record<string, unknown>
      if ("lastSyncedAt" in json) {
        const t = json.lastSyncedAt
        setLastSyncedAt(t == null || typeof t === "string" ? t : null)
      }
      const picked = pickOpenInSanityUrlFromStatusJson(json)
      if (picked !== null) setSanityOpenUrlOverride(picked)
    } finally {
      setPushing(false)
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex flex-col gap-3 px-6 py-4">
        <Heading level="h2">Sanity</Heading>
        <div className="flex items-center justify-between gap-4 rounded-md border border-ui-border-base bg-ui-bg-subtle px-4 py-3">
          <div className="flex flex-col gap-0.5">
            <span className="txt-compact-small font-medium">Mirror status</span>
            <span className="txt-compact-xsmall text-ui-fg-subtle">
              {lastSyncedAt === undefined
                ? "Checking…"
                : lastSyncedAt
                  ? `Last synced ${new Date(lastSyncedAt).toLocaleString()}`
                  : "Not yet synced to Sanity"}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {resolvedOpenInSanityUrl ? (
              <Button
                size="small"
                variant="secondary"
                type="button"
                onClick={() => {
                  window.open(resolvedOpenInSanityUrl, "_blank", "noopener,noreferrer")
                }}
              >
                Open in Sanity
              </Button>
            ) : null}
            <Button
              size="small"
              variant="secondary"
              onClick={() => void syncToSanity()}
              disabled={pushing}
            >
              {pushing ? "Syncing…" : "Sync to Sanity"}
            </Button>
          </div>
        </div>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product_category.details.side.after",
})

export default ProductCategorySanityWidget
