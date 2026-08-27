# Customer authentication (OTP & passwordless)

Storefront checkout and `/login` use Medusa `customer` + `emailpass`, with custom OTP and passwordless registration via the `customerOtp` module.

## Lookup

`GET /store/customer/lookup?email=…` (alias: `/store/customer/exists`) returns:

```json
{ "exists": true, "hasPassword": false }
```

- `exists` — customer row in Medusa Customer module
- `hasPassword` — `emailpass` provider identity has a stored password hash **or** a legacy Django PBKDF2 hash exists (`legacyPassword` module)

Salesforce-imported customers without auth credentials → `exists: true`, `hasPassword: false` → OTP login.

Customers imported from the old site with Django password hashes → `exists: true`, `hasPassword: true` → password login (see [Legacy password migration](#legacy-password-migration)).

On successful **OTP verify** or **password login**, Medusa enqueues a Salesforce **pull** (when the customer is linked or matchable by email) so profile and address reflect the latest Contact data. Password login also calls `POST /store/customer/me/sync-from-salesforce` from the storefront client.

## Password login

`POST /store/auth/login` — body `{ email, password }`, returns `{ token }`.

Used by the storefront instead of the built-in `/auth/customer/emailpass` route. Flow:

1. Try Medusa `emailpass` (scrypt) authentication.
2. On failure, check `customer_legacy_password` for a Django `pbkdf2_sha256$…` hash.
3. If legacy password matches: store new scrypt hash via `auth.updateProvider`, delete legacy row, return JWT.
4. If both fail: `401`.

## Legacy password migration

Imported customers from the old Django site store passwords as `pbkdf2_sha256$<iterations>$<salt>$<base64hash>` (Django `PBKDF2PasswordHasher`). These are stored in `customer_legacy_password` (`legacyPassword` module) until the customer logs in once.

On first successful login with a legacy hash, the password is re-hashed to Medusa scrypt and the legacy row is removed. Subsequent logins use the standard Medusa hash.

### Import legacy hashes

CSV format: `email,password_hash` (header optional). Hash must start with `pbkdf2_sha256$`.

```bash
npm run legacy:import-passwords -- --file=./data/legacy-passwords.csv
npx medusa exec ./src/scripts/import-legacy-passwords.ts -- --dry-run --file=./data/legacy-passwords.csv
```

Skips customers that already have a Medusa password hash.

### Verify a hash manually

```bash
npx medusa exec ./src/scripts/verify-legacy-password.ts -- \
  --hash='pbkdf2_sha256$150000$L1HYAziUX37G$DYy9VQaENqqZKFO0IfA5WITGXVs+olzu0hscyn2Zac0=' \
  --password='your-plaintext'
```

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

## Admin (support)

On the customer detail page in Medusa Admin (`/app/customers/:id`), the **Account access** widget lets staff:

- View whether the customer has a password (`hasPassword`)
- **Generate verification code** — creates a new 6-digit login OTP, shown once in Admin (not emailed). Customer uses it on the storefront OTP login flow. Same 10 min TTL and verify-attempt limits as storefront OTP; admin generation bypasses the storefront 3/15 min request cap.
- **Reset password** — set a temporary password (default) or a custom password (min. 8 chars). Shown once in Admin. Clears any legacy Django hash.

Admin API (authenticated admin session, same as other `/admin/*` routes):

| Route | Method | Response |
|-------|--------|----------|
| `/admin/customer-auth/:id` | GET | `{ email, hasPassword }` |
| `/admin/customer-auth/:id/otp` | POST | `{ code, expires_at }` |
| `/admin/customer-auth/:id/reset-password` | POST | `{ password }` — body `{ password? }` optional |

CLI fallback (ops / scripts):

```bash
npx medusa exec ./src/scripts/reset-password.ts -- \
  --email=user@example.com \
  --password='new-secure-password'
```

If `--password` is omitted, a temporary `VaTemp-…!` password is generated.

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

| `POST /store/auth/login` | Password login with legacy migration (`{ email, password }` → `{ token }`) |
| `POST /store/auth/set-password` | Set or change password (`oldPassword` or `otpCode` + `newPassword`) |

Optional profile fields (website → Medusa `customer.metadata` → Salesforce): **`sf_birthdate`** (ISO `YYYY-MM-DD`) → Contact `Birthdate` / Account `PersonBirthdate`.

## Module

- `src/modules/customer-otp/` — challenge storage + send adapter
- `src/modules/legacy-password/` — Django PBKDF2 hash storage for migration
- `src/lib/customer-auth/helpers.ts` — lookup, JWT issuance, registration, password migration, admin password reset
- `src/lib/customer-auth/django-pbkdf2.ts` — Django PBKDF2 verifier
- `src/admin/widgets/customer-auth-widget.tsx` — Admin customer detail support panel

Migrations: `npx medusa db:migrate` (includes `customerOtp` and `legacyPassword` module schema).
