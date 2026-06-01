/**
 * Domain mapping: Medusa `ProductVariant` = Product (concrete event instance).
 */
import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { AdminProductVariant, DetailWidgetProps } from "@medusajs/types"
import { Button, Container, Heading, Input, Label, Select } from "@medusajs/ui"
import { useEffect, useState } from "react"

import { DELIVERY_TYPES } from "../../modules/events/types"
import { SalesforceEntityPanel } from "./lib/salesforce-entity-panel"

const ProductVariantWidget = ({
  data: variant,
}: DetailWidgetProps<AdminProductVariant>) => {
  const [deliveryType, setDeliveryType] = useState<string>("online")
  const [availableQty, setAvailableQty] = useState<number>(0)
  const [startAt, setStartAt] = useState<string>("")
  const [endAt, setEndAt] = useState<string>("")
  const [city, setCity] = useState<string>("")
  const [registrationDeadlineAt, setRegistrationDeadlineAt] = useState<string>("")
  const [isFreeTrial, setIsFreeTrial] = useState<boolean>(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [propsList, setPropsList] = useState<
    { id: string; key: string; value: string }[]
  >([])
  const [newKey, setNewKey] = useState("")
  const [newValue, setNewValue] = useState("")

  const load = async () => {
    setLoading(true)
    try {
      const [vRes, pRes] = await Promise.all([
        fetch(`/admin/events/variants/${variant.id}`, { credentials: "include" }),
        fetch(
          `/admin/events/properties?owner_type=variant&owner_id=${encodeURIComponent(variant.id)}`,
          { credentials: "include" }
        ),
      ])
      const vJson = await vRes.json()
      if (vJson?.event_item?.delivery_type) setDeliveryType(vJson.event_item.delivery_type)
      if (vJson?.event_item?.available_quantity !== undefined) setAvailableQty(Number(vJson.event_item.available_quantity))
      if (vJson?.event_item?.start_at) setStartAt(vJson.event_item.start_at.slice(0, 16))
      if (vJson?.event_item?.end_at) setEndAt(vJson.event_item.end_at.slice(0, 16))
      if (vJson?.event_item?.city) setCity(vJson.event_item.city ?? "")
      if (vJson?.event_item?.registration_deadline_at) setRegistrationDeadlineAt(vJson.event_item.registration_deadline_at.slice(0, 16))
      if (vJson?.event_item?.is_free_trial !== undefined) setIsFreeTrial(!!vJson.event_item.is_free_trial)
      const pJson = await pRes.json()
      setPropsList(pJson.properties ?? [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [variant.id])

  const saveVariant = async () => {
    setSaving(true)
    try {
      await fetch(`/admin/events/variants/${variant.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          delivery_type: deliveryType,
          available_quantity: availableQty,
          start_at: startAt ? new Date(startAt).toISOString() : null,
          end_at: endAt ? new Date(endAt).toISOString() : null,
          city: city || null,
          registration_deadline_at: registrationDeadlineAt ? new Date(registrationDeadlineAt).toISOString() : null,
          is_free_trial: isFreeTrial,
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
        body: JSON.stringify({ owner_type: "variant", owner_id: variant.id, key: newKey.trim(), value: newValue }),
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

  return (
    <Container className="divide-y p-0">
      <div className="flex flex-col gap-4 px-6 py-4">
        <Heading level="h2">Product</Heading>
        <p className="text-ui-fg-subtle txt-compact-small">
          Medusa entity: Product variant. Set delivery type, dates, city, available quantity, and properties.
        </p>
        {loading ? (
          <span className="txt-compact-small">Loading…</span>
        ) : (
          <>
            <div className="flex flex-col gap-3 max-w-sm">
              <div className="flex flex-col gap-2">
                <Label size="xsmall">Delivery type</Label>
                <Select value={deliveryType} onValueChange={setDeliveryType}>
                  <Select.Trigger><Select.Value placeholder="Delivery type" /></Select.Trigger>
                  <Select.Content>
                    {DELIVERY_TYPES.map((dt) => (
                      <Select.Item key={dt} value={dt}>{dt}</Select.Item>
                    ))}
                  </Select.Content>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label size="xsmall">Available quantity</Label>
                <Input
                  type="number"
                  min={0}
                  value={String(availableQty)}
                  onChange={(e) => setAvailableQty(Number(e.target.value) || 0)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label size="xsmall">Start date &amp; time</Label>
                <Input
                  type="datetime-local"
                  value={startAt}
                  onChange={(e) => setStartAt(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label size="xsmall">End date &amp; time</Label>
                <Input
                  type="datetime-local"
                  value={endAt}
                  onChange={(e) => setEndAt(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label size="xsmall">City (offline)</Label>
                <Input
                  placeholder="e.g. Amsterdam"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label size="xsmall">Registration deadline</Label>
                <Input
                  type="datetime-local"
                  value={registrationDeadlineAt}
                  onChange={(e) => setRegistrationDeadlineAt(e.target.value)}
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isFreeTrial}
                  onChange={(e) => setIsFreeTrial(e.target.checked)}
                  className="h-4 w-4 rounded border-ui-border-base accent-ui-button-inverted"
                />
                <span className="txt-compact-small">Free trial session</span>
              </label>
              <Button size="small" variant="primary" onClick={() => void saveVariant()} disabled={saving}>
                Save product fields
              </Button>
            </div>

            <SalesforceEntityPanel apiSegment="variants" entityId={variant.id} showPull={false} />

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
          </>
        )}
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({ zone: "product_variant.details.after" })
export default ProductVariantWidget
