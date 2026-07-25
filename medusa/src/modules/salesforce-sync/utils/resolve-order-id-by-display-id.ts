import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export async function resolveOrderIdByDisplayId(
  container: MedusaContainer,
  displayId: number
): Promise<string> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data: orders } = await query.graph({
    entity: "order",
    fields: ["id", "display_id", "status"],
    filters: { display_id: displayId },
  })

  const matches = orders ?? []

  if (matches.length === 0) {
    throw new Error(`No order found with display_id ${displayId}`)
  }
  if (matches.length > 1) {
    throw new Error(`Multiple orders with display_id ${displayId}`)
  }

  return (matches[0] as { id: string }).id
}
