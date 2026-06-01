# Cart (Winkelwagen)

Step 1 of the 4-step checkout flow (default step titles in code: **Summary → Login → Payment → Confirmation**; editable in Sanity under **Winkelwagen → Step labels**, stored under Dutch field names in the CMS but projected as `summary` / `login` / `payment` / `confirmation` in `sanity-client`).

## URL

`/winkelwagen`

## Architecture

```
/winkelwagen/page.tsx  (server)
  └─ fetches generalSettings.cart from Sanity
  └─ renders Breadcrumbs + CartStepper + CartView

CartView  (client, src/components/cart/CartView.tsx)
  └─ reads va_cart_id cookie
  └─ commerceClient.getCart(cartId)          — Medusa SDK
  └─ GET /store/cart/extras?cart_id=…        — enriched session data
  └─ dispatches window Event 'va:cart-updated' after every mutation
  └─ line items are sorted deterministically (`created_at` / `createdAt`, then `id`) so quantity updates cannot reshuffle rows — see `src/lib/commerce/cart-sort.ts`
```

## Cookie

Cart ID is stored in a **first-party cookie** named **`va_cart_id`** (constant `CART_COOKIE` in `src/lib/commerce/cart-cookie-name.ts`; 30-day max-age, SameSite=Lax in `cart.ts`). The header cart-count bubble listens for `va:cart-updated` events on `window` and re-fetches `/api/cart/count`.

## Cart extras API

`GET /store/cart/extras?cart_id=…` (Medusa, requires `x-publishable-api-key`).

Returns per-line-item:
- `product_handle`, `product_title`, `thumbnail`
- `event_item`: `start_at`, `end_at`, `city`, `delivery_type`
- `instructor_names`: string[]

This avoids stuffing metadata into Medusa line items; the SDK cart response stays canonical.

## All static copy

All labels, trust signals, empty-state text, step names, and promo notices are editable in Sanity under **General Settings → Winkelwagen** (`generalSettings.cart`).

### Contact onder de kortingscode

Vast NL-blok onder het kortingscodeveld: `cart.discountOrderHelp` in `frontend/src/locales/nl.json` (`DiscountCodeForm`).

### Cadeaubonnen (saldo)

- Zelfde invoerveld als kortingscode: geldige **promotiecodes** (Medusa) of **interne** codes (`GIFT-…`) die via `POST /store/cart/gift-cards` als **cart credit line** worden geboekt.
- Na wijziging van aantallen wordt `commerceClient.syncGiftCardCredits` aangeroepen zodat toegepaste bonnen opnieuw tegen het nieuwe subtotaal worden afgezet.
- Kooppagina voor nieuwe bonnen: **`/cadeaubon`** — CMS Page `pageCadeaubon` met blok **Cadeaubon (koop)**; zie `sanity/docs/CADEAUBON.md`. Het formulier (`GiftCardPurchaseForm` via `GiftCardBlock`) gebruikt dezelfde patronen als de checkout-stap **Gegevens**: `ValidatedInput` / `ValidatedTextarea`, `FieldValidity` (groene rand + vinkje na geldige blur, rood bij fout), e-mailregels via `validateAccountField('email', …)`, en NL-teksten onder `auth.validation` in `locales/nl.json` (o.a. `giftCardRecipientNameRequired`, `giftCardAmountInvalid`).
- Een **gekochte** digitale bon als regel: secundaire regelinfo komt uit **`buildCartLineItemDetailBlocks`** (`src/lib/commerce/line-item-details.ts`) en één renderer **`CartLineItemDetails`** (`src/components/cart/CartLineItemDetails.tsx`) — zelfde pipeline op **Betaling** en in orderregels (zie `docs/CHECKOUT.md`). Shape voor extras: `CartItemExtras` in `src/lib/commerce/cart-item-extras.ts`; laden via `fetchCartExtras` (`src/lib/commerce/fetch-cart-extras.ts`).

Zie ook [`medusa/docs/GIFT-CARDS.md`](../../medusa/docs/GIFT-CARDS.md).

## Components

| File | Purpose |
|---|---|
| `CartStepper` | 4-step horizontal stepper pill bar |
| `CartView` | Client root: loads cart + extras, owns mutations |
| `CartLineItemDetails` | Rendert `LineItemDetailBlock[]` (`session`, `instructors`, `quantity_label`, `gift_recipient`, `notice`) — varianten `cart` / `payment` / `summary` |
| `GiftCardRecipientLine` | Alleen de **Voor:**-regel; aangeroepen vanuit `CartLineItemDetails` |
| `CartItemRow` | Thumbnail, title, `CartLineItemDetails`, qty selector, remove |
| `DiscountCodeForm` | Kortings- **en** cadeauboncodes (zelfde veld); `commerceClient.applyCode`; verwijderen: `removePromoCodes` (alleen niet-automatische promo) / `removeGiftCardCode` (cadeaubon). Promoties met `is_automatic` uit de Store API tonen geen verwijderknop. |
| `OrderSummary` | Subtotal / discount / cadeaubon-tegoed (`credit_line_total`) / BTW / total |
| `TrustSignals` | 3 reassurance lines (secure, cancellation, support) |
| `ProceedCta` | Primary CTA — routes to `/checkout/inloggen` (step 2) |
| `EmptyCart` | Illustration + heading + CTA when cart is empty |
| `CartToast` | Inline aria-live error toast |
| `GiftCardPurchaseForm` | CMS `giftCardBlock` — bedrag (tegels + optioneel eigen bedrag) en bon-gegevens; validatie als checkout (`ValidatedInput`, `gift-card-field-validation.ts`) |

## Layout

- `lg+`: two-column grid — left `flex-1` (items + promo), right `w-80` sticky (order summary → trust/USPs → **Doorgaan met afrekenen** last)
- `< md`: single column, `ProceedCta` is **sticky at bottom** of viewport via `fixed bottom-0`

## Checkout shell (routes under `/checkout/*`)

Checkout lives in `src/app/(checkout)/checkout/` so it does **not** use the main site header/footer. The `(checkout)/layout.tsx` wrapper provides:

- **Header** (`CheckoutShellHeader`): VA mark + wordmark only (`/branding/logo.svg` + `logo_text.svg`, links home).
- **Order summary** (`CheckoutOrderSummary` via `CheckoutContentWithSummary`): on **`/checkout/betaling`**, the main column uses **`CheckoutPaymentOrderOverview`** (order block + **`OrderSummaryDetails`**); the sidebar is **`CheckoutOrderSummaryHelpTrustOnly`** (Hulp nodig + USPs, no order heading or lines). On **`/checkout/inloggen`** and **`/checkout/bevestiging`**, the sidebar is the full summary: on **mobile**, collapsible header + line items + totals; on **`lg+`**, full heading row + lines + totals, then **Hulp nodig** (phone, e-mail, opening hours from **Footer → contact**, belkosten disclaimer stripped) and **TrustSignals** (`cart.trustSecure`, etc.).
- **Footer** (`CheckoutShellFooter`): single link — **Algemene voorwaarden** resolved from **Footer → topMenuSecondary** (first item whose label matches `/voorwaarden/i`), otherwise `/algemene-voorwaarden`.

The inner `checkout/layout.tsx` shows **Terug naar winkelwagen** (arrow + text) instead of breadcrumbs; the target is `cart.continueShoppingUrl` from Sanity when set, else `/winkelwagen`.

## Regel-details uitbreiden

Nieuwe regeltypen: breid het type **`LineItemDetailBlock`** uit in `src/lib/commerce/line-item-details.ts`, vul **`buildCartLineItemDetailBlocks`**, en render het in **`CartLineItemDetails`** (`BlockFragment`).

## Handover to checkout

`ProceedCta` links to `/checkout/inloggen` (step 2).

- **Logged-in customers:** Medusa **customer** profile (naam, adres) is authoritative. If it is complete, the login step runs `syncCartFromCustomer` and sends them to `/checkout/betaling`. If not, they stay on `/checkout/inloggen` in state `logged_in_details` until gegevens are saved to the account and the cart is synced.
- **Guest / new users** complete the email-first progressive form at `/checkout/inloggen`; shipping lives on the **cart** until betaling.
- After the session ends, the `va_cart_id` cookie persists for 30 days; carts do not automatically expire from Medusa during that window.
