# Product Detail Page (PDP)

URL pattern: `/ons-aanbod/[handle]`

## Editable content (Sanity Studio)

Open any **Product** document in Sanity Studio. The "Editorial content" tab contains:

| Field | Description |
|---|---|
| **Page body** | Drag-and-drop content blocks (text, image/video, columns, accordion, tabs, whitespace). Restricted to PDP-surface blocks via the block registry. |
| **Online badge** | Toggle + custom text shown in the booking panel (e.g. "Nu ook online te volgen!"). |
| **Custom urgency message** | Short text (max 80 chars) shown in the promo banner above the page header. |
| **Related products** | Up to 4 editor-curated product picks shown below the auto-generated Similar courses section. |

All other fields are mirrors from Medusa and are read-only, including **SEO title** and **SEO description** (from Salesforce on import), and **Image captions** (`imageCaptions` from Salesforce `Image_N_Source__c`, shown on PDP gallery hover).

## Conversion signal thresholds (`generalSettings › PDP`)

| Setting | Default | Effect |
|---|---|---|
| `lowStockThreshold` | 5 | Show "Nog maar N plaatsen" when `available_quantity ≤ N`. |
| `deadlineWarningDays` | 7 | Show deadline warning when `registration_deadline_at` is within N days. |
| `countdownWindowDays` | 30 | Show start-soon countdown when `earliest_start_at` is within N days. |

## UI labels (`generalSettings › PDP › Labels`)

All user-facing copy is stored here. Change copy without touching code.

| Field | Effect |
|---|---|
| **Wishlist** | Primary CTA beside “Bewaren” when the course is not saved. |
| **Wishlist — saved state** | Label when the course is already on the customer’s wishlist (e.g. “Verwijderen uit bewaard”). |

## Block surface registry

Each block schema in `sanity/src/schemas/blocks/` exports `surfaces`. PDP-allowed blocks:

`textBlock`, `afbeeldingBlock`, `columnsBlock`, `accordionBlock`, `tabsBlock`, `whitespaceBlock`

To add a block to the PDP, add `'pdp'` to its `surfaces` array.

## Similar courses (automatic)

The "Vergelijkbare cursussen" section is **fully automatic**:
- Same Medusa product category.
- Sorted by most completed-order registrations (popularity).
- Hidden when fewer than 2 results.

## Related products (editorial)

The "Gerelateerd" section is editor-curated via the Sanity `product.relatedProducts` field.
It is only shown when at least 1 product is selected.
