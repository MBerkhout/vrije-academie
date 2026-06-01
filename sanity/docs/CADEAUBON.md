# Digitale cadeaubon (`/cadeaubon`)

Koop-pagina content staat in een **Page** (document id `pageCadeaubon`, slug **`cadeaubon`**) met een **Cadeaubon (koop)**-blok (`giftCardBlock`) in **Content blocks**. **SEO** staat op de Page.

## Frontend

- Route: **`/[slug]`** → `GiftCardBlock` rendert het koopformulier (plus andere blokken op de Page).

## Studio

- **Page** → document `pageCadeaubon` → blok **Cadeaubon (koop)** (o.a. **Grootte paginatitel** H1–H4).

## Migratie

Datasets met nog `generalSettings.giftCard`:

```bash
cd sanity && npm run migrate:gift-card-to-page
```

## Constante

- `CADEAUBON_CMS_PAGE_ID` in `src/constants/storefront-paths.ts` (`pageCadeaubon`).
