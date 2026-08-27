import { isFutureSession } from "./event-session-eligibility"
import { isVathuisUnlimitedAvailability } from "./vathuis-availability"

type EventItemRow = {
  start_at?: string | null
  available_quantity?: number | null
  delivery_type?: string | null
}

type VariantRow = {
  id?: string
  purchasable?: boolean | null
  event_item?: EventItemRow | null
}

type EventSoldOutInput = {
  record_type?: string | null
  purchase_mode?: string | null
  min_available_quantity?: number | null
  variants?: VariantRow[] | null
  bundle_variant_id?: string | null
}

function pricingVariants(event: EventSoldOutInput): VariantRow[] {
  const variants = event.variants ?? []
  if (event.purchase_mode === "bundle_only" && event.bundle_variant_id) {
    const bundle = variants.find((v) => v.id === event.bundle_variant_id)
    return bundle ? [bundle] : variants.filter((v) => v.purchasable !== false)
  }
  return variants.filter((v) => v.purchasable !== false)
}

function bookableVariants(event: EventSoldOutInput, nowMs: number): VariantRow[] {
  return pricingVariants(event).filter((variant) => {
    if (!variant.event_item) return true
    return isFutureSession(variant.event_item, nowMs)
  })
}

/** Mirrors storefront `eventIsFullySoldOut` in frontend/src/lib/event-status-presentation.ts */
export function eventIsFullySoldOut(
  event: EventSoldOutInput,
  now: Date = new Date()
): boolean {
  if (
    isVathuisUnlimitedAvailability({
      recordType: event.record_type,
      purchaseMode: event.purchase_mode,
    })
  ) {
    return false
  }

  const nowMs = now.getTime()
  const variants = bookableVariants(event, nowMs)
  if (variants.length === 0) {
    return event.min_available_quantity === 0
  }
  return variants.every((variant) => Number(variant.event_item?.available_quantity ?? 0) === 0)
}
