# Ons aanbod (PLP) in de Page editor

Editorial content for de product listing (`/ons-aanbod`) staat in een **Page** met vaste id `pageOnsAanbod`, slug `ons-aanbod`, met minstens één **PLP**-blok (`plpBlock`) in **Content Blocks**.

## Studio

- Open **Page** en het document met slug `ons-aanbod` (vaste id `pageOnsAanbod` na migratie). Voeg daar het **PLP (Ons aanbod)**-blok toe onder **Content blocks** indien nodig.
- **SEO** op paginiveau (veld **SEO** op de Page); het PLP-blok bevat banner, intro en tabs.

## Migratie van `plpPage`

Bestaande datasets met het oude singleton `plpPage`:

```bash
cd sanity && npm run migrate:plp-to-page
```

Het script leest `sanity/.env` (zelfde variabelen als de Studio) — Node zet `.env` niet vanzelf; dat gebeurde eerder alleen in `sanity dev`. Eventueel nog steeds: `SANITY_API_WRITE_TOKEN=… npm run migrate:plp-to-page` in de shell.

Daarna kan `plpPage` uit de dataset verwijderd worden. De storefront leest tijdelijk nog `plpPage` mee in dezelfde GROQ-query (`coalesce`); na verwijderen blijft alles functioneren.

## Category landing pages

Er is **geen** aparte Sanity Page per categorie. Gemirrorde **`category`**-documenten (`slug`, `label`) sturen de storefront naar `/ons-aanbod/{slug}` met titel “Ons aanbod in {label}”. Optioneel veld **`linkUrl`** op `category` overschrijft die URL (bijv. externe link). Presentation preview opent de category-PLP in de storefront.

## Technische constante

- `PLP_CMS_PAGE_ID` in `src/constants/storefront-paths.ts` (Sanity) en `PLP_CMS_PAGE_ID` in `frontend/src/lib/cms/sanity-refs.ts` moeten overeenkomen.
