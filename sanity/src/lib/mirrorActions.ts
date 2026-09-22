import type { DocumentActionComponent, DocumentActionsContext } from "sanity"

/** Mirror document types that are source-of-truth in Medusa — catalog fields stay read-only. */
export const MIRROR_TYPES = ["product", "category", "docent"] as const
export type MirrorType = (typeof MIRROR_TYPES)[number]

/** Mirrored types with Studio-owned editorial fields that must be publishable. */
export const MIRROR_TYPES_WITH_PUBLISH: readonly MirrorType[] = ["product", "category"]

const MEDUSA_PATHS: Record<MirrorType, (id: string) => string> = {
  product: (id) => `/app/products/${id}`,
  category: (id) => `/app/categories/${id}`,
  docent: (id) => `/app/custom/people/docenten/${id}`,
}

/**
 * Adds "Open in Medusa" for mirrored Medusa types.
 * Product and category keep default actions (Publish, Discard, …) so editorial fields can ship.
 * Docent stays action-minimal (Open in Medusa only).
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

  if (MIRROR_TYPES_WITH_PUBLISH.includes(type as MirrorType)) {
    return [...prev, openInMedusa]
  }

  return [openInMedusa]
}
