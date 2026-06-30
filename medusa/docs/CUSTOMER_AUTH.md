# Customer authentication (OTP & passwordless)

Storefront checkout and `/login` use Medusa `customer` + `emailpass`, with custom OTP and passwordless registration via the `customerOtp` module.

## Lookup

`GET /store/customer/lookup?email=…` (alias: `/store/customer/exists`) returns:

```json
{ "exists": true, "hasPassword": false }
```

- `exists` — customer row in Medusa Customer module
- `hasPassword` — `emailpass` provider identity has a stored password hash

Salesforce-imported customers without auth credentials → `exists: true`, `hasPassword: false` → OTP login.

On successful **OTP verify** or **password login**, Medusa enqueues a Salesforce **pull** (when the customer is linked or matchable by email) so profile and address reflect the latest Contact data. Password login also calls `POST /store/customer/me/sync-from-salesforce` from the storefront client.

## OTP

| Route | Auth | Body |
|-------|------|------|
| `POST /store/auth/otp/request` | Optional (required for `set_password`) | `{ email?, purpose?: "login" \| "set_password" }` |
| `POST /store/auth/otp/verify` | No | `{ email, code, purpose?: "login" }` |

- 6-digit code, 10 min TTL, max 3 requests / 15 min per email, max 5 verify attempts
- Codes stored hashed in `customer_otp_challenge` (`customerOtp` module)
- Email via SendGrid when `SENDGRID_API_KEY` is set; otherwise logged to Medusa stdout as `[customer-otp] email → code` (dev). Medusa loads a notification module without a provider by default — the adapter checks `SENDGRID_API_KEY` explicitly before calling it.

### Email (optional)

Set in `medusa/.env`:

```env
SENDGRID_API_KEY=...
SENDGRID_FROM=noreply@example.com
```

When `SENDGRID_API_KEY` is set, `medusa-config.ts` registers `@medusajs/notification-sendgrid`.

## Passwordless registration (checkout)

`POST /store/customer/register-passwordless` — creates customer + auth identity (no password), default shipping address, returns `{ token }`.

Used for unknown emails at checkout step 2 (always register, no guest path).

## Password registration (`/login`)

Storefront `commerceClient.register` uses `auth.register` → `auth.login` → `store.customer.create` → **`auth.refresh`** → `createAddress` → retrieve.

The login JWT is issued before the customer row exists, so `/store/customers/me` and address routes return **401** until the token is refreshed (same pattern as password login when `actor_id` was empty).

## Authenticated routes

| Route | Purpose |
|-------|---------|
| `GET /store/customer/me/auth-status` | `{ hasPassword: boolean }` |
| `POST /store/customer/me/sync-from-salesforce` | Enqueue Salesforce → Medusa profile refresh (body `{ email }`) |
| `POST /store/customer/me/push-to-salesforce` | Enqueue Medusa → Salesforce push (profile + default shipping address + birthdate); called after registration/address/profile save |

Optional profile fields (website → Medusa `customer.metadata` → Salesforce): **`sf_birthdate`** (ISO `YYYY-MM-DD`) → Contact `Birthdate` / Account `PersonBirthdate`.
| `POST /store/auth/set-password` | Set or change password (`oldPassword` or `otpCode` + `newPassword`) |

## Module

- `src/modules/customer-otp/` — challenge storage + send adapter
- `src/lib/customer-auth/helpers.ts` — lookup, JWT issuance, registration

Migrations: `npx medusa db:migrate` (includes `customerOtp` module schema).
