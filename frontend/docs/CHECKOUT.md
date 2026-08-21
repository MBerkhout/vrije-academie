# Checkout Flow

Steps 2–4 of the 4-step booking flow: **Inloggen → Betaling → Bevestiging**.

## URLs

| Step | URL | Component |
|------|-----|-----------|
| 1 | `/winkelwagen` | `CartView` |
| 2 | `/checkout/inloggen` | `CheckoutLoginForm` |
| 3 | `/checkout/betaling` | `CheckoutPaymentOrderOverview` + `CheckoutPaymentForm` |
| 4 | `/bedankt` (legacy `/checkout/bevestiging` → redirect) | `bedankt/page.tsx` |
| — | `/login` | `LoginForm` |

## Architecture

```
/checkout/layout.tsx           (server — fetches generalSettings)
  CheckoutStepperClient        (client — reads pathname for active step)
  CheckoutContentWithSummary   (client — pathname: betaling = sidebar `helpTrustOnly`; else full summary)
  CheckoutOrderSummaryClient   (client — reads cart unless `helpTrustOnly`)
  {children}
```

**Stepper labels:** CMS field `generalSettings.cart.stepLabels`. When not set in Sanity, `CheckoutStepper` and `CartStepper` fall back to Dutch: **Overzicht**, **Inloggen**, **Betaling**, **Bevestiging**. The mobile checkout stepper’s previous-step control uses **Terug**. On mobile, step 4 omits the **Bevestiging** label (dots + `(4 / 4)` only) so the bar fits on one screen.

**Layout:** 2/3 + sticky sidebar on all checkout substeps. On **`/checkout/betaling`**, the main column starts with **`CheckoutPaymentOrderOverview`** (order lines + totals in a “Jouw gegevens”-style panel); the sidebar uses **`CheckoutOrderSummaryClient` `variant="helpTrustOnly"`** (Hulp nodig + USPs only — no “Bestellingsoverzicht” block). On **`/checkout/inloggen`** and **`/checkout/bevestiging`**, the sidebar is the full order summary (`CheckoutOrderSummaryMobile` + `CheckoutOrderSummaryDesktop`). Vertical spacing uses `gap-6`. `CheckoutLoginForm` is full width until `lg`, then capped with `max-w-lg` inside the 2/3 column.

## Step 2 — Inloggen (`CheckoutLoginForm`)

Field rules and the password-strength meter are shared with **`LoginForm`** (`/login`):

- `src/lib/auth/account-field-validation.ts` — `validateAccountField` (email, passwords with `login` vs `register` policy, Dutch address fields, etc.)
- `src/lib/auth/password-strength.ts` — `passwordStrengthLevel` / bar color helpers
- `src/components/auth/ValidatedInput.tsx`, `PasswordStrengthMeter.tsx`

Presentation for each checkout sub-step lives in `src/components/checkout/login/` (`CheckoutLoginEmailStep`, `CheckoutLoginKnownStep`, `CheckoutGuestDetailsStep`).

Progressive email-first state machine:

```
email  ──(lookup)──► known ──(password or OTP)──► /checkout/betaling
 │                      └──(profile incomplete)──► logged_in_details
 └──► unknown ──(register-passwordless)──► /checkout/betaling
```

| State | What happens |
|-------|-------------|
| `email` | Single email field + Volgende; `GET /store/customer/lookup` → `{ exists, hasPassword }` |
| `known` | **Has password:** password login or OTP button → 6-digit code. **No password:** OTP sent automatically. No guest bypass. |
| `unknown` | Address form + newsletter opt-in. The phone field explains that the number is only used for order updates. Always `POST /store/customer/register-passwordless` (passwordless account + JWT). |
| `logged_in_details` | Same address form for **logged-in** users; e-mail read-only. The phone field has the same order-update explanation. Saves to **Medusa customer** first, then syncs the cart. |

**Data ownership**

- **Logged-in:** `Customer` (name, phone, saved address via Store API) is the **source of truth**. `commerceClient.updateCustomerProfile`, `upsertCheckoutShippingAddress`, then `syncCartFromCustomer` copies that onto the cart for payment (`shipping_address` + `billing_address`, same payload).
- **New customers:** registered immediately at step 2 via `commerceClient.registerPasswordless`; session JWT links the order to the customer.

Helpers: `src/lib/commerce/checkout-profile.ts` (`isCustomerProfileComplete`, `getDefaultCheckoutAddress`, `customerToShippingPayload`, `isCartShippingComplete`).

OTP/passwordless backend: `medusa/docs/CUSTOMER_AUTH.md`. Commerce methods: `customerLookup`, `requestOtp`, `verifyOtp`, `registerPasswordless`.

**Guards:**
- Empty cart → redirect `/winkelwagen`
- Already logged-in with **complete** profile → `syncCartFromCustomer` then redirect `/checkout/betaling` (unless `?bewerken=1` — see below)
- Already logged-in with **incomplete** profile → `logged_in_details` (no immediate redirect to betaling)

**Gegevens aanpassen (edit mode):** From step 3, **Gegevens aanpassen** and the stepper link back to step 2 use `/checkout/inloggen?bewerken=1`. With that query param, a logged-in customer with a complete profile stays on the details form (prefilled from the account) instead of being auto-skipped to betaling; a **guest** with complete cart shipping sees the same details form prefilled from the **cart** (e-mail included). Both get **Terug naar betaling**. They can save and continue to betaling, go back without saving, or (logged-in only) **Uitloggen** to switch account or continue as guest.

**Bootstrap:** On mount, `CheckoutLoginForm` resolves session/cart before showing the email step (spinner), so logged-in users with a complete profile are not shown step 2 briefly before redirect to betaling. **`ProceedCta`** links straight to `/checkout/betaling` when the customer profile is already complete.

## Step 3 — Betaling (`betaling/page.tsx`, `CheckoutPaymentOrderOverview`, `CheckoutPaymentForm`)

**`CheckoutPaymentOrderOverview`** (above the form): loads cart + **`fetchCartExtras`**. All line items via **`OrderSummaryLineItems`** (bold title, thumbnail, **`buildLineItemQuantityLabel`**, **`onlineCityFallback`**) + **`OrderSummaryTotalsBlock`**. Same component in the sidebar on inloggen/bevestiging.

**`CheckoutPaymentForm`** loads cart. When the cart total is positive, loads `GET /store/payment-providers?region_id={cart.region_id}` (effect re-runs if the total crosses zero, e.g. gift card removed). Renders:
1. Personal details — **logged-in:** from `Customer` (default checkout address) after `syncCartFromCustomer`; **guest:** from cart `shipping_address`. **Gegevens aanpassen** links to `/checkout/inloggen?bewerken=1`, where account gegevens can be edited (or the user can log out).
2. Cadeaubon / tegoedbon input — `commerceClient.applyCode` (promo **of** interne `GIFT-` saldocode via `POST /store/cart/gift-cards`); verwijderen per code: **kortingscode** via `removePromoCodes`, **cadeaubon** via `removeGiftCardCode`. **Enter** in het codeveld roept dezelfde apply aan als **Code toepassen** (`preventDefault` — het veld staat in het betaal-`<form>` en mag anders submit naar Mollie triggeren). Na succesvolle apply/remove: **`dispatchCartUpdated()`** (`lib/commerce/cart.ts`) zodat o.a. **`CheckoutPaymentOrderOverview`** (luistert naar `va:cart-updated`) totalen opnieuw ophaalt.
3. Payment method tiles (`PaymentMethodTiles`) — only when there is an amount due; one tile per enabled Mollie provider in the region
4. Trust signals
5. Primary CTA (`payLabel` from CMS) — directly above it: NL notice that clicking pay accepts the terms; `voorwaarden` links to `/algemene-voorwaarden`

**When total ≤ €0 (zero-total checkout):** Medusa’s cart completion skips payment when `credit_line_total >= 0` and `total <= 0`. The storefront hides payment tiles, does not require a method, and on submit calls `commerceClient.completeCart(cartId)` (`POST /store/carts/:id/complete`). On success it clears the `va_cart_id` cookie via `clearCartId()` and navigates to `/checkout/bevestiging?order={order.id}`. On `{ type: 'cart', error }` the user sees the error message in the existing toast.

**When there is an amount due:** On submit:
1. `prepareCheckout(cartId)` — `POST /store/carts/:id/prepare-checkout` clears `requires_shipping` on line items (event registrations are digital; Medusa would otherwise require a shipping method at cart completion when the Mollie webhook fires)
2. `ensureMollieBillingForPayment` — marks the checkout address as default **billing** on the customer (Mollie reads `customer.billing_address`, not cart shipping) and mirrors it on the cart
3. `initiatePaymentSession(cartId, selectedProviderId)` → creates payment collection + session → reads Mollie checkout URL from `session.data._links.checkout.href` (fallback: `session.data.checkoutUrl`)
4. `window.location.href = checkoutUrl` — redirects to Mollie hosted page

`selectedProviderId` is the full provider ID (e.g. `pp_mollie-ideal_mollie`). No separate `methodId` is needed.

**Guards:** cart must have `email` set; if not → redirect `/checkout/inloggen`. If **logged-in** and `!isCustomerProfileComplete(customer)` → redirect `/checkout/inloggen`. If **guest** and cart shipping is incomplete → redirect `/checkout/inloggen`.

## Step 4 — Bevestiging

**URL:** `/bedankt` (legacy `/checkout/bevestiging` redirects here).

After Mollie payment, Mollie redirects to `{MOLLIE_REDIRECT_URL}` (e.g. `http://localhost:3000/bedankt`) **without** query params. The page reads `va_cart_id` from the cookie and polls `GET /store/checkout/confirmation?cart_id=…` until the webhook has created the order (`status: ready`). Zero-total checkout navigates directly with `?order=…`.

Once the order is confirmed the URL is updated to `/bedankt?order={order.id}&token={view_token}` so the page can be bookmarked or revisited. The `view_token` is a 24-char HMAC-SHA256 (`THANK_YOU_SECRET` env → fallback `COOKIE_SECRET`). When visiting with both `?order=` and `?token=`, the backend validates the token before returning data.

**Layout — two columns (lg+):**
- **Left:** success icon + "Bedankt voor je inschrijving, {firstName}!" + "Je ontvangt een bevestiging op {email}" + bestelnummer + participation notices (zaal vs online, based on `event_item.delivery_type`) + "Vragen? Neem contact op" (phone + email from `generalSettings.footer.contact`).
- **Right:** order summary card (items + totals).

**Below (full width):** VA Thuis recommendations. Heading: "Duik alvast in {category} met onze online cursussen" (first catalog category of purchased products). CTA: "Alles van {category} online bekijken" → `/va-thuis/ons-aanbod?category={slug}`. Shows up to 4 cards; for VA Thuis orders uses similar-products logic with fallback to top catalog items.

Clears `va_cart_id` when the order is confirmed.

**Guards:** Without cookie / `?order` / `?session_id`, shows a friendly message (no redirect to homepage).

**Failed payments:** When Mollie cancels or the payment fails, the confirmation endpoint checks the live Mollie payment status (Medusa session data is often still `pending`/`open` on browser redirect). It returns `status: "failed"` and the frontend redirects to `/checkout/betaling?betaling=mislukt`. The payment form shows an amber banner: "Je betaling is niet voltooid — je kunt hieronder een andere betaalmethode kiezen." While polling, `/bedankt` shows "We controleren je betaling…" instead of the thank-you heading.

## Mollie redirect contract

Mollie redirects to: `{MOLLIE_REDIRECT_URL}` (set in `medusa/.env`, e.g. `http://localhost:3000/bedankt`).

Mollie also POSTs webhooks to: `{MEDUSA_URL}/hooks/payment/pp_mollie-<method>_mollie` (async, may arrive before or after the browser redirect).

## Payment providers

Listed via Medusa's built-in endpoint `GET /store/payment-providers?region_id=...`.  
Enabled per region in **Medusa Admin → Settings → Regions → [Region] → Payment**.

`PaymentMethodTiles` maps each provider ID to a human label and Mollie icon using a built-in lookup table (iDEAL, Creditcard, Bancontact, PayPal, Apple Pay, Cadeaukaart, Mollie Checkout, **Klarna**). Labels can be overridden per provider in Sanity `siteSettings.checkout` (planned).

## Sanity CMS fields

All UI strings come from `generalSettings.checkout` (fetched server-side in layout + each page). See `sanity/src/schemas/generalSettings.ts` for field definitions.

## Session storage

- Cart: `va_cart_id` cookie (30-day, SameSite=Lax)
- Guest checkout draft: `sessionStorage['va_checkout_draft']` (7-day TTL; cleared with `clearCartId()` after order)
- Auth: Medusa session cookie (HttpOnly, set by Medusa server on `/auth/customer/emailpass`)
- Registration intent: `sessionStorage['va_checkout_register']` (cleared post-payment)
- Newsletter opt-in: `sessionStorage['va_checkout_newsletter']` (`{ optIn: boolean }`; also on register payload as `newsletter_opt_in`)

## CORS requirements

`medusa/.env`:
```
STORE_CORS=http://localhost:3000,...
AUTH_CORS=http://localhost:7001,http://localhost:9000,http://localhost:3000
```
