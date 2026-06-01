import type { DocumentActionComponent, DocumentActionsContext } from "sanity"

/** Mirror document types that are source-of-truth in Medusa — not editable in Studio. */
export const MIRROR_TYPES = ["product", "category", "docent"] as const
export type MirrorType = (typeof MIRROR_TYPES)[number]

const MEDUSA_PATHS: Record<MirrorType, (id: string) => string> = {
  product: (id) => `/app/products/${id}`,
  category: (id) => `/app/categories/${id}`,
  docent: (id) => `/app/custom/people/docenten/${id}`,
}

/**
 * Adds "Open in Medusa" for mirrored Medusa types.
 * Products also keep default actions (Publish, Discard, …) so editorial fields can ship.
 * Category and docent stay action-minimal (Open in Medusa only).
 */
export function mirroredDocumentActions(
  prev: DocumentActionComponent[],
  context: DocumentActionsContext
): DocumentActionComponent[] {
  const type = context.schemaType as string
  if (!MIRROR_TYPES.includes(type as MirrorType)) return prev

  const openInMedusa: DocumentActionComponent = (props) => {
    const medusaId = (props.draft ?? props.published)?.medusaId as string | undefined
    const adminBase =
      typeof process !== "undefined"
        ? ((process.env as Record<string, string | undefined>).SANITY_STUDIO_MEDUSA_ADMIN_URL ?? "")
            .trim()
            .replace(/\/$/, "")
        : ""

    return {
      label: "Open in Medusa",
      tone: "default",
      onHandle: () => {
        if (!medusaId || !adminBase) return
        window.open(adminBase + MEDUSA_PATHS[type as MirrorType](medusaId), "_blank")
      },
    }
  }
  openInMedusa.action = "open-in-medusa"

  if (type === "product") {
    return [...prev, openInMedusa]
  }

  return [openInMedusa]
}
