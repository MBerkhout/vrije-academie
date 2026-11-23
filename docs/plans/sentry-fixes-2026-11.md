# Sentry fix plan — November 2026

**Status (23 Nov):** Phases 0, 1 and 2 implemented in code, not yet deployed. Not done: friendly "tijdelijk niet beschikbaar" PDP page (error boundary still shows generic `ErrorView`), investigation of FRONTEND-19/23/24/26/27, Sentry alert + resolving issues (Phase 3, manual in Sentry).

Source: `vrije-academie-frontend`, environment `production`, last 14 days (9–23 Nov 2026).
Current production release: `895d7fa` (deployed 18 Nov ~17:20).

## Outage window (excluded from bug triage)

**23 Nov 2026, 11:13–11:34 UTC (12:13–12:34 CET)** — Medusa returned 502 for ~20 minutes.

| Issue | Events in window | Note |
|---|---|---|
| [FRONTEND-9](https://vrije-academie.sentry.io/issues/VRIJE-ACADEMIE-FRONTEND-9) `Failed to fetch event: 502` | 202 / 206 | PDP render (`/ons-aanbod/[handle]`) |
| [FRONTEND-2B](https://vrije-academie.sentry.io/issues/VRIJE-ACADEMIE-FRONTEND-2B) `Failed to fetch events: 502` | 12 / 12 | `/api/search/places` |
| [FRONTEND-2D](https://vrije-academie.sentry.io/issues/VRIJE-ACADEMIE-FRONTEND-2D) `CART_UNAVAILABLE` | 1 / 1 | Buy-all on VA Thuis PDP |

These are not bugs on their own, but they show the storefront has **no graceful degradation** when Medusa is down (see Phase 2).

## Already fixed by release `895d7fa` (no events since 18 Nov)

Resolve in Sentry with "Resolved in current release" so regressions re-open them:

- FRONTEND-15 / FRONTEND-16 — player teardown `ended` / `this.el_` (105 + 42 events, ~100 users). Fixed by destroy order in `src/lib/audience-player/runtime.ts`.
- FRONTEND-8, C, D, G, H, N, P, 1W — Medusa `Load failed` / `Failed to fetch` noise (now in `SENTRY_CLIENT_IGNORE_ERRORS` / `filterSentryEvent`).
- FRONTEND-R, 10, Y, W, 7 — extension / Firefox / third-party noise (filtered).
- FRONTEND-Z, 1K, 1N, 1Q, 1A, 17, 1H, 18, 1J, 1V — one-off or third-party, nothing since 18 Nov.

## Phase 0 — Observability (do first)

1. **Client release is missing.** Browser events have `release: null` because `sentryRelease()` reads `SENTRY_RELEASE` / `DEPLOYMENT_VERSION`, which are not exposed to the client bundle. Expose it as `NEXT_PUBLIC_SENTRY_RELEASE` at build time (deploy script) and read it in `src/lib/sentry-env.ts`. Without this, "resolved in release" and regression detection do not work for client issues.
2. **Identify users.** Call `Sentry.setUser({ id: customer.id })` in `CustomerProvider` after login (and `setUser(null)` on logout) so "users impacted" is accurate. ID only, no email (scrubber stays in place).

## Phase 1 — Real bugs still occurring on `895d7fa`

| # | Issue | Events since deploy | Fix |
|---|---|---|---|
| 1 | [FRONTEND-25](https://vrije-academie.sentry.io/issues/VRIJE-ACADEMIE-FRONTEND-25) `window.localStorage.getItem` undefined/null | 10 (4 users) | `ImpersonationBanner.tsx:13` reads `localStorage` during render without guard. Wrap in a safe helper (`try { window.localStorage?.getItem(...) } catch { return null }`); reuse it in `medusa-client.ts` (L241, L311), `wishlist.ts`, `recent-viewed.ts`, `recent-searches.ts`. |
| 2 | [FRONTEND-20](https://vrije-academie.sentry.io/issues/VRIJE-ACADEMIE-FRONTEND-20) `SecurityError` reading `sessionStorage` | 8 (2 users) | In `analytics/consent/storage.ts` the `typeof sessionStorage` check sits **outside** the `try`; accessing the global itself throws when storage is blocked. Move the check inside `try`. Same pattern: add a shared `safeSessionStorage()` and use it in `listing-return-anchor.ts`, `event-id.ts`, `checkout-notice.ts`, `checkout-draft.ts`, `impersonation.ts`, `ecommerce.ts`, `CheckoutLoginForm.tsx`. |
| 3 | [FRONTEND-Q](https://vrije-academie.sentry.io/issues/VRIJE-ACADEMIE-FRONTEND-Q), [22](https://vrije-academie.sentry.io/issues/VRIJE-ACADEMIE-FRONTEND-22), [1R](https://vrije-academie.sentry.io/issues/VRIJE-ACADEMIE-FRONTEND-1R), [M](https://vrije-academie.sentry.io/issues/VRIJE-ACADEMIE-FRONTEND-M), [29](https://vrije-academie.sentry.io/issues/VRIJE-ACADEMIE-FRONTEND-29) — video.js / `videojs-contrib-eme` async callbacks after dispose (`classList`, `player_.error`, `tagName`, `audioTracks`, `InvalidStateError`) | ~9 | Late EME/keysession promises fire after `player.dispose()`. In `runtime.ts`: before dispose, call `player.off()` (all events) and close EME sessions (`player.eme?.sessions` / `mediaKeys`) if available. Then add a `filterSentryEvent` rule: drop events whose **in-app frames are only** `video.js` / `videojs-contrib-eme` and message matches null-after-dispose patterns. |
| 4 | [FRONTEND-27](https://vrije-academie.sentry.io/issues/VRIJE-ACADEMIE-FRONTEND-27) `Could not delete all payment sessions` | 1 | Checkout path; already covered by `checkout-payment-guards`. Check breadcrumbs, confirm user got a retry path; tag `flow:checkout` and keep monitoring. |
| 5 | [FRONTEND-28](https://vrije-academie.sentry.io/issues/VRIJE-ACADEMIE-FRONTEND-28) `router state header ... could not be parsed` | 4 (1 client, 02:33 UTC) | Malformed `Next-Router-State-Tree` header from a bot/scanner. Ignore server-side (`ignoreErrors` in `sentry.server.config.ts`). |
| 6 | [FRONTEND-19](https://vrije-academie.sentry.io/issues/VRIJE-ACADEMIE-FRONTEND-19) `454: Handling is disabled`, [FRONTEND-26](https://vrije-academie.sentry.io/issues/VRIJE-ACADEMIE-FRONTEND-26) `fetch failed` (server), FRONTEND-23/24 | 1 each | Investigate stack after Phase 0 (release + user) is live; likely player/Chromecast and a transient Medusa blip. |

## Phase 2 — Resilience for Medusa outages (prevents today's error flood)

1. **PDP keeps serving during 5xx** — `cached-pdp.ts` → `getSharedCachedEvent`: on 5xx/network failure, throw a typed `MedusaUnavailableError` so `unstable_cache` keeps the last good entry (stale-while-revalidate) instead of caching/propagating the error. When there is no cached entry, render a friendly "tijdelijk niet beschikbaar" state with `Retry-After`, not the generic `(main)/error.tsx`.
2. **Small retry** in `medusa-client.ts` for idempotent GETs (`getEvent`, `getEventsPaginated`, `getVathuisPaginated`): 1–2 retries with short backoff on 502/503/504 and network errors.
3. **`/api/search/places`** — wrap in `try/catch`, return `{ places: [] }` with `503` + short cache on failure (search box degrades instead of erroring).
4. **`CART_UNAVAILABLE`** — `PdpEpisodesTable.handleBuyAll` (and other `addVariantToCart` callers) must `catch` and show a toast ("Winkelmandje is tijdelijk niet bereikbaar, probeer het zo opnieuw"), not leave an unhandled rejection.
5. **`PdpEpisodesTable.tsx:129`** — add `.catch(() => null)` to the preview-playback prefetch (currently an unhandled rejection that is only hidden by the Sentry filter).
6. **Sentry noise during outages** — tag Medusa 5xx errors with `upstream:medusa` and use a fingerprint (`['medusa-upstream', status]`) so an outage groups into one issue; add a Sentry alert on that issue for event spikes (> 20 / 5 min) so outages page someone instead of flooding issues.

## Phase 3 — Cleanup in Sentry

- Resolve the "already fixed" list above in release `895d7fa`.
- After Phase 1/2 ship, resolve the corresponding issues in the new release.
- Mark outage issues (9, 2B, 2D) resolved after Phase 2; regressions will reopen them.

## Docs to update when implementing

- `frontend/docs/GTM-SENTRY.md` — client release var, `setUser`, new filter rules, Medusa outage fingerprint + alert.
- `frontend/docs/CART.md` — `CART_UNAVAILABLE` user-facing handling.
- `frontend/docs/VATHUIS.md` — player teardown / EME cleanup.
