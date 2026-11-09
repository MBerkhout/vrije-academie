# Briefing: Stape server GTM + Medusa (Vrije Academie)

**Doel:** server-side `purchase`, `refund` en `sign_up` vanuit Medusa naar Stape server GTM, met browser-events via web GTM + Data Tag voor dedupe (`event_id`).

**Niet in Medusa Admin:** er is geen GTM-instelling in het Medusa-dashboard. Alleen **Medusa `.env`** (backend) en **GTM web + server containers** (Stape).

---

## 1. Wat de code al doet

| Bron | Trigger | `event_name` | Idempotency |
|------|---------|--------------|-------------|
| Medusa | `order.completed` | `purchase` | `order.metadata.gtm_purchase_sent_at` |
| Medusa | `order.canceled` | `refund` | `order.metadata.gtm_refund_sent_at` |
| Medusa | `customer.created` (alleen met `analytics_sign_up_event_id`) | `sign_up` | `customer.metadata.gtm_sign_up_sent_at` |
| Storefront | `dataLayer` | o.a. `add_to_cart`, `login`, `sign_up`, … | `event_id` op relevante events |

**HTTP (Medusa → Stape):** `POST` naar `SGTM_ENDPOINT_URL`, query `?v=2&event_name=<event>`, JSON-body met o.a. `event_name`, `transaction_id`, `value`, `currency`, `items`, `user_data`, `client_id`, `session_id`, `event_id`, `fbp`, `fbc`, `gclid`, …

Zie `medusa/src/lib/gtm/send-sgtm-event.ts`, `frontend/docs/ANALYTICS.md`, `medusa/docs/EVENTS.md` (sectie Server-side analytics).

---

## 2. Stape-account (voor implementatie)

Verzamel en noteer (niet in git):

| Item | Waar |
|------|------|
| **Server container URL** | Stape → sGTM container → **Domain** (bijv. `https://gtm.vrijeacademie.nl`) |
| **Data Client path** | Standaard `/data` → volledige URL: `https://<domain>/data` |
| **Data Client geheim** (optioneel) | Server GTM client-instellingen of Stape access key → `SGTM_PURCHASE_SECRET` |
| **Web GTM ID** | Bestaand webcontainer (storefront `NEXT_PUBLIC_GTM_ID`) |
| **Server GTM ID** | Stape server container |
| **GA4 Measurement ID** | `G-…` voor server GA4-tag |
| **Meta Pixel ID** | Voor server CAPI-tag |
| **Preview-token** | Server GTM preview → `SGTM_PREVIEW_HEADER` bij debug |

---

## 3. Server GTM container (Stape)

### 3.1 Data Client installeren

1. [Data Client template](https://github.com/stape-io/data-client) downloaden (ZIP).
2. Server container → **Templates** → **Clients** → import `.tpl`.
3. **Clients** → New → **Data Client**.
4. **Accepted path settings:** `/data` (of het pad dat je gebruikt).
5. Aanbevolen: **Always generate client_id** = uit (Medusa stuurt `client_id` mee als consent + cookies aanwezig).
6. Container **Submit** + **Publish**.

### 3.2 Tags (server)

Per platform minimaal:

**GA4 (server-side)**

- Tag type: GA4 (Stape/community server template).
- Measurement ID: productie-`G-…`.
- Trigger: Custom event waar `Event Name` = `purchase` / `refund` / `sign_up` (of “All events” gefilterd).
- Event parameters mappen vanuit **Event Data**: `transaction_id`, `value`, `currency`, `items`, `tax`, `shipping`, `coupon`, `client_id`, `session_id`, `event_id`.
- **User properties / user_data:** email etc. uit Event Data (template hashed waar vereist).

**Meta Conversions API**

- Trigger: zelfde events.
- `event_id` uit Event Data (dedupe met browser Pixel).
- `fbp` / `fbc` uit Event Data.
- Customer information parameters uit `user_data`.

**Optioneel:** Google Ads Enhanced Conversions, TikTok, etc. — pas bij livegang aan.

### 3.3 Triggers

- Client = **Data Client** (request verwerkt).
- Event name equals `purchase` / `refund` / `sign_up` (of regex op Event Data).

---

## 4. Web GTM container (storefront)

### 4.1 Bestaande dataLayer

Events komen uit `frontend/src/lib/analytics/` (zie checklist in `frontend/docs/ANALYTICS.md`).

### 4.2 Data Tag → server (dedupe)

1. **Data Tag** template (Community Gallery) in **web** container.
2. Per belangrijk browser-event (minimaal `add_to_cart`, `begin_checkout`, `login`, `sign_up`):
   - Event name = dataLayer `event`.
   - Server URL = Stape server domain + `/data`.
   - **Event Data:** map `event_id`, `items`, `value`, `currency`, `user_data`.
   - Consent: **Add consent state** aan.
3. **Geen** client-side `purchase` op `/bedankt` — alleen server `purchase`.

### 4.3 Consent Mode v2 (web container)

De storefront zet Consent Mode **in de pagina** vóór GTM (geen Cookiebot). Geen tweede default-tag in GTM toevoegen.

1. **Consent overview:** GTM Admin → Container settings → *Enable consent overview*.
2. **Tag consent (Advanced → Consent settings):**

| Tag | Vereiste consent |
|-----|------------------|
| GA4 Configuration / GA4 Event | `analytics_storage` (ingebouwd bij Google-tags) |
| Google Ads / Floodlight | `ad_storage`, `ad_user_data`, `ad_personalization` |
| Meta Pixel (Custom HTML / template) | `ad_storage` |
| Data Tag → server | `analytics_storage` + `ad_storage`; **Add consent state** |
| AppNexus (Custom HTML: `https://secure.adnxs.com/seg?add=29002675&t=1`) | `ad_storage` |

3. **Triggers:** Custom Event op dataLayer `event`-namen (zie `frontend/docs/ANALYTICS.md`). `consent_update` is optioneel voor tags die na accept moeten firen (bijv. extra `page_view`).
4. **Data layer variabelen:** `event_id`, `items`, `value`, `currency`, `user_data`, `ad_storage`, `analytics_storage`, `ad_user_data`, `ad_personalization`.
5. **Geen** client-side `purchase` — alleen server (Medusa).

**Server container:** Data Tag stuurt consent mee; Medusa stuurt attributie alleen als de bezoeker `hasConsent=true` had (`hasAttributionConsent`).

---

## 5. Medusa environment

### Lokaal (`medusa/.env`)

Alleen nodig om te testen tegen Stape preview:

```bash
SGTM_ENABLED=true
SGTM_ENDPOINT_URL=https://<jouw-stape-domain>/data
SGTM_PURCHASE_SECRET=<optioneel>
# SGTM_DEBUG=true
# SGTM_PREVIEW_HEADER=<server-preview-token>
```

Zonder `SGTM_ENDPOINT_URL` doet Medusa niets (subscribers returnen vroeg).

### Staging productie (`medusa` user op server, `~/app/medusa/.env`)

```bash
SGTM_ENABLED=true
SGTM_ENDPOINT_URL=https://<staging-of-prod-domain>/data
SGTM_PURCHASE_SECRET=<secret>
```

Daarna: `pm2 startOrReload ecosystem.config.cjs` (zie `docs/DEPLOYMENT.md`).

**SSH:** staging host staat in jullie infra (niet publiek op poort 22); `.env` handmatig op de server of via jullie secrets-proces.

---

## 6. Testplan

### 6.1 Server GTM Preview

1. Server container → Preview.
2. Medusa: `SGTM_DEBUG=true` + `SGTM_PREVIEW_HEADER` zetten.
3. Testorder afronden (niet Salesforce-import) → in preview: **Data Client** + `purchase` + GA4/Meta tags.

### 6.2 Medusa logs

```text
[gtm-purchase] sent <orderId> tx=VA-<display_id>
```

Bij fout: `[gtm-purchase] failed …`

### 6.3 Attribution

1. Cookiebanner **Akkoord** (`hasConsent=true`).
2. Checkout betaalstap → controleer `cart.metadata.analytics` (Admin API of DB).
3. Na `order.completed`: `order.metadata.analytics` + server payload met `client_id` / `event_id`.

### 6.4 cURL smoke (zonder order)

```bash
curl -sS -X POST \
  "https://<domain>/data?v=2&event_name=purchase" \
  -H "Content-Type: application/json" \
  -d '{"event_name":"purchase","transaction_id":"TEST-1","currency":"EUR","value":1,"tax":0,"items":[]}'
```

Verwacht: geen HTTP 400 “no client” (Data Client live). 401/403 = secret/config aan serverkant checken.

### 6.5 Refund / sign_up

- **Refund:** order cancel in Medusa (niet geïmporteerde SF-order) → `refund` in server preview.
- **Sign_up:** nieuwe registratie storefront → zelfde `event_id` in browser `sign_up` en server `sign_up` (customer.metadata `analytics_sign_up_event_id`).

---

## 7. Mapping server payload (referentie)

| Event Data key (purchase) | Bron |
|---------------------------|------|
| `transaction_id` | `VA-{display_id}` |
| `value`, `tax`, `shipping`, `currency` | order |
| `items[]` | line items (zelfde mapping als frontend analytics) |
| `user_data` | order / customer / adressen |
| `coupon` | handmatige promo code |
| `payment_type` | checkout attribution |
| `client_id`, `session_id`, `event_id`, `fbp`, `fbc`, `gclid`, `ttclid`, `user_agent`, `page_location` | `order.metadata.analytics` |

`refund`: zelfde `transaction_id`, `value`, `items`; `event_id` = `{purchase_event_id}-refund` indien aanwezig.

`sign_up`: `method`, `user_data`, `event_id` uit customer metadata.

---

## 8. Open taken (checklist)

- [ ] Stape server container + custom domain live
- [ ] Data Client geïmporteerd, path `/data`, gepubliceerd
- [ ] GA4 + Meta server tags + triggers
- [ ] Web Data Tag(s) met `event_id` voor browser events
- [ ] Geen client `purchase` op bedankpagina
- [ ] `SGTM_*` op staging/prod Medusa `.env` + PM2 reload
- [ ] Preview-test purchase + GA4/Meta debug / Events Manager
- [ ] Documenteer productie-IDs in password manager (niet in repo)

---

## 9. Contacts / links

- Stape helpdesk: [Data Client](https://stape.io/helpdesk/documentation/data-client)
- Web → server: [Send data from web to server](https://stape.io/helpdesk/documentation/send-data-from-web-to-server-container-in-google-tag-manager)
- Repo: `frontend/docs/ANALYTICS.md`, `medusa/docs/EVENTS.md`
