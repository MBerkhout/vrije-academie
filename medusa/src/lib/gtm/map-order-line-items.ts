import { medusaOrderMoneyToCents } from "../../modules/salesforce-sync/utils/money"

export type GtmCommerceItem = {
  item_id: string
  item_name: string
  item_category?: string
  item_category2?: string
  item_variant?: string
  price: number
  quantity: number
}

function centsToEur(cents: number): number {
  return Math.round(cents) / 100
}

function nonEmpty(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  return trimmed || undefined
}

function itemVariantFromEventItem(eventItem: Record<string, unknown> | null | undefined): string | undefined {
  if (!eventItem) return undefined
  let city = nonEmpty(eventItem.city)
  if (!city && eventItem.delivery_type === "online") city = "Online"
  const startAt = nonEmpty(eventItem.start_at as string | undefined)
  const parts = [city, startAt].filter(Boolean)
  return parts.length > 0 ? parts.join(" - ") : undefined
}

function categoryFromMetadata(metadata: Record<string, unknown> | null | undefined): string | undefined {
  const categories = metadata?.categories
  if (!Array.isArray(categories) || categories.length === 0) return undefined
  const first = categories[0] as { label?: string } | undefined
  return nonEmpty(first?.label)
}

function recordTypeFromMetadata(metadata: Record<string, unknown> | null | undefined): string | undefined {
  return (
    nonEmpty(metadata?.product_type as string | undefined) ??
    nonEmpty(metadata?.record_type as string | undefined)
  )
}

function isGiftCardLine(item: Record<string, unknown>): boolean {
  if (item.is_giftcard === true) return true
  const meta = item.metadata as { gift_card?: unknown } | null
  return !!meta?.gift_card
}

export function mapOrderLinesToGtmItems(itemsRaw: Record<string, unknown>[]): GtmCommerceItem[] {
  const items: GtmCommerceItem[] = []

  for (const item of itemsRaw) {
    const qty = Math.max(1, Number(item.quantity) || 1)
    const unitCents = medusaOrderMoneyToCents(item.unit_price)

    if (isGiftCardLine(item)) {
      const meta = item.metadata as { gift_card?: { amount_cents?: number } } | null
      const priceCents = meta?.gift_card?.amount_cents ?? unitCents
      items.push({
        item_id: "cadeaubon",
        item_name: nonEmpty(item.title as string) ?? "Digitale cadeaubon",
        item_category: "Cadeaubon",
        price: centsToEur(priceCents),
        quantity: qty,
      })
      continue
    }

    const variant = item.variant as Record<string, unknown> | undefined
    const product = (variant?.product as Record<string, unknown> | undefined) ?? {}
    const metadata = product.metadata as Record<string, unknown> | null | undefined
    const eventItem = variant?.event_item as Record<string, unknown> | undefined

    const commerceItem: GtmCommerceItem = {
      item_id: nonEmpty(product.handle as string) ?? String(item.id),
      item_name: nonEmpty(product.title as string) ?? nonEmpty(item.title as string) ?? "Product",
      price: centsToEur(unitCents),
      quantity: qty,
    }

    const category = categoryFromMetadata(metadata)
    if (category) commerceItem.item_category = category
    const recordType = recordTypeFromMetadata(metadata)
    if (recordType) commerceItem.item_category2 = recordType
    const variantLabel = itemVariantFromEventItem(eventItem)
    if (variantLabel) commerceItem.item_variant = variantLabel

    items.push(commerceItem)
  }

  return items
}
