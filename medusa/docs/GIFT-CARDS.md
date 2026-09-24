# Digitale cadeaubonnen (custom module)

Medusa v2 heeft geen ingebouwd gift-card domein zoals v1. Deze shop gebruikt een **custom module** `giftCard` met eigen tabellen, **cart credit lines** voor verzilvering, en subscribers op **`order.placed`** / **`order.canceled`**.

## Module

- Pad: [`src/modules/gift-card`](../src/modules/gift-card)
- Registratie: `medusa-config.ts` → `giftCard: { resolve: "./src/modules/gift-card" }`
- Migraties: `npx medusa db:migrate` (module `giftCard`)

## Product

- Standaard **handle**: `digitale-cadeaubon` (override met env `GIFT_CARD_PRODUCT_HANDLE`)
- Aanmaken: `npm run seed:gift-card` (na bestaande shipping profile + regio)
- Toevoegen aan winkelwagen: `POST /store/gift-cards/add-to-cart` met `amount` in **centen**. De line item krijgt `unit_price` in **major EUR** (zelfde schaal als andere winkelwagenregels) plus `metadata.gift_card.amount_cents`.

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

- Bij toepassen: `createCartCreditLinesWorkflow` met `reference: "gift_card"` en metadata (`gift_card_id`, `code`, `cart_id`). **`gift_card.balance` en transacties zijn centen**; cart/order credit lines zijn **major EUR** — zie [`gift-card-apply-amount.ts`](../src/lib/gift-card-apply-amount.ts).
- **Salesforce explore**: staat de code niet in Medusa (`gift_card`), dan zoekt [`resolve-gift-card-by-code.ts`](../src/lib/resolve-gift-card-by-code.ts) `Voucher__c` op (`Code__c` / `Name`), importeert of ververst een rij, en koppelt `salesforce_sync_state` (`entity_type: voucher`). Gebruikt o.a. `Remaining_Amount__c` (override: `SALESFORCE_VOUCHER_REMAINING_FIELD`) en `Original_Amount__c`. Werkt voor legacy cadeaubonnen die alleen in Salesforce bestaan.
- **Salesforce saldo-check**: bestaat de kaart al lokaal, dan haalt [`refresh-gift-card-from-salesforce.ts`](../src/lib/refresh-gift-card-from-salesforce.ts) vóór toepassen het resterende saldo uit Salesforce op. Medusa balance wordt **alleen verlaagd** als SF lager is (andere kanalen); nooit verhoogd (website-redempties die nog niet in SF staan). Uitzetten: `SALESFORCE_VOUCHER_SYNC_BALANCE=false`.
- Reservering: rijen `gift_card_transaction` met `type: reserve` (saldo wordt pas bij order geboekt).
- Bij **`order.placed`**: subscriber [`gift-cards-order-placed.ts`](../src/subscribers/gift-cards-order-placed.ts) roept `finalizeRedemption` aan (reserve weg, `balance` omlaag, `type: redemption`; bedrag = credit line major → centen).
- **Salesforce verzilvering**: bij order push een `OrderItem` met negatieve `UnitPrice` (major EUR) gelijk aan het verzilverde bedrag ([`voucherRedemptionOrderItemFields`](../src/modules/salesforce-sync/mappings/order-item.ts)); `Voucher__c.Remaining_Amount__c` wordt door Salesforce (flows) bijgewerkt — vergelijk dat met Medusa `gift_card.balance` / transacties `type: redemption`.
- Bij **`order.canceled`**: [`gift-cards-order-canceled.ts`](../src/subscribers/gift-cards-order-canceled.ts) zet verzilveringen terug en annuleert ongebruikte net-uitgegeven kaarten waar mogelijk.

## Aankoop (code uitgeven)

- **`order.placed`**: line items met `metadata.gift_card` → `createForOrderLine` (tijdelijk intern `GIFT-` + hex; saldo en ontvanger-metadata). Geen e-mail in deze stap.
- **`order.completed` → Salesforce push**: `Voucher__c` upsert (zonder `Code__c` te overschrijven). Daarna leest [`sync-gift-card-code-from-salesforce.ts`](../src/lib/sync-gift-card-code-from-salesforce.ts) `Code__c` / `Name` en zet de **Salesforce GTC-code** (`GTC-YYYYMM-…`) op `gift_card.code`. Pas dan e-mail via **notification** (`template: gift-card-purchased`, fallback: log). SMTP/SendGrid: [CUSTOMER_AUTH.md](./CUSTOMER_AUTH.md#email-optional).
- Idempotent per orderregel: `source_line_item_id` + `purchased_by_order_id`. E-mail-idempotency: `gift-card-{id}`; bij correctie na oude `GIFT-` mail: `gift-card-{id}-sf-code`.
- **Codes in checkout**: Salesforce **`Code__c`** (bijv. `LNL6NKD`) is de verzilvercode; **`Name`** is vaak `GTC-…` (beheer-id). `GTC-…` / `GIFT-…` / korte alfanumerieke codes blijven ongewijzigd; alleen legacy 8-teken hex krijgt `GIFT-` ([`gift-card-code.ts`](../src/lib/gift-card-code.ts)).
- **Notification `data`**: o.a. `name` / `recipient_name`, `code`, `amount_euros`, `sender_name`, `message`, `order_id`.

## Frontend

- Kooppagina: **`/cadeaubon`** — CMS Page `pageCadeaubon` (`[slug]` + `GiftCardBlock`); zie `sanity/docs/CADEAUBON.md`.
- Cart/checkout-thumbnail: statische storefront **`/branding/cadeaubon-thumb.jpg`** (`resolveLineItemThumbnail`).
- Kortingsveld: `commerceClient.applyCode` — bij `GTC-` of `GIFT-` eerst cadeaubon, anders eerst promo.
- **Credit line sync**: na wijziging van regels/promo’s roept de storefront `POST /store/cart/gift-cards/sync` aan (`syncAppliedGiftCardCredits`) zodat het cadeaubonbedrag opnieuw `min(saldo, cart.total)` is — anders blijft een oude credit (bijv. €39,72) staan terwijl het cart-totaal is gegroeid.

## Env

- `GIFT_CARD_PRODUCT_HANDLE` — optioneel, default `digitale-cadeaubon`
- `GIFT_CARD_EXPIRY_YEARS` — optioneel, default `2`
- `SALESFORCE_VOUCHER_REMAINING_FIELD` — optioneel, default `Remaining_Amount__c` (saldo bij import)
- `SALESFORCE_VOUCHER_STATUS_FIELD` — optioneel, default `Status__c`
- `SALESFORCE_VOUCHER_EXPIRY_FIELD` — optioneel; anders `Expiration_Date__c` / `Valid_Until__c`
- `SALESFORCE_VOUCHER_EXTRA_FIELDS` — optioneel, extra SOQL-velden (comma-separated)
- `SALESFORCE_VOUCHER_SYNC_BALANCE=false` — geen saldo-sync met Salesforce vóór toepassen
- E-mail (cadeaubon naar ontvanger): zelfde SMTP/SendGrid als OTP — zie [CUSTOMER_AUTH.md](./CUSTOMER_AUTH.md#email-optional)

## Testflow (kort)

1. `npx medusa db:migrate`
2. `npm run seed:gift-card`
3. Storefront: `/cadeaubon` → bestellen → na betaling: code in e-mail / DB
4. Nieuwe order: zelfde code in kortingsveld → totaal daalt; resterend saldo in DB
5. Legacy Salesforce-only code: `npm run salesforce:import-voucher -- --code=GTC-…` of gewoon toepassen in checkout (lazy import)
