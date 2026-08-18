import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError, MedusaService, Modules } from "@medusajs/framework/utils"
import type { ICustomerModuleService } from "@medusajs/framework/types"

import productEventGroupLink from "../../links/product-event-group"
import {
  loadVathuisEpisodeByKey,
  resolveVathuisEpisodePlayback,
} from "../../lib/vathuis-playback"
import type { AudiencePlayerPlaybackConfig } from "../../lib/audience-player/types"
import {
  isAccessActive,
  parseIsoDate,
  toIsoString,
  vathuisAccessExpiresAt,
} from "../../lib/vathuis-access-expiry"
import { CustomerVathuisAccess } from "./models/customer-vathuis-access"

function isGiftCardLine(item: Record<string, unknown>): boolean {
  if (item.is_giftcard === true) return true
  const meta = item.metadata as { gift_card?: unknown } | null
  return !!meta?.gift_card
}

export type VathuisAccessItem = {
  productId: string
  productHandle: string
  productTitle: string | null
  grantedAt: string
  expiresAt: string
  isExpired: boolean
}

export type VathuisAccessStatus = {
  hasAccess: boolean
  grantedAt: string | null
  expiresAt: string | null
}

type VathuisLineContext = {
  lineItemId: string
  variantId: string
  productId: string
  productHandle: string
  productTitle: string | null
}

class VathuisAccessModuleService extends MedusaService({
  CustomerVathuisAccess,
}) {
  private async resolveVathuisLines(
    container: MedusaContainer,
    orderId: string
  ): Promise<{
    customerId: string
    grantedAt: Date
    lines: VathuisLineContext[]
  } | null> {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    const { data: orders } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "customer_id",
        "created_at",
        "status",
        "items.id",
        "items.variant_id",
        "items.metadata",
        "items.is_giftcard",
      ],
      filters: { id: orderId },
    })

    const order = orders?.[0] as Record<string, unknown> | undefined
    if (!order) return null

    const customerId = order.customer_id as string | undefined
    if (!customerId) return null
    if (order.status !== "completed") return null

    const grantedAt = parseIsoDate(order.created_at as string) ?? new Date()
    const items = (order.items as Record<string, unknown>[]) ?? []
    const variantIds = [
      ...new Set(
        items
          .filter((item) => !isGiftCardLine(item))
          .map((item) => item.variant_id as string | undefined)
          .filter((id): id is string => Boolean(id))
      ),
    ]

    if (!variantIds.length) return { customerId, grantedAt, lines: [] }

    const { data: variants } = await query.graph({
      entity: "product_variant",
      fields: ["id", "product_id", "product.id", "product.handle", "product.title", "product.metadata"],
      filters: { id: variantIds },
    })

    const variantById = new Map(
      (variants ?? []).map((row) => {
        const v = row as Record<string, unknown>
        return [v.id as string, v]
      })
    )

    const productIds = [
      ...new Set(
        [...variantById.values()]
          .map((v) => v.product_id as string | undefined)
          .filter((id): id is string => Boolean(id))
      ),
    ]

    const vathuisProductIds = new Set<string>()
    if (productIds.length) {
      const { data: groupLinks } = await query.graph({
        entity: productEventGroupLink.entryPoint,
        fields: ["product_id", "event_group.record_type"],
        filters: { product_id: productIds },
      })
      for (const row of groupLinks ?? []) {
        const link = row as { product_id?: string; event_group?: { record_type?: string } | null }
        if (link.event_group?.record_type === "vathuis" && link.product_id) {
          vathuisProductIds.add(link.product_id)
        }
      }
    }

    const lines: VathuisLineContext[] = []
    for (const item of items) {
      if (isGiftCardLine(item)) continue
      const variantId = item.variant_id as string | undefined
      if (!variantId) continue

      const variant = variantById.get(variantId)
      const product = variant?.product as Record<string, unknown> | undefined
      const productId = (variant?.product_id as string | undefined) ?? (product?.id as string | undefined)
      if (!productId || !vathuisProductIds.has(productId)) continue

      const metadata = product?.metadata as Record<string, unknown> | null | undefined
      const vathuis = metadata?.vathuis as Record<string, unknown> | undefined
      if (vathuis?.purchase_mode !== "bundle_only") continue

      const handle = product?.handle as string | undefined
      if (!handle) continue

      lines.push({
        lineItemId: String(item.id),
        variantId,
        productId,
        productHandle: handle,
        productTitle: (product?.title as string | undefined) ?? null,
      })
    }

    return { customerId, grantedAt, lines }
  }

  async listVathuisLinesForOrder(
    container: MedusaContainer,
    orderId: string
  ): Promise<VathuisLineContext[]> {
    const resolved = await this.resolveVathuisLines(container, orderId)
    return resolved?.lines ?? []
  }

  async grantFromCompletedOrder(
    container: MedusaContainer,
    orderId: string
  ): Promise<number> {
    const resolved = await this.resolveVathuisLines(container, orderId)
    if (!resolved?.lines.length) return 0

    const { customerId, grantedAt, lines } = resolved
    const newExpiresAt = vathuisAccessExpiresAt(grantedAt)
    let granted = 0

    for (const line of lines) {
      const existingForLine = await this.listCustomerVathuisAccesses(
        {
          order_id: orderId,
          order_line_item_id: line.lineItemId,
        },
        { take: 1 }
      )
      if (existingForLine[0]) continue

      const existingForProduct = await this.listCustomerVathuisAccesses(
        { customer_id: customerId, product_id: line.productId },
        { take: 1 }
      )
      const current = existingForProduct[0]

      const grantedAtIso = toIsoString(grantedAt)
      const newExpiresIso = toIsoString(newExpiresAt)

      if (current) {
        const currentExpires = parseIsoDate(current.expires_at)
        const mergedExpires =
          currentExpires && currentExpires.getTime() > newExpiresAt.getTime()
            ? currentExpires
            : newExpiresAt

        await this.updateCustomerVathuisAccesses({
          id: current.id,
          variant_id: line.variantId,
          order_id: orderId,
          order_line_item_id: line.lineItemId,
          granted_at: grantedAtIso,
          expires_at: toIsoString(mergedExpires),
          product_handle: line.productHandle,
          product_title: line.productTitle,
        })
      } else {
        await this.createCustomerVathuisAccesses({
          customer_id: customerId,
          product_id: line.productId,
          product_handle: line.productHandle,
          product_title: line.productTitle,
          variant_id: line.variantId,
          order_id: orderId,
          order_line_item_id: line.lineItemId,
          granted_at: grantedAtIso,
          expires_at: newExpiresIso,
        })
      }

      granted += 1
    }

    return granted
  }

  async listForCustomer(
    customerId: string,
    options?: { activeOnly?: boolean }
  ): Promise<VathuisAccessItem[]> {
    const rows = await this.listCustomerVathuisAccesses(
      { customer_id: customerId },
      { order: { expires_at: "DESC" } }
    )

    const now = new Date()
    return rows
      .map((row) => {
        const isExpired = !isAccessActive(row.expires_at, now)
        return {
          productId: row.product_id,
          productHandle: row.product_handle,
          productTitle: row.product_title ?? null,
          grantedAt: row.granted_at,
          expiresAt: row.expires_at,
          isExpired,
        }
      })
      .filter((row) => (options?.activeOnly ? !row.isExpired : true))
  }

  async getAccess(customerId: string, productHandle: string): Promise<VathuisAccessStatus> {
    const rows = await this.listCustomerVathuisAccesses(
      { customer_id: customerId, product_handle: productHandle },
      { take: 1 }
    )
    const row = rows[0]
    if (!row) {
      return { hasAccess: false, grantedAt: null, expiresAt: null }
    }

    return {
      hasAccess: isAccessActive(row.expires_at),
      grantedAt: row.granted_at,
      expiresAt: row.expires_at,
    }
  }

  async resolvePlaybackConfig(
    container: MedusaContainer,
    customerId: string,
    productHandle: string,
    episodeKey: string
  ): Promise<AudiencePlayerPlaybackConfig> {
    const access = await this.getAccess(customerId, productHandle)
    if (!access.hasAccess) {
      throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "No active access for this course")
    }

    const { vathuis, episode } = await loadVathuisEpisodeByKey(
      container,
      productHandle,
      episodeKey
    )

    const customerService = container.resolve(Modules.CUSTOMER) as ICustomerModuleService
    const customer = await customerService.retrieveCustomer(customerId, { select: ["email"] })
    const email = customer.email?.trim()
    if (!email) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "Customer email is required for playback")
    }

    return resolveVathuisEpisodePlayback({ email, episode, vathuis })
  }

  /** @deprecated Use resolvePlaybackConfig — bare embed URLs return 403 from Audience Player */
  async resolveEmbedUrl(
    container: MedusaContainer,
    customerId: string,
    productHandle: string,
    episodeKey: string
  ): Promise<string> {
    const playback = await this.resolvePlaybackConfig(
      container,
      customerId,
      productHandle,
      episodeKey
    )
    return `https://embed.audienceplayer.com/${playback.projectId}/article/${playback.articleId}/asset/${playback.assetId}`
  }
}

export default VathuisAccessModuleService
