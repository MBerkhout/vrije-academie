import type { StructureResolver } from "sanity/structure"
import { LinkIcon } from "@sanity/icons"

/**
 * Content blocks are only used inside Page.blocks.
 * Hide them from the sidebar - editors add blocks via "+ Add item" in the Page editor.
 */
const CONTENT_BLOCK_TYPES = [
  "eventList",
  "textBlock",
  "afbeeldingBlock",
  "whitespaceBlock",
  "tabsBlock",
  "formBlock",
  "demandNearbyBlock",
  "heroBlock",
  "productRowBlock",
  "categoriesBlock",
  "uspBlock",
  "reviewBlock",
  "personsBlock",
  "columnsBlock",
  "editorialCardsBlock",
  "accordionBlock",
  "plpBlock",
  "giftCardBlock",
]

/** Singleton documents — shown as direct links rather than lists. */
const SINGLETONS = ["generalSettings"]

/** Document types with an explicit desk item (hidden from the auto list). */
const EXPLICIT_LIST_TYPES = ["redirect"]

export const structure: StructureResolver = (S) =>
  S.list()
    .id("root")
    .title("Content")
    .items([
      // Singleton: General Settings
      S.listItem()
        .id("generalSettings")
        .title("General Settings")
        .child(S.document().schemaType("generalSettings").documentId("generalSettings")),

      S.listItem()
        .id("redirect")
        .title("Redirects")
        .icon(LinkIcon)
        .child(S.documentTypeList("redirect").title("Redirects")),

      S.divider(),

      // All other non-block, non-singleton document types
      ...S.documentTypeListItems().filter((item) => {
        const id = item.getId()
        if (!id) return false
        return (
          !CONTENT_BLOCK_TYPES.includes(id) &&
          !["product", "category", "docent", "city"].includes(id) &&
          !SINGLETONS.includes(id) &&
          !EXPLICIT_LIST_TYPES.includes(id)
        )
      }),

      S.divider(),

      // Medusa-managed mirrors (read-only) — shown as flat items
      S.documentTypeListItem("product").title("Products"),
      S.documentTypeListItem("category").title("Categories"),
      S.documentTypeListItem("city").title("Plaatsen"),
      S.documentTypeListItem("docent").title("Docenten"),
    ])
