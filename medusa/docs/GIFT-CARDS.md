# Digitale cadeaubonnen (custom module)

Medusa v2 heeft geen ingebouwd gift-card domein zoals v1. Deze shop gebruikt een **custom module** `giftCard` met eigen tabellen, **cart credit lines** voor verzilvering, en subscribers op **`order.placed`** / **`order.canceled`**.

## Module

- Pad: [`src/modules/gift-card`](../src/modules/gift-card)
- Registratie: `medusa-config.ts` → `giftCard: { resolve: "./src/modules/gift-card" }`
- Migraties: `npx medusa db:migrate` (module `giftCard`)

## Product

- Standaard **handle**: `digitale-cadeaubon` (override met env `GIFT_CARD_PRODUCT_HANDLE`)
- Aanmaken: `npm run seed:gift-card` (na bestaande shipping profile + regio)
- Toevoegen aan winkelwagen: `POST /store/gift-cards/add-to-cart` met `amount` in **centen** en `metadata.gift_card` op de line item (via workflow)

## Store API

| Methode | Pad | Doel |
|--------|-----|------|
| POST | `/store/gift-cards/add-to-cart` | Regel met variabele prijs + ontvanger-metadata |
| GET | `/store/gift-cards/:code` | Publieke check: `balance`, `status`, `currency_code` (geen PII) |
| POST | `/store/cart/gift-cards` | Code toepassen: credit line + reservering op saldo |
| DELETE | `/store/cart/gift-cards` | Body `{ cart_id, code }` — credit line verwijderen + reservering vrijgeven |
| POST | `/store/cart/gift-cards/sync` | Opnieuw toepassen na wijziging winkelwagen (metadata `gift_card_redemptions`); response via `refetchStoreCart` (inclusief `promotions`, zodat kortingscodes in de UI behouden blijven) |

Alle routes gebruiken de normale **publishable API key** header (`x-publishable-api-key`).

## Admin (back-office)

- **Menu**: onder **Orders** → **Gift cards** (custom route [`src/admin/routes/gift-cards/page.tsx`](../src/admin/routes/gift-cards/page.tsx)): lijst, filters (code, e-mail, aankoop-`order_id`), rij → drawer met transacties; link naar orderdetail.
- **API** (zelfde admin-sessie als de rest van het dashboard, `credentials: "include"`):
  - `GET /admin/gift-cards` — query: `limit`, `offset`, `code`, `email`, `order_id` (exacte match na normalisatie voor `code`)
  - `GET /admin/gift-cards/:id` — kaart + laatste transacties

## Verzilvering (saldo)

- Bij toepassen: `createCartCreditLinesWorkflow` met `reference: "gift_card"` en metadata (`gift_card_id`, `code`, `cart_id`).
- Reservering: rijen `gift_card_transaction` met `type: reserve` (saldo wordt pas bij order geboekt).
- Bij **`order.placed`**: subscriber [`gift-cards-order-placed.ts`](../src/subscribers/gift-cards-order-placed.ts) roept `finalizeRedemption` aan (reserve weg, `balance` omlaag, `type: redemption`).
- Bij **`order.canceled`**: [`gift-cards-order-canceled.ts`](../src/subscribers/gift-cards-order-canceled.ts) zet verzilveringen terug en annuleert ongebruikte net-uitgegeven kaarten waar mogelijk.

## Aankoop (code uitgeven)

- Zelfde subscriber: line items met `metadata.gift_card` → `createForOrderLine` + e-mail via **notification** module (`template: gift-card-purchased`, fallback: log).
- Idempotent per orderregel: `source_line_item_id` + `purchased_by_order_id`.
- **Notification `data`**: o.a. `name` en `recipient_name` (zelfde waarde: voornaam/label van de ontvanger), `code`, `amount_euros`, `sender_name`, `message`, `order_id`. Gebruik in je SendGrid-/admin-template **`{{name}}`** (of `recipient_name`) voor de aanhef; zonder `name` blijft een placeholder letterlijk staan.

## Frontend

- Kooppagina: **`/cadeaubon`** — CMS Page `pageCadeaubon` (`[slug]` + `GiftCardBlock`); zie `sanity/docs/CADEAUBON.md`.
- Kortingsveld: `commerceClient.applyCode` — promo eerst of gift eerst afhankelijk van `GIFT-` prefix.

## Env

- `GIFT_CARD_PRODUCT_HANDLE` — optioneel, default `digitale-cadeaubon`
- `GIFT_CARD_EXPIRY_YEARS` — optioneel, default `2`

## Testflow (kort)

1. `npx medusa db:migrate`
2. `npm run seed:gift-card`
3. Storefront: `/cadeaubon` → bestellen → na betaling: code in e-mail / DB
4. Nieuwe order: zelfde code in kortingsveld → totaal daalt; resterend saldo in DB
