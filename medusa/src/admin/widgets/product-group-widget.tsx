/**
 * Domain mapping: Medusa `Product` = Product Group (event / series).
 * Widget covers: record_type, properties, categories, docenten, Sanity sync.
 */
import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { AdminProduct, DetailWidgetProps } from "@medusajs/types"
import { Button, Container, Heading, Input, Label, Select } from "@medusajs/ui"
import { useEffect, useState } from "react"

import { RECORD_TYPES } from "../../modules/events/types"
import { sanityStructureProductUrl } from "../../utils/sanity-structure-url"
import { SalesforceEntityPanel } from "./lib/salesforce-entity-panel"

/**
 * Injected via `medusa-config.ts` → `admin.vite.define` from SANITY_STUDIO_URL / SANITY_PROJECT_ID
 * (same rules as the API’s `openInSanityUrl`), so “Open in Sanity” works even if GET omits the field.
 */
declare const __MEDUSA_ADMIN_SANITY_STUDIO_BASE__: string

function pickOpenInSanityUrlFromStatusJson(json: Record<string, unknown>): string | null {
  const a = json.openInSanityUrl ?? json.open_in_sanity_url
  if (typeof a === "string" && a.length > 0) return a
  return null
}

/** Same path rules as GET /admin/sanity/products/:id → `openInSanityUrl`. */
function studioProductStructureUrl(medusaProductId: string): string | null {
  const raw =
    typeof __MEDUSA_ADMIN_SANITY_STUDIO_BASE__ !== "undefined" ? __MEDUSA_ADMIN_SANITY_STUDIO_BASE__ : ""
  const base = raw.replace(/\/$/, "")
  if (!base) return null
  return sanityStructureProductUrl(base, medusaProductId)
}

type CategoryRow = { id: string; slug: string; label: string }
type DocentRow = { id: string; slug: string; name: string }
type PropertyRow = { id: string; key: string; value: string }

const ProductGroupWidget = ({
  data: product,
}: DetailWidgetProps<AdminProduct>) => {
  const [recordType, setRecordType] = useState<string>("collegereeks")
  const [hasFreeTrial, setHasFreeTrial] = useState<boolean>(false)
  const [showInPlp, setShowInPlp] = useState<boolean>(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [propsList, setPropsList] = useState<PropertyRow[]>([])
  const [newKey, setNewKey] = useState("")
  const [newValue, setNewValue] = useState("")

  const [allCategories, setAllCategories] = useState<CategoryRow[]>([])
  const [linkedCategories, setLinkedCategories] = useState<CategoryRow[]>([])
  const [addCategoryId, setAddCategoryId] = useState<string>("")

  const [allDocenten, setAllDocenten] = useState<DocentRow[]>([])
  const [linkedDocenten, setLinkedDocenten] = useState<DocentRow[]>([])
  const [addDocentId, setAddDocentId] = useState<string>("")

  const [lastSyncedAt, setLastSyncedAt] = useState<string | null | undefined>(undefined)
  /** From API, when present; otherwise null after load. Fallback URL via `studioProductStructureUrl`. */
  const [sanityOpenUrlOverride, setSanityOpenUrlOverride] = useState<string | null | undefined>(undefined)
  const [pushing, setPushing] = useState(false)

  const resolvedOpenInSanityUrl =
    (typeof sanityOpenUrlOverride === "string" && sanityOpenUrlOverride) ||
    studioProductStructureUrl(product.id) ||
    null

  const load = async () => {
    setLoading(true)
    try {
      const [gRes, pRes, allCatRes, linkedCatRes, allDocRes, linkedDocRes, statusRes] = await Promise.all([
        fetch(`/admin/events/product-groups/${product.id}`, { credentials: "include" }),
        fetch(
          `/admin/events/properties?owner_type=product&owner_id=${encodeURIComponent(product.id)}`,
          { credentials: "include" }
        ),
        fetch(`/admin/catalog/categories`, { credentials: "include" }),
        fetch(`/admin/catalog/product-groups/${product.id}/categories`, { credentials: "include" }),
        fetch(`/admin/people/docenten`, { credentials: "include" }),
        fetch(`/admin/people/product-groups/${product.id}/docenten`, { credentials: "include" }),
        fetch(`/admin/sanity/products/${product.id}`, { credentials: "include" }),
      ])
      const gJson = await gRes.json()
      if (gJson?.event_group?.record_type) setRecordType(gJson.event_group.record_type)
      if (gJson?.event_group?.has_free_trial !== undefined) setHasFreeTrial(!!gJson.event_group.has_free_trial)
      if (gJson?.event_group?.show_in_plp !== undefined) setShowInPlp(!!gJson.event_group.show_in_plp)
      else setShowInPlp(true)
      const pJson = await pRes.json()
      setPropsList(pJson.properties ?? [])
      const allCatJson = await allCatRes.json()
      setAllCategories(allCatJson.categories ?? [])
      const linkedCatJson = await linkedCatRes.json()
      setLinkedCategories(linkedCatJson.categories ?? [])
      const allDocJson = await allDocRes.json()
      setAllDocenten(allDocJson.docenten ?? [])
      const linkedDocJson = await linkedDocRes.json()
      setLinkedDocenten(linkedDocJson.docenten ?? [])
      const statusJson = (await statusRes.json()) as Record<string, unknown>
      setLastSyncedAt((statusJson.lastSyncedAt as string | null | undefined) ?? null)
      setSanityOpenUrlOverride(pickOpenInSanityUrlFromStatusJson(statusJson))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [product.id])

  const pushToSanity = async () => {
    setPushing(true)
    try {
      const res = await fetch(`/admin/sanity/products/${product.id}`, {
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

  const saveGroup = async () => {
    setSaving(true)
    try {
      await fetch(`/admin/events/product-groups/${product.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          record_type: recordType,
          has_free_trial: hasFreeTrial,
          show_in_plp: showInPlp,
        }),
      })
      await load()
    } finally {
      setSaving(false)
    }
  }

  const addProperty = async () => {
    if (!newKey.trim()) return
    setSaving(true)
    try {
      await fetch(`/admin/events/properties`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner_type: "product", owner_id: product.id, key: newKey.trim(), value: newValue }),
      })
      setNewKey("")
      setNewValue("")
      await load()
    } finally {
      setSaving(false)
    }
  }

  const removeProperty = async (id: string) => {
    setSaving(true)
    try {
      await fetch(`/admin/events/properties/${id}`, { method: "DELETE", credentials: "include" })
      await load()
    } finally {
      setSaving(false)
    }
  }

  const addCategory = async () => {
    if (!addCategoryId) return
    setSaving(true)
    try {
      await fetch(`/admin/catalog/product-groups/${product.id}/categories`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category_id: addCategoryId }),
      })
      setAddCategoryId("")
      await load()
    } finally {
      setSaving(false)
    }
  }

  const removeCategory = async (categoryId: string) => {
    setSaving(true)
    try {
      await fetch(
        `/admin/catalog/product-groups/${product.id}/categories?category_id=${encodeURIComponent(categoryId)}`,
        { method: "DELETE", credentials: "include" }
      )
      await load()
    } finally {
      setSaving(false)
    }
  }

  const addDocent = async () => {
    if (!addDocentId) return
    setSaving(true)
    try {
      await fetch(`/admin/people/product-groups/${product.id}/docenten`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docent_id: addDocentId }),
      })
      setAddDocentId("")
      await load()
    } finally {
      setSaving(false)
    }
  }

  const removeDocent = async (docentId: string) => {
    setSaving(true)
    try {
      await fetch(
        `/admin/people/product-groups/${product.id}/docenten?docent_id=${encodeURIComponent(docentId)}`,
        { method: "DELETE", credentials: "include" }
      )
      await load()
    } finally {
      setSaving(false)
    }
  }

  const unlinkedCategories = allCategories.filter(
    (c) => !linkedCategories.some((lc) => lc.id === c.id)
  )
  const unlinkedDocenten = allDocenten.filter(
    (d) => !linkedDocenten.some((ld) => ld.id === d.id)
  )

  return (
    <Container className="divide-y p-0">
      <div className="flex flex-col gap-4 px-6 py-4">
        <Heading level="h2">Product Group</Heading>
        <p className="text-ui-fg-subtle txt-compact-small">
          Medusa entity: Product. Set the record type, Ons-aanbod listing, categories, docenten, and properties.
        </p>
        {loading ? (
          <span className="txt-compact-small">Loading…</span>
        ) : (
          <>
            {/* Record type */}
            <div className="flex flex-col gap-2 max-w-sm">
              <Label size="xsmall">Record type</Label>
              <Select value={recordType} onValueChange={setRecordType}>
                <Select.Trigger><Select.Value placeholder="Record type" /></Select.Trigger>
                <Select.Content>
                  {RECORD_TYPES.map((rt) => (
                    <Select.Item key={rt} value={rt}>{rt}</Select.Item>
                  ))}
                </Select.Content>
              </Select>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasFreeTrial}
                  onChange={(e) => setHasFreeTrial(e.target.checked)}
                  className="h-4 w-4 rounded border-ui-border-base accent-ui-button-inverted"
                />
                <span className="txt-compact-small">Has free trial lesson</span>
              </label>
              <label
                className={`flex items-center gap-2 ${recordType === "vathuis" ? "opacity-60" : "cursor-pointer"}`}
              >
                <input
                  type="checkbox"
                  checked={showInPlp}
                  onChange={(e) => setShowInPlp(e.target.checked)}
                  disabled={recordType === "vathuis"}
                  className="h-4 w-4 rounded border-ui-border-base accent-ui-button-inverted"
                />
                <span className="txt-compact-small">
                  {recordType === "vathuis"
                    ? "VAthuis — listed via GET /store/vathuis only"
                    : "Show on Ons aanbod (storefront listing)"}
                </span>
              </label>
              <Button size="small" variant="primary" onClick={() => void saveGroup()} disabled={saving}>
                Save record type
              </Button>
            </div>

            {/* Categories */}
            <div className="flex flex-col gap-2">
              <Heading level="h3">Categories</Heading>
              <ul className="flex flex-wrap gap-2">
                {linkedCategories.map((c) => (
                  <li key={c.id} className="flex items-center gap-1 border border-ui-border-base rounded-md px-2 py-1">
                    <span className="txt-compact-small">{c.label}</span>
                    <Button size="small" variant="transparent" onClick={() => void removeCategory(c.id)} disabled={saving}>×</Button>
                  </li>
                ))}
              </ul>
              {unlinkedCategories.length > 0 && (
                <div className="flex gap-2 max-w-sm">
                  <Select value={addCategoryId} onValueChange={setAddCategoryId}>
                    <Select.Trigger><Select.Value placeholder="Add category…" /></Select.Trigger>
                    <Select.Content>
                      {unlinkedCategories.map((c) => (
                        <Select.Item key={c.id} value={c.id}>{c.label}</Select.Item>
                      ))}
                    </Select.Content>
                  </Select>
                  <Button size="small" variant="secondary" onClick={() => void addCategory()} disabled={saving || !addCategoryId}>
                    Add
                  </Button>
                </div>
              )}
            </div>

            {/* Docenten */}
            <div className="flex flex-col gap-2">
              <Heading level="h3">Docenten</Heading>
              <ul className="flex flex-wrap gap-2">
                {linkedDocenten.map((d) => (
                  <li key={d.id} className="flex items-center gap-1 border border-ui-border-base rounded-md px-2 py-1">
                    <span className="txt-compact-small">{d.name}</span>
                    <Button size="small" variant="transparent" onClick={() => void removeDocent(d.id)} disabled={saving}>×</Button>
                  </li>
                ))}
              </ul>
              {unlinkedDocenten.length > 0 && (
                <div className="flex gap-2 max-w-sm">
                  <Select value={addDocentId} onValueChange={setAddDocentId}>
                    <Select.Trigger><Select.Value placeholder="Add docent…" /></Select.Trigger>
                    <Select.Content>
                      {unlinkedDocenten.map((d) => (
                        <Select.Item key={d.id} value={d.id}>{d.name}</Select.Item>
                      ))}
                    </Select.Content>
                  </Select>
                  <Button size="small" variant="secondary" onClick={() => void addDocent()} disabled={saving || !addDocentId}>
                    Add
                  </Button>
                </div>
              )}
            </div>

            {/* Properties */}
            <div className="flex flex-col gap-2">
              <Heading level="h3">Properties</Heading>
              <ul className="flex flex-col gap-2">
                {propsList.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2 border border-ui-border-base rounded-md px-3 py-2">
                    <span className="txt-compact-small"><strong>{p.key}</strong>: {p.value}</span>
                    <Button size="small" variant="transparent" onClick={() => void removeProperty(p.id)} disabled={saving}>Remove</Button>
                  </li>
                ))}
              </ul>
              <div className="grid grid-cols-2 gap-2 max-w-xl">
                <Input placeholder="Key" value={newKey} onChange={(e) => setNewKey(e.target.value)} />
                <Input placeholder="Value" value={newValue} onChange={(e) => setNewValue(e.target.value)} />
              </div>
              <Button size="small" variant="secondary" onClick={() => void addProperty()} disabled={saving}>
                Add property
              </Button>
            </div>

            {/* Salesforce sync */}
            <SalesforceEntityPanel apiSegment="products" entityId={product.id} />

            {/* Sanity sync */}
            <div className="flex items-center justify-between gap-4 rounded-md border border-ui-border-base bg-ui-bg-subtle px-4 py-3">
              <div className="flex flex-col gap-0.5">
                <span className="txt-compact-small font-medium">Sanity</span>
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
                <Button size="small" variant="secondary" onClick={() => void pushToSanity()} disabled={pushing}>
                  {pushing ? "Pushing…" : "Push to Sanity"}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({ zone: "product.details.after" })
export default ProductGroupWidget
