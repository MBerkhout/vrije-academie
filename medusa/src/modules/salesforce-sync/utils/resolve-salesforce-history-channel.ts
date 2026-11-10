import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

const CHANNEL_NAME = "Salesforce historie"

/** Dedicated sales channel for imported historical orders (admin reporting filter). */
export async function resolveSalesforceHistorySalesChannelId(
  container: MedusaContainer
): Promise<string> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data: channels } = await query.graph({
    entity: "sales_channel",
    fields: ["id", "name"],
  })
  const list = (channels ?? []) as { id?: string; name?: string }[]
  const existing = list.find((c) => c.name?.trim() === CHANNEL_NAME)
  if (existing?.id) return existing.id

  const salesChannelModule = container.resolve(Modules.SALES_CHANNEL) as {
    createSalesChannels: (data: { name: string }[]) => Promise<{ id: string }[]>
  }
  const [created] = await salesChannelModule.createSalesChannels([{ name: CHANNEL_NAME }])
  if (!created?.id) {
    throw new Error("Could not create Salesforce historie sales channel")
  }
  return created.id
}
