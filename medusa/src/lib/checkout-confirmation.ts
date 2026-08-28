import { createHmac, timingSafeEqual } from "node:crypto"
import type { MedusaContainer } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"

import productDocentenLink from "../links/product-docenten"
import { vathuisCartDisplayFromProductMetadata } from "../modules/salesforce-sync/utils/vathuis-metadata"
import { medusaMajorToCents } from "./medusa-price-to-cents"
import { getEuVatRate } from "./eu-countries"
import { listCategoriesForProductIds } from "./product-catalog-category-links"
import { getVathuisRecommendations } from "./vathuis-recommendations"
import {
  extractMolliePaymentId,
  fetchMolliePaymentStatus,
  isMolliePaymentFailed,
} from "./mollie-payment-status"

function getTokenSecret(): string {
  return (
    process.env.THANK_YOU_SECRET?.trim() ||
    process.env.COOKIE_SECRET?.trim() ||
    "va-thank-you-default"
  )
}

export function generateViewToken(orderId: string): string {
  return createHmac("sha256", getTokenSecret()).update(orderId).digest("hex").slice(0, 24)
}

export function validateViewToken(orderId: string, token: string): boolean {
  const expected = generateViewToken(orderId)
  try {
    return timingSafeEqual(Buffer.from(expected, "utf8"), Buffer.from(token, "utf8"))
  } catch {
    return false
  }
}

function isVathuisProduct(metadata: Record<string, unknown> | null | undefined): boolean {
  const v = metadata?.vathuis as Record<string, unknown> | undefined
  return v?.purchase_mode === "bundle_only"
}

function parseMoney(value: unknown): number {
  if (value == null) return 0
  if (typeof value === "number") return value
  if (typeof value === "object" && value !== null && "numeric_" in (value as object)) {
    return Number((value as { numeric_: number }).numeric_)
  }
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function extractTaxRatePercent(order: Record<string, unknown>): number {
  const items = Array.isArray(order.items) ? order.items : []
  for (const item of items) {
    const taxLines = (item as { tax_lines?: { rate?: number | null }[] }).tax_lines
    if (!Array.isArray(taxLines)) continue
    for (const line of taxLines) {
      const rate = line?.rate
      if (typeof rate === "number" && rate > 0) return rate
    }
  }
  const shipping = order.shipping_address as { country_code?: string | null } | undefined
  const billing = order.billing_address as { country_code?: string | null } | undefined
  const country = shipping?.country_code ?? billing?.country_code
  return getEuVatRate(country)
}

export async function resolveOrderIdByCartId(
  scope: MedusaContainer,
  cartId: string
): Promise<string | null> {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: carts } = await query.graph({
    entity: "cart",
    fields: ["id", "order.id"],
    filters: { id: cartId },
  })
  const orderId = (carts?.[0] as { order?: { id?: string } } | undefined)?.order?.id
  if (orderId) return orderId

  const { data: links } = await query.graph({
    entity: "order_cart",
    fields: ["order_id"],
    filters: { cart_id: cartId },
  })
  const fromLink = (links?.[0] as { order_id?: string } | undefined)?.order_id
  return fromLink ?? null
}

export async function resolveOrderIdByPaymentSessionId(
  scope: MedusaContainer,
  sessionId: string
): Promise<string | null> {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: sessions } = await query.graph({
    entity: "payment_session",
    fields: ["id", "payment_collection.cart_id", "payment_collection.order.id"],
    filters: { id: sessionId },
  })
  const session = sessions?.[0] as
    | {
        payment_collection?: {
          cart_id?: string
          order?: { id?: string }
        }
      }
    | undefined

  const directOrderId = session?.payment_collection?.order?.id
  if (directOrderId) return directOrderId

  const cartId = session?.payment_collection?.cart_id
  if (cartId) {
    return resolveOrderIdByCartId(scope, cartId)
  }

  return null
}

export type CheckoutConfirmationResult = {
  status: "ready" | "pending" | "failed"
  order: Record<string, unknown> | null
  items: Array<Record<string, unknown>>
  notices: {
    show_offline: boolean
    show_online: boolean
  }
  primary_category: { slug: string; label: string } | null
  vathuis_recommendations: Record<string, unknown>[]
  /** HMAC token for re-visiting the page: /bedankt?order={id}&token={view_token} */
  view_token?: string
}

/** Payment session statuses that indicate the payment definitively failed. */
const FAILED_SESSION_STATUSES = new Set(["error", "canceled", "cancelled", "failed"])

type PaymentSessionRow = {
  id?: string
  status?: string
  updated_at?: string
  data?: unknown
}

async function listCartPaymentSessions(
  scope: MedusaContainer,
  cartId: string
): Promise<PaymentSessionRow[]> {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: carts } = await query.graph({
    entity: "cart",
    fields: [
      "id",
      "payment_collection.payment_sessions.id",
      "payment_collection.payment_sessions.status",
      "payment_collection.payment_sessions.updated_at",
      "payment_collection.payment_sessions.data",
    ],
    filters: { id: cartId },
  })

  const cart = carts?.[0] as
    | { payment_collection?: { payment_sessions?: PaymentSessionRow[] } }
    | undefined

  return cart?.payment_collection?.payment_sessions ?? []
}

async function isPaymentSessionFailed(session: PaymentSessionRow): Promise<boolean> {
  const medusaStatus = (session.status ?? "").toLowerCase()
  if (FAILED_SESSION_STATUSES.has(medusaStatus)) return true

  // After Mollie redirect, Medusa session is often still "pending" while Mollie is already canceled.
  const cachedMollieStatus =
    session.data && typeof session.data === "object"
      ? ((session.data as Record<string, unknown>).status as string | undefined)
      : undefined
  if (isMolliePaymentFailed(cachedMollieStatus)) return true

  const mollieId = extractMolliePaymentId(session.data)
  if (!mollieId) return false

  const liveStatus = await fetchMolliePaymentStatus(mollieId)
  return isMolliePaymentFailed(liveStatus)
}

/**
 * Returns true if the cart's latest payment session has definitively failed/been cancelled.
 */
async function isCartPaymentFailed(
  scope: MedusaContainer,
  cartId: string
): Promise<boolean> {
  try {
    const sessions = await listCartPaymentSessions(scope, cartId)
    if (!sessions.length) return false

    const sorted = [...sessions].sort(
      (a, b) =>
        new Date(b.updated_at ?? 0).getTime() - new Date(a.updated_at ?? 0).getTime()
    )

    return isPaymentSessionFailed(sorted[0])
  } catch {
    return false
  }
}

async function isPaymentSessionIdFailed(
  scope: MedusaContainer,
  sessionId: string
): Promise<boolean> {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)

  try {
    const { data: sessions } = await query.graph({
      entity: "payment_session",
      fields: ["id", "status", "updated_at", "data"],
      filters: { id: sessionId },
    })

    const session = sessions?.[0] as PaymentSessionRow | undefined
    if (!session) return false
    return isPaymentSessionFailed(session)
  } catch {
    return false
  }
}

async function enrichOrderItems(
  scope: MedusaContainer,
  order: Record<string, unknown>
): Promise<{
  items: Array<Record<string, unknown>>
  notices: { show_offline: boolean; show_online: boolean }
  purchasedProductIds: string[]
  categorySlugs: string[]
  firstVathuisHandle: string | null
  orderIsVathuis: boolean
  primaryCategory: { slug: string; label: string } | null
}> {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)
  const orderId = order.id as string

  const { data: orders } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "items.*",
      "items.variant.*",
      "items.variant.product.*",
      "items.variant.product.metadata",
      "items.variant.event_item.*",
    ],
    filters: { id: orderId },
  })

  const lineItems = ((orders?.[0] as { items?: unknown[] } | undefined)?.items ??
    order.items ??
    []) as Array<Record<string, unknown>>

  const productIds = [
    ...new Set(
      lineItems
        .map((item) => (item.variant as { product?: { id?: string } } | undefined)?.product?.id)
        .filter(Boolean) as string[]
    ),
  ]

  const docentsByProductId: Record<string, string[]> = {}
  let categorySlugsByProduct: Record<string, { slug: string }[]> = {}
  let primaryCategory: { slug: string; label: string } | null = null

  if (productIds.length) {
    const [{ data: docLinks }, categoryLookup] = await Promise.all([
      query.graph({
        entity: productDocentenLink.entryPoint,
        fields: ["product_id", "docent.name"],
        filters: { product_id: productIds },
      }),
      listCategoriesForProductIds(scope, productIds),
    ])

    categorySlugsByProduct = Object.fromEntries(
      Object.entries(categoryLookup.byProductId).map(([pid, cats]) => [
        pid,
        cats.map((c) => ({ slug: c.slug })),
      ])
    )

    // First category (by sort_order) across all purchased products
    const allCats = Object.values(categoryLookup.byProductId).flat()
    allCats.sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999))
    const firstCat = allCats[0]
    if (firstCat?.slug && firstCat?.label) {
      primaryCategory = { slug: firstCat.slug, label: firstCat.label }
    }
    for (const link of (docLinks ?? []) as Array<{ product_id?: string; docent?: { name?: string } }>) {
      const pid = link.product_id
      if (!pid || !link.docent?.name) continue
      if (!docentsByProductId[pid]) docentsByProductId[pid] = []
      docentsByProductId[pid].push(link.docent.name)
    }
  }

  let showOffline = false
  let showOnline = false
  let orderIsVathuis = false
  let firstVathuisHandle: string | null = null
  const purchasedProductIds: string[] = []
  const categorySlugs = new Set<string>()

  const items = lineItems.map((item) => {
    const variant = (item.variant as Record<string, unknown> | undefined) ?? {}
    const product = (variant.product as Record<string, unknown> | undefined) ?? {}
    const metadata = (product.metadata as Record<string, unknown> | undefined) ?? null
    const eventItem = (variant.event_item as Record<string, unknown> | undefined) ?? null
    const productId = product.id as string | undefined
    const isVathuis = isVathuisProduct(metadata)

    if (productId) purchasedProductIds.push(productId)
    if (isVathuis) {
      orderIsVathuis = true
      if (!firstVathuisHandle && typeof product.handle === "string") {
        firstVathuisHandle = product.handle
      }
    }

    for (const cat of categorySlugsByProduct[productId ?? ""] ?? []) {
      categorySlugs.add(cat.slug)
    }

    const deliveryType = (eventItem?.delivery_type as string | undefined)?.toLowerCase() ?? null
    if (!isVathuis) {
      if (deliveryType === "offline") showOffline = true
      if (deliveryType === "online") showOnline = true
    }

    const vathuis = vathuisCartDisplayFromProductMetadata(metadata)
    const qty = typeof item.quantity === "number" ? item.quantity : Number(item.quantity ?? 1)
    const unitMajor = parseMoney(item.unit_price)
    const totalMajor = parseMoney(item.total)
    const unitCents = medusaMajorToCents(unitMajor)
    const totalCents = totalMajor > 0 ? medusaMajorToCents(totalMajor) : unitCents * qty

    const instructorNames = eventItem?.instructor_name
      ? [String(eventItem.instructor_name).trim()].filter(Boolean)
      : docentsByProductId[productId ?? ""] ?? []

    return {
      id: item.id,
      title: item.title ?? product.title ?? "—",
      quantity: qty,
      unit_price: unitCents,
      total: totalCents,
      thumbnail: (item.thumbnail as string | null) ?? (product.thumbnail as string | null) ?? null,
      product_handle: (product.handle as string | null) ?? null,
      is_vathuis: isVathuis,
      event_item: eventItem
        ? {
            delivery_type: eventItem.delivery_type ?? null,
            start_at: eventItem.start_at ?? null,
            end_at: eventItem.end_at ?? null,
            city: eventItem.city ?? null,
          }
        : null,
      vathuis,
      instructor_names: instructorNames,
    }
  })

  return {
    items,
    notices: { show_offline: showOffline, show_online: showOnline },
    purchasedProductIds,
    categorySlugs: [...categorySlugs],
    firstVathuisHandle,
    orderIsVathuis,
    primaryCategory,
  }
}

export async function buildCheckoutConfirmation(
  scope: MedusaContainer,
  input: { order_id?: string; cart_id?: string; payment_session_id?: string; token?: string }
): Promise<CheckoutConfirmationResult> {
  let orderId = input.order_id?.trim() || null

  // If order_id + token provided, validate token before doing anything
  if (orderId && input.token?.trim()) {
    if (!validateViewToken(orderId, input.token.trim())) {
      throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Invalid or expired order token")
    }
  }

  if (!orderId && input.payment_session_id?.trim()) {
    orderId = await resolveOrderIdByPaymentSessionId(scope, input.payment_session_id.trim())
  }

  if (!orderId && input.cart_id?.trim()) {
    orderId = await resolveOrderIdByCartId(scope, input.cart_id.trim())
  }

  if (!orderId) {
    const cartId = input.cart_id?.trim() || null
    const sessionId = input.payment_session_id?.trim() || null

    const paymentFailed =
      (cartId && (await isCartPaymentFailed(scope, cartId))) ||
      (sessionId && (await isPaymentSessionIdFailed(scope, sessionId)))

    if (paymentFailed) {
      return {
        status: "failed",
        order: null,
        items: [],
        notices: { show_offline: false, show_online: false },
        primary_category: null,
        vathuis_recommendations: [],
      }
    }

    return {
      status: "pending",
      order: null,
      items: [],
      notices: { show_offline: false, show_online: false },
      primary_category: null,
      vathuis_recommendations: [],
    }
  }

  const query = scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: orders } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "display_id",
      "status",
      "email",
      "currency_code",
      "total",
      "subtotal",
      "discount_total",
      "tax_total",
      "item_total",
      "created_at",
      "shipping_address.first_name",
      "shipping_address.last_name",
      "shipping_address.country_code",
      "billing_address.country_code",
      "items.*",
      "items.tax_lines.rate",
    ],
    filters: { id: orderId },
  })

  const order = orders?.[0] as Record<string, unknown> | undefined
  if (!order) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, `Order '${orderId}' not found`)
  }

  const enriched = await enrichOrderItems(scope, order)

  const vathuisRecommendations = await getVathuisRecommendations(scope, {
    excludeProductIds: enriched.purchasedProductIds,
    categorySlugs: enriched.categorySlugs,
    similarToHandle: enriched.orderIsVathuis ? enriched.firstVathuisHandle : null,
  })

  const totalMajor = parseMoney(order.total)
  const subtotalMajor = parseMoney(order.subtotal)
  const discountMajor = parseMoney(order.discount_total)
  const taxMajor = parseMoney(order.tax_total)
  const taxRate = extractTaxRatePercent(order)

  const shippingAddr = order.shipping_address as Record<string, unknown> | undefined
  const firstName = (shippingAddr?.first_name as string | undefined)?.trim() || null

  return {
    status: "ready",
    order: {
      id: order.id,
      display_id: order.display_id,
      status: order.status,
      email: order.email,
      first_name: firstName,
      currency_code: order.currency_code,
      total: medusaMajorToCents(totalMajor),
      subtotal: medusaMajorToCents(subtotalMajor),
      discount_total: medusaMajorToCents(discountMajor),
      tax_total: medusaMajorToCents(taxMajor),
      tax_rate: taxRate,
      created_at: order.created_at,
    },
    items: enriched.items,
    notices: enriched.notices,
    primary_category: enriched.primaryCategory,
    vathuis_recommendations: vathuisRecommendations,
    view_token: generateViewToken(orderId),
  }
}
