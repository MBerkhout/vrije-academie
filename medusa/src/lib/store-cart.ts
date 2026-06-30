import {
  ContainerRegistrationKeys,
  MedusaError,
  remoteQueryObjectFromString,
} from "@medusajs/framework/utils"

/** Subset of default store cart fields; includes totals and gift-card–relevant relations. */
const REFETCH_CART_FIELDS = [
  "id",
  "currency_code",
  "region_id",
  "total",
  "subtotal",
  "tax_total",
  "discount_total",
  "item_total",
  "item_subtotal",
  "shipping_total",
  "credit_line_total",
  "metadata",
  "items.id",
  "items.title",
  "items.quantity",
  "items.unit_price",
  "items.is_giftcard",
  "items.metadata",
  "items.variant_id",
  "credit_lines.id",
  "credit_lines.amount",
  "credit_lines.reference",
  "credit_lines.reference_id",
  "credit_lines.metadata",
  "promotions.id",
  "promotions.code",
  "promotions.is_automatic",
]

export async function refetchStoreCart(scope: any, cartId: string) {
  const remoteQuery = scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
  const queryObject = remoteQueryObjectFromString({
    entryPoint: "cart",
    variables: { filters: { id: cartId } },
    fields: REFETCH_CART_FIELDS,
  })
  const [cart] = await remoteQuery(queryObject)
  if (!cart) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, `Cart '${cartId}' not found`)
  }
  return cart as Record<string, any>
}

export function toNumber(value: unknown): number {
  if (value == null) return 0
  if (typeof value === "number") return value
  if (typeof value === "object" && value !== null && "numeric_" in (value as object)) {
    return Number((value as { numeric_: number }).numeric_)
  }
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}
