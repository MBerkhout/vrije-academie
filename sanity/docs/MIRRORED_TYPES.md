# Mirrored document types (Medusa → Sanity)

Three document types in the Studio are managed by Medusa and mirrored here automatically.

| Type | Source | Sanity `_id` prefix | Editable fields |
|------|--------|---------------------|-----------------|
| `product` | Medusa Product Group | `medusa-product-` | `pageBodyOwnedBySanity`, `body`, `onlineBadge`, `customUrgencyMessage`, `relatedProducts` (catalog fields are read-only). Mirror fields include Salesforce product-card CTA bar: `badge` (label), `ctaColor`, `ctaColorHover`. |
| `category` | Medusa native product category (`/app/categories/:id`; legacy `catalog_category` also syncs) | `medusa-category-` | `title`, `description`, `image`, `linkUrl`, `seo` (editorial; preserved on sync) |
| `docent` | Medusa `people.docent` | `medusa-docent-` | None (all read-only) |

## Studio behaviour

- **`product`**: **Publish** (and other default actions) plus **Open in Medusa**. Turn **Keep page body edits in Sanity** on after customizing **Page body** so Medusa sync stops replacing blocks with the product description.
- **`category` / `docent`**: **Open in Medusa** only (no Publish/Discard). Medusa sync updates mirror fields only; Studio **`title`**, **`description`**, **`image`**, **`linkUrl`**, and **`seo`** on categories are kept across syncs.
- Creating mirrored types from the Studio is blocked.
- Mirrored docs are grouped under **"Medusa (read-only)"** in the sidebar.
- Configure `SANITY_STUDIO_MEDUSA_ADMIN_URL` to point to the correct Medusa Admin URL.

## Sync

Sync is triggered automatically by Medusa subscribers. For bulk resync:

```bash
# In the /medusa directory:
npx medusa exec ./src/scripts/sync-sanity.ts
```

See [medusa/docs/SANITY_SYNC.md](../../medusa/docs/SANITY_SYNC.md) for full documentation.
