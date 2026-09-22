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
  └─ commerceClient.getCart(cartId)          — Medusa SDK; amounts (catalog and cadeaubon) normalized from major EUR to cents in `normalize-store-money.ts`
  └─ GET /store/cart/extras?cart_id=…        — enriched session data
  └─ dispatches window Event 'va:cart-updated' after every mutation
  └─ line items are sorted deterministically (`created_at` / `createdAt`, then `id`) so quantity updates cannot reshuffle rows — see `src/lib/commerce/cart-sort.ts`
```

## Cookie

Cart ID is stored in a **first-party cookie** named **`va_cart_id`** (constant `CART_COOKIE` in `src/lib/commerce/cart-cookie-name.ts`; 30-day max-age, SameSite=Lax in `cart.ts`). The header cart-count bubble listens for `va:cart-updated` events on `window` and re-fetches `/api/cart/count`.

### Logged-in cart sync (cross-device)

When a customer is logged in **outside checkout**, the storefront calls `POST /store/carts/sync` (`commerceClient.syncAccountCart`) via `ensureAccountCartSynced()` in `src/lib/commerce/cart.ts`. Medusa merges all open carts for that customer into the **oldest** cart (same variant quantities are combined; VA Thuis bundles stay qty 1; gift-card purchase lines stay separate). The cookie is then updated to that canonical cart id.

**Checkout is excluded:** on `/checkout/*` the device keeps its current `va_cart_id` cart (login may still attach that cart to the customer, but no merge or cart swap). After leaving checkout, sync runs once on the next page.

Guests keep a cookie-only cart until they log in outside checkout.

## Cart extras API

`GET /store/cart/extras?cart_id=…` (Medusa, requires `x-publishable-api-key`).

Returns per-line-item:
- `product_handle`, `product_title`, `thumbnail`
- `event_item`: `start_at`, `end_at`, `city`, `delivery_type`
- `vathuis`: for online courses (`metadata.vathuis.purchase_mode: bundle_only`) — `episode_count_label` and `play_time` from Salesforce (`Audience_Player_Episodes__c`, `Audience_Player_Play_Time__c`), with fallbacks from synced episode metadata when those fields are empty
- `is_vathuis`: true for those bundles so the cart can lock quantity at 1
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
- Een **gekochte** digitale bon als regel: secundaire regelinfo komt uit **`buildCartLineItemDetailBlocks`** (`src/lib/commerce/line-item-details.ts`) en één renderer **`CartLineItemDetails`** (`src/components/cart/CartLineItemDetails.tsx`) — zelfde pipeline op **Betaling** en in orderregels (zie `docs/CHECKOUT.md`). Shape voor extras: `CartItemExtras` in `src/lib/commerce/cart-item-extras.ts`; laden via `fetchCartExtras` (`src/lib/commerce/fetch-cart-extras.ts`). Thumbnail: statische **`/branding/cadeaubon-thumb.jpg`** (`resolveLineItemThumbnail` in `src/lib/commerce/gift-card.ts`) — winkelwagen, checkout-overzicht en bedankt/orderregels.

Zie ook [`medusa/docs/GIFT-CARDS.md`](../../medusa/docs/GIFT-CARDS.md).

## Components

| File | Purpose |
|---|---|
| `CartStepper` | 4-step horizontal stepper pill bar; on mobile, only steps 1–3 are shown (step 4 and its connector are hidden) so the bar fits without horizontal scroll |
| `CartView` | Client root: loads cart + extras, owns mutations |
| `CartLineItemDetails` | Rendert `LineItemDetailBlock[]` (`session`, `vathuis`, `instructors`, `quantity_label`, `gift_recipient`, `notice`) — varianten `cart` / `payment` / `summary` |
| `GiftCardRecipientLine` | Alleen de **Voor:**-regel; aangeroepen vanuit `CartLineItemDetails` |
| `CartItemRow` | Thumbnail, title, `CartLineItemDetails`, qty selector (locked at **1** without −/+ for cadeaubon purchases and VA Thuis bundles), remove |
| `DiscountCodeForm` | Kortings- **en** cadeauboncodes (zelfde veld); `commerceClient.applyCode`; verwijderen: `removePromoCodes` (alleen niet-automatische promo) / `removeGiftCardCode` (cadeaubon). Promoties met `is_automatic` uit de Store API tonen geen verwijderknop. |
| `OrderSummary` | Subtotal (gross producten) / discount / cadeaubon-tegoed (`credit_line_total`) / **waarvan BTW (X%)** / total |

### Pricing & BTW

Catalog prices from Salesforce are **tax-inclusive** (consumer gross). Medusa extracts the included VAT; the customer always pays the catalog total. The **Producten** line shows the gross merchandise amount (`total + discount + credit`). **waarvan BTW** amounts come from Medusa `tax_total` (respecting NL product-type rules such as BTW laag 9%). Before checkout, `POST /store/carts/:id/tax-preview` (and add-to-cart) set a minimal NL shipping country when needed so tax can be calculated. The label shows **(X%)** only when all lines share one rate; mixed carts show **waarvan BTW** without a percentage. Styled lighter (`text-va-gray`) to read as included, not added. Helpers: `src/lib/commerce/vat.ts`.
| `TrustSignals` | 3 reassurance lines (secure, cancellation, support) |
| `ProceedCta` | Primary CTA — routes to `/checkout/inloggen` (step 2) |
| `EmptyCart` | Illustration + heading + CTA when cart is empty |
| `CartToast` | Inline aria-live error toast |
| `GiftCardPurchaseForm` | CMS `giftCardBlock` — bedrag (tegels + optioneel eigen bedrag) en bon-gegevens; validatie als checkout (`ValidatedInput`, `gift-card-field-validation.ts`) |

## Layout

- `lg+`: two-column grid — left `flex-1` (items + promo), right `w-80` sticky (order summary → trust/USPs → **Doorgaan met afrekenen** last)
- `< md`: single column; cart line items use a **stacked layout** (product info full width, then **Aantal** stepper + price on one row, **Verwijderen** below). Column headers are hidden. `ProceedCta` is **sticky at bottom** of viewport via `fixed bottom-0`

## Checkout shell (routes under `/checkout/*`)

Checkout lives in `src/app/(checkout)/checkout/` so it does **not** use the main site header/footer. The `(checkout)/layout.tsx` wrapper provides:

- **Header** (`CheckoutShellHeader`): VA mark + wordmark only (`/branding/logo.svg` + `logo_text.svg`, links home).
- **Order summary** (`CheckoutOrderSummary` via `CheckoutContentWithSummary`): on **`/checkout/betaling`**, the main column uses **`CheckoutPaymentOrderOverview`** (order block + **`OrderSummaryDetails`**); the sidebar is **`CheckoutOrderSummaryHelpTrustOnly`** (Hulp nodig + USPs, no order heading or lines). On **`/checkout/inloggen`** and **`/checkout/bevestiging`**, the sidebar is the full summary: on **mobile**, collapsible header + line items + totals; on **`lg+`**, full heading row + lines + totals, then **Hulp nodig** (phone, e-mail, opening hours from **Footer → contact**, belkosten disclaimer stripped) and **TrustSignals** (`cart.trustSecure`, etc.).
- **Footer** (`CheckoutShellFooter`): single link — **Algemene voorwaarden** resolved from **Footer → topMenuSecondary** (first item whose label matches `/voorwaarden/i`), otherwise `/algemene-voorwaarden`.

The inner `checkout/layout.tsx` shows **Terug naar winkelwagen** (arrow + text) instead of breadcrumbs; the target is `/winkelwagen`. The cart’s **Verder winkelen** link still uses `cart.continueShoppingUrl` (Ons aanbod).

## Regel-details uitbreiden

Nieuwe regeltypen: breid het type **`LineItemDetailBlock`** uit in `src/lib/commerce/line-item-details.ts`, vul **`buildCartLineItemDetailBlocks`**, en render het in **`CartLineItemDetails`** (`BlockFragment`).

## Handover to checkout

`ProceedCta` links to `/checkout/betaling` when the logged-in **customer** profile is complete; otherwise `/checkout/inloggen` (step 2).

- **Logged-in customers:** Medusa **customer** profile (naam, adres) is authoritative. If it is complete, checkout skips step 2 (cart CTA → betaling; direct visit to inloggen still syncs the cart and redirects). If not, they stay on `/checkout/inloggen` in state `logged_in_details` until gegevens are saved to the account and the cart is synced. From betaling, **Gegevens aanpassen** (or the stepper back link) uses `?bewerken=1` so the login step is not skipped.
- **Guest / new users** complete the email-first progressive form at `/checkout/inloggen`; shipping lives on the **cart** (and a 7-day **session draft** backup). After that, **Doorgaan met afrekenen** goes straight to betaling until the cart is cleared or the draft expires.
After a successful order, `clearCartId()` removes the cookie (also on `/bedankt` when the order is confirmed). Completed Medusa carts (`completed_at` set) and 404s are treated as inactive: `getActiveCart()` clears the stale cookie. Retrieve errors (401/5xx/network) **keep** the cookie so a failed load after login cannot wipe the cart and bounce checkout back to `/winkelwagen`.

- After the session ends, the `va_cart_id` cookie persists for 30 days for **open** carts only; completed carts are discarded automatically.
