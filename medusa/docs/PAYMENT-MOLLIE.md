# Mollie Payment Provider

Mollie is integrated via the community plugin [`@variablevic/mollie-payments-medusa`](https://github.com/VariableVic/mollie-payments-medusa), registered in `medusa-config.ts` under `modules.payment.options.providers`.

The plugin’s npm peer dependencies still target Medusa 2.5.1 while this project uses 2.13.x. `medusa/.npmrc` sets `legacy-peer-deps=true` so `npm ci` / `npm install` succeed until upstream updates the plugin.

## Environment Variables

Add to `medusa/.env`:

```
MOLLIE_API_KEY=test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# URL to redirect to after Mollie payment (storefront confirmation page)
MOLLIE_REDIRECT_URL=http://localhost:3000/bedankt
# URL of the Medusa server — used by the plugin for webhook registration (required; no default in code)
MEDUSA_URL=http://localhost:9000
```

For production, `MEDUSA_URL` must be a publicly reachable URL so Mollie can POST webhooks. If it is missing or blank, `medusa-config.ts` will throw at startup.

## Local dev with Cloudflare Tunnel

Mollie needs a public webhook URL even in test mode. Expose local Medusa (port 9000) with a Cloudflare quick tunnel:

```bash
# Terminal 1 — keep running while testing payments
cd medusa && npm run tunnel

# Copy the printed URL into medusa/.env:
MEDUSA_URL=https://your-subdomain.trycloudflare.com

# Terminal 2 — restart Medusa after changing .env
npm run dev
```

Requires [`cloudflared`](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/) on your PATH (`brew install cloudflare/cloudflare/cloudflared` on macOS).

The quick tunnel URL changes each time you start `npm run tunnel`. For a stable hostname, use a [named Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/) on your own domain.

`MOLLIE_REDIRECT_URL` can stay `http://localhost:3000/bedankt` — the browser redirect goes to the storefront thank-you page, not Medusa.

### Alternative: ngrok

```bash
ngrok http 9000
# Set MEDUSA_URL=https://abc123.ngrok.io in medusa/.env
# Restart Medusa after changing .env
```

## Provider IDs

The plugin registers one provider per payment method. All share the plugin's `id: "mollie"`:

| Provider ID | Method |
|---|---|
| `pp_mollie-hosted-checkout_mollie` | Mollie Hosted Checkout (shows all available methods) |
| `pp_mollie-ideal_mollie` | iDEAL |
| `pp_mollie-card_mollie` | Creditcard |
| `pp_mollie-bancontact_mollie` | Bancontact |
| `pp_mollie-giftcard_mollie` | Cadeaukaart (**Mollie** betaalmethode, o.a. nationale cadeaukaarten — niet hetzelfde als de **interne** Vrije Academie digitale cadeaubon; die gebruikt cart credit lines + module `giftCard`. Zie [GIFT-CARDS.md](./GIFT-CARDS.md).) |
| `pp_mollie-paypal_mollie` | PayPal |
| `pp_mollie-apple-pay_mollie` | Apple Pay |

## Region setup

After starting Medusa with the plugin for the first time:

1. Run `npm run seed:region` to create the Nederland / EUR region.
2. Open **Medusa Admin → Settings → Regions → Nederland → Payment** and enable the Mollie providers you want to offer.

## Adding a new Mollie method later

The plugin already includes all services. Just enable the provider in Medusa Admin for the relevant region. No code changes needed.

## Webhook flow

```
Mollie ──POST id=tr_xxx──► /hooks/payment/pp_mollie-<method>_mollie (Medusa built-in)
  └──► plugin MollieBase.getWebhookActionAndData()
         └── GET Mollie /v2/payments/tr_xxx
         └── maps status → WebhookActionResult
              paid       → "captured"  → Medusa captures + order created
              failed/expired → "failed" → session marked failed
```

## Billing address (storefront)

The Mollie plugin sends `context.customer.billing_address` to the Mollie API (not cart `shipping_address`). Checkout therefore sets **`is_default_billing: true`** on the customer address (`upsertCheckoutShippingAddress`) and copies the same payload to **`billing_address`** on the cart (`syncCartFromCustomer`, guest draft restore). `initiatePaymentSession` runs `ensureMollieBillingForPayment` first so payment always sees a postcode even when the UI already showed shipping details.
