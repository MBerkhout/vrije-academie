# Checkout Flow

Steps 2–4 of the 4-step booking flow: **Inloggen → Betaling → Bevestiging**.

## URLs

| Step | URL | Component |
|------|-----|-----------|
| 1 | `/winkelwagen` | `CartView` |
| 2 | `/checkout/inloggen` | `CheckoutLoginForm` |
| 3 | `/checkout/betaling` | `CheckoutPaymentOrderOverview` + `CheckoutPaymentForm` |
| 4 | `/checkout/bevestiging` | `bevestiging/page.tsx` |
| — | `/login` | `LoginForm` |

## Architecture

```
/checkout/layout.tsx           (server — fetches generalSettings)
  CheckoutStepperClient        (client — reads pathname for active step)
  CheckoutContentWithSummary   (client — pathname: betaling = sidebar `helpTrustOnly`; else full summary)
  CheckoutOrderSummaryClient   (client — reads cart unless `helpTrustOnly`)
  {children}
```

**Stepper labels:** CMS field `generalSettings.cart.stepLabels`. When not set in Sanity, `CheckoutStepper` and `CartStepper` fall back to Dutch: **Overzicht**, **Inloggen**, **Betaling**, **Bevestiging**. The mobile checkout stepper’s previous-step control uses **Terug**.

**Layout:** 2/3 + sticky sidebar on all checkout substeps. On **`/checkout/betaling`**, the main column starts with **`CheckoutPaymentOrderOverview`** (order lines + totals in a “Jouw gegevens”-style panel); the sidebar uses **`CheckoutOrderSummaryClient` `variant="helpTrustOnly"`** (Hulp nodig + USPs only — no “Bestellingsoverzicht” block). On **`/checkout/inloggen`** and **`/checkout/bevestiging`**, the sidebar is the full order summary (`CheckoutOrderSummaryMobile` + `CheckoutOrderSummaryDesktop`). Vertical spacing uses `gap-6`. `CheckoutLoginForm` is full width until `lg`, then capped with `max-w-lg` inside the 2/3 column.

## Step 2 — Inloggen (`CheckoutLoginForm`)

Field rules and the password-strength meter are shared with **`LoginForm`** (`/login`):

- `src/lib/auth/account-field-validation.ts` — `validateAccountField` (email, passwords with `login` vs `register` policy, Dutch address fields, etc.)
- `src/lib/auth/password-strength.ts` — `passwordStrengthLevel` / bar color helpers
- `src/components/auth/ValidatedInput.tsx`, `PasswordStrengthMeter.tsx`

Presentation for each checkout sub-step lives in `src/components/checkout/login/` (`CheckoutLoginEmailStep`, `CheckoutLoginKnownStep`, `CheckoutGuestDetailsStep`).

Progressive email-first state machine:

```
email  ──(exists?)──► known   ──(login ok + profile complete)──► /checkout/betaling
 │                         │                    └──(profile incomplete)──► logged_in_details
 └──► unknown ──(form ok)──► /checkout/betaling
```

| State | What happens |
|-------|-------------|
| `email` | Single email field + Volgende button |
| `known` | Password + Inloggen. OTP stub. Forgot-password link. Guest bypass (if `guestCheckoutEnabled`). |
| `unknown` | Full address form (guest). Optional "Account aanmaken" with password fields. |
| `logged_in_details` | Same address form for **logged-in** users; e-mail read-only; no account checkbox. Saves to **Medusa customer** first, then syncs the cart. |

**Data ownership**

- **Logged-in:** `Customer` (name, phone, saved address via Store API) is the **source of truth**. `commerceClient.updateCustomerProfile`, `upsertCheckoutShippingAddress`, then `syncCartFromCustomer` copies that onto the cart for payment (`updateCart` with `shipping_address`).
- **Guest:** only the **cart** holds shipping until step 3; `updateCart(cartId, { email, shipping_address })` before routing to betaling.

Helpers: `src/lib/commerce/checkout-profile.ts` (`isCustomerProfileComplete`, `getDefaultCheckoutAddress`, `customerToShippingPayload`, `isCartShippingComplete`).

Account creation (`createAccount = true`) stores intent in `sessionStorage['va_checkout_register']`. The actual Medusa customer record is created **after successful payment** (deferred to order webhook — see PAYMENT-MOLLIE.md).

**Guards:**
- Empty cart → redirect `/winkelwagen`
- Already logged-in with **complete** profile → `syncCartFromCustomer` then redirect `/checkout/betaling`
- Already logged-in with **incomplete** profile → `logged_in_details` (no immediate redirect to betaling)

## Step 3 — Betaling (`betaling/page.tsx`, `CheckoutPaymentOrderOverview`, `CheckoutPaymentForm`)

**`CheckoutPaymentOrderOverview`** (above the form): loads cart + **`fetchCartExtras`** (zelfde endpoint als winkelwagen). Primary block: titelrij + **`CartLineItemDetails`** met `variant="payment"` (regels uit **`buildCartLineItemDetailBlocks`**: sessie met **Online**-fallback, docenten, aantal tickets/cadeaubon, **Voor:** cadeaubon). Daarna **`OrderSummaryLineItems`** met `extras` (secundaire regels idem); **`OrderSummaryTotalsBlock`**. Sidebar op inloggen/bevestiging: **`CheckoutOrderSummaryClient`** laadt eveneens extras voor **`OrderSummaryDetails`**. Zie `src/lib/commerce/line-item-details.ts` en `src/components/cart/CartLineItemDetails.tsx`; cadeaubon-parser: **`gift-card.ts`**; laag **`GiftCardRecipientLine`** alleen voor de **Voor:**-zin.

**`CheckoutPaymentForm`** loads cart. When the cart total is positive, loads `GET /store/payment-providers?region_id={cart.region_id}` (effect re-runs if the total crosses zero, e.g. gift card removed). Renders:
1. Personal details — **logged-in:** from `Customer` (default checkout address) after `syncCartFromCustomer`; **guest:** from cart `shipping_address`. **Aanpassen** links to step 2, where account gegevens are edited on the customer record.
2. Cadeaubon / tegoedbon input — `commerceClient.applyCode` (promo **of** interne `GIFT-` saldocode via `POST /store/cart/gift-cards`); verwijderen per code: **kortingscode** via `removePromoCodes`, **cadeaubon** via `removeGiftCardCode`. Na succesvolle apply/remove: **`dispatchCartUpdated()`** (`lib/commerce/cart.ts`) zodat o.a. **`CheckoutPaymentOrderOverview`** (luistert naar `va:cart-updated`) totalen opnieuw ophaalt.
3. Payment method tiles (`PaymentMethodTiles`) — only when there is an amount due; one tile per enabled Mollie provider in the region
4. Trust signals
5. Primary CTA (`payLabel` from CMS) — directly above it: NL notice that clicking pay accepts the terms; `voorwaarden` links to `/algemene-voorwaarden`

**When total ≤ €0 (zero-total checkout):** Medusa’s cart completion skips payment when `credit_line_total >= 0` and `total <= 0`. The storefront hides payment tiles, does not require a method, and on submit calls `commerceClient.completeCart(cartId)` (`POST /store/carts/:id/complete`). On success it clears the `va_cart_id` cookie via `clearCartId()` and navigates to `/checkout/bevestiging?order={order.id}`. On `{ type: 'cart', error }` the user sees the error message in the existing toast.

**When there is an amount due:** On submit:
1. `initiatePaymentSession(cartId, selectedProviderId)` → creates payment collection + session → gets Mollie `checkout_url` from `session.data.checkoutUrl`
2. `window.location.href = checkoutUrl` — redirects to Mollie hosted page

`selectedProviderId` is the full provider ID (e.g. `pp_mollie-ideal_mollie`). No separate `methodId` is needed.

**Guards:** cart must have `email` set; if not → redirect `/checkout/inloggen`. If **logged-in** and `!isCustomerProfileComplete(customer)` → redirect `/checkout/inloggen`. If **guest** and cart shipping is incomplete → redirect `/checkout/inloggen`.

## Step 4 — Bevestiging

Arrival from Mollie success redirect: `?session_id=…`. Zero-total flow passes `?order=…` from the client after `completeCart`. The page also accepts `?order=…` when the order id is already known.

Renders success icon, heading, subheading, order number, order items table, and back-to-overview CTA.

**Guards:** Neither `?order` nor `?session_id` present → redirect `/`.

## Mollie redirect contract

Mollie redirects to: `{MOLLIE_REDIRECT_URL}` (set in `medusa/.env`, e.g. `http://localhost:3000/checkout/bevestiging`).

Mollie also POSTs webhooks to: `{MEDUSA_URL}/hooks/payment/pp_mollie-<method>_mollie` (async, may arrive before or after the browser redirect).

## Payment providers

Listed via Medusa's built-in endpoint `GET /store/payment-providers?region_id=...`.  
Enabled per region in **Medusa Admin → Settings → Regions → [Region] → Payment**.

`PaymentMethodTiles` maps each provider ID to a human label and Mollie icon using a built-in lookup table. Labels can be overridden per provider in Sanity `siteSettings.checkout` (planned).

## Sanity CMS fields

All UI strings come from `generalSettings.checkout` (fetched server-side in layout + each page). See `sanity/src/schemas/generalSettings.ts` for field definitions.

## Session storage

- Cart: `va_cart_id` cookie (30-day, SameSite=Lax)
- Auth: Medusa session cookie (HttpOnly, set by Medusa server on `/auth/customer/emailpass`)
- Registration intent: `sessionStorage['va_checkout_register']` (cleared post-payment)

## CORS requirements

`medusa/.env`:
```
STORE_CORS=http://localhost:3000,...
AUTH_CORS=http://localhost:7001,http://localhost:9000,http://localhost:3000
```
