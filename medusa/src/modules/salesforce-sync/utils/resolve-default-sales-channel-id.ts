import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

/** Resolve the store default sales channel, or the first available channel. */
export async function resolveDefaultSalesChannelId(
  container: MedusaContainer
): Promise<string> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data: stores } = await query.graph({
    entity: "store",
    fields: ["default_sales_channel_id"],
  })
  const fromStore = (stores?.[0] as { default_sales_channel_id?: string | null })
    ?.default_sales_channel_id
  if (fromStore) return fromStore

  const { data: channels } = await query.graph({
    entity: "sales_channel",
    fields: ["id", "name"],
  })
  const list = (channels ?? []) as { id?: string; name?: string }[]
  const match =
    list.find((c) => c.name?.trim().toLowerCase() === "default") ?? list[0]
  if (!match?.id) {
    throw new Error(
      "No sales channel found. Create a default sales channel in Medusa Admin before importing product groups."
    )
  }
  return match.id
}
