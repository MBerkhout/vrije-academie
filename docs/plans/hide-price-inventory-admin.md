# Plan: hide Price Lists / Inventory / Shipping Profiles in Medusa admin

> **Superseded (inventory scope):** Built-in Medusa inventory UI is hidden separately via `medusa/src/admin/widgets/hide-inventory-admin.tsx`. Capacity stays on `EventItem.available_quantity` (not Medusa inventory). The migration-to-Medusa-inventory items below remain deferred.

Status: pending execution
Scope: Medusa backend (`medusa/`)

## Overview

Hide the "Price Lists", "Inventory", and "Shipping Profiles" sidebar/settings items in the Medusa admin via a minimal CSS-injecting widget, and align the Medusa docs to a single-variant, single-price, inventory-as-source-of-truth event model with no shipping profile.

## Todos

- [ ] **create-widget** — Create `medusa/src/admin/widgets/hide-price-inventory.tsx` that injects sidebar-only CSS hide rules.
- [ ] **verify-sidebar** — Start the admin and confirm Price Lists, Inventory, and Settings → Shipping Profiles are gone from the sidebar; keep product-detail Prices/Inventory and Shipping Profile cards visible.
- [ ] **verify-no-shipping-checkout** — End-to-end test that a cart containing an event (no shipping profile) completes checkout without breaking on shipping selection.
- [ ] **update-events-doc** — Update `medusa/docs/EVENTS.md`: single variant, one price on that variant, capacity = inventory quantity at the single stock location, drop `metadata.capacity`.
- [ ] **update-readme** — Update `medusa/docs/README.md`: overview bullets, event workflow, and note the admin UI hide widget.
- [ ] **update-open-points** — Update `medusa/docs/OPEN_POINTS.md`: record decision (inventory is source of truth, one stock location, Price Lists unused) and remove the resolved capacity-vs-variant question.
- [ ] **migrate-capacity** — If any existing event products carry `metadata.capacity`, back-fill inventory `stocked_quantity` from it and then delete the field (one-off ES module script in `medusa/scripts/`).
- [ ] **canonical-location-seed** — Add a one-time ES module seed script that ensures exactly one canonical stock location exists and is linked to the default sales channel.

## Approach

Medusa v2's admin dashboard (`@medusajs/dashboard`) hardcodes sidebar navigation, so there is no config flag to toggle "Price Lists" / "Inventory" off. The Admin SDK's `defineWidgetConfig` is the supported extension point. We'll register one tiny widget across a few common `InjectionZone`s that appends a `<style id="va-hide-admin-nav">` tag to `document.head`. Because the admin is an SPA, once the style tag is mounted on any early page (login-after, orders list, products list) it persists across navigation for the rest of the session.

Only the **top-level sidebar entries** are hidden. Product-detail Prices, Inventory, and Shipping Profile cards stay visible because that's where per-event price, capacity, and the (empty) shipping profile are configured/verified. Direct URLs like `/app/price-lists` remain reachable if needed for emergencies.

## Files to create

- `medusa/src/admin/widgets/hide-price-inventory.tsx` — single widget, multiple zones so it mounts regardless of landing page.

```tsx
import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { useEffect } from "react"

const STYLE_ID = "va-hide-admin-nav"
const CSS = `
  a[href^="/app/price-lists"],
  a[href^="/app/inventory"],
  a[href^="/app/settings/shipping-profiles"] { display: none !important; }
`

const HideAdminNav = () => {
  useEffect(() => {
    if (document.getElementById(STYLE_ID)) return
    const s = document.createElement("style")
    s.id = STYLE_ID
    s.textContent = CSS
    document.head.appendChild(s)
  }, [])
  return null
}

export const config = defineWidgetConfig({
  zone: [
    "login.after",
    "order.list.before",
    "product.list.before",
    "product.details.before",
    "customer.list.before",
  ],
})

export default HideAdminNav
```

Why these selectors are safe: `a[href^="/app/price-lists"]`, `a[href^="/app/inventory"]`, and `a[href^="/app/settings/shipping-profiles"]` target admin route URLs, which are a public contract of the dashboard. No fragile `data-testid` or class-name matches.

The **Shipping Profile card on product detail pages is intentionally not hidden** — its selectors are unstable, and admins still need to visually confirm the field is empty on each event.

## Docs to update (concise, consistent, per user rule)

Update [medusa/docs/EVENTS.md](../../medusa/docs/EVENTS.md):
- Remove `capacity` from the JSON metadata schema and the field-descriptions table.
- Update "Variants": each event product has **exactly one variant** (the ticket).
- Update "Inventory": capacity is the `stocked_quantity` on that single variant at the single stock location; `manage_inventory: true`.
- Add "Pricing": one price set on the single variant; Price Lists are not used for events.
- Rewrite both worked examples (online + offline) to show: one variant, price set directly on it, inventory `stocked_quantity` = capacity. Remove all `metadata.capacity` references.

Update [medusa/docs/README.md](../../medusa/docs/README.md):
- Keep the "Inventory management (capacity per event)" bullet but clarify: "single stock location, capacity = inventory quantity on the event's single variant".
- In "Event Creation Workflow": step 3 becomes "Create a single ticket variant with price and inventory quantity (= capacity)". Drop the old per-variant-capacity wording.
- Add a short "Admin UI" note under Development: "Price Lists, Inventory, and Shipping Profiles are hidden from the admin sidebar via `src/admin/widgets/hide-price-inventory.tsx`; direct URLs still work."

Update [medusa/docs/OPEN_POINTS.md](../../medusa/docs/OPEN_POINTS.md):
- Replace the "Event Capacity vs Variant Inventory" section with a resolved note: capacity = inventory `stocked_quantity`, single variant, single stock location, Price Lists unused.
- Remove the sold-out open question — Medusa's inventory module now enforces this automatically.

## Data migration (conditional)

Only if any existing products already carry `metadata.capacity`:

- Add `medusa/scripts/migrate-capacity-to-inventory.mjs` (ES module, per user rule).
- For each product whose metadata has a numeric `capacity`:
  1. Fetch the (expected single) variant and its inventory item at the canonical stock location.
  2. Set `stocked_quantity` to the metadata value using the inventory module's update.
  3. Unset `metadata.capacity`.
- Idempotent and safe to re-run. Run manually after deploy; not wired to `npm run migrate:run` because this is a one-off data task, not a SQL schema migration.

If there is no existing data, skip this todo entirely.

## Canonical stock location seed

Add `medusa/scripts/seed-canonical-location.mjs` (ES module, per user rule). Purpose: make the "one stock location" rule deterministic and idempotent.

Behavior:
1. Resolve the Stock Location Module and list existing locations.
2. **0 locations**: create one with a configured name (e.g. `"Vrije Academie Events"`), set as canonical.
3. **1 location**: ensure its name matches the canonical name; if not, rename it. No destructive action.
4. **2+ locations**: log a warning with all locations and their IDs, then exit non-zero. Deleting locations is destructive and must be a human decision — the script will not auto-pick one.
5. Link the canonical location to the default sales channel(s) via the appropriate link module so new products' inventory items resolve there.
6. Idempotent — safe to re-run after deploys.

This is a one-off bootstrap script, not a SQL schema migration, so it lives in `medusa/scripts/` and is invoked manually (e.g. `node scripts/seed-canonical-location.mjs`). Not wired into `npm run migrate:run`.

Document invocation in `medusa/docs/README.md` under a new "Initial setup" subsection.

## Non-goals / out-of-scope

- No `product.created` hook forcing new variants to link only to the canonical location — the seed script + default-sales-channel link is enough. Revisit if products start appearing with inventory at unexpected locations.
- No subscribers/hooks forcing `manage_inventory=true` or single-variant invariants. Convention + docs are enough for this team size; revisit if non-technical admins start mis-configuring products.
- No hiding of product-detail Prices, Inventory, or Shipping Profile cards. No hiding of `/app/settings/locations` (kept visible by choice).
- No route redirects for `/app/price-lists`, `/app/inventory`, or `/app/settings/shipping-profiles`.
- No changes to `medusa-config.ts` — Pricing, Inventory, and Fulfillment modules stay enabled (checkout depends on them).

## Verification

- `npm run build` in `medusa/` to confirm the admin build picks up the widget.
- Log into `http://localhost:9000/app` and confirm: no "Price Lists" in top nav, no "Inventory" in top nav, no "Shipping Profiles" under Settings.
- Open any product detail: Prices, Inventory (stock), and Shipping Profile sections are all still visible and editable.
- Navigate directly to `http://localhost:9000/app/price-lists`, `/app/inventory`, and `/app/settings/shipping-profiles` — pages still load (intentional escape hatch).
- **No-shipping checkout test**: create an event product with no shipping profile, add to cart on the storefront, and complete checkout. Confirm the flow doesn't hang or fail at a shipping-selection step. This guards against a silent Medusa v2 requirement that surfaces only at runtime.

## Rollback

Delete the widget file and rebuild. No data or config changes are involved (unless the capacity migration was run, which is a one-way data change — document that in the migration script header).

## Executing this plan later

When ready, open this file and ask the assistant to execute it. The assistant will switch out of plan mode and work through the todos in order.
