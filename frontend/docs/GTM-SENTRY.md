# GTM errors in Sentry

Some client errors in Sentry originate from **Google Tag Manager** custom HTML/JS, not from this repo. Examples from production:

| Sentry issue | Symptom | Likely GTM fix |
|--------------|---------|----------------|
| `auth_isLoggedIn is not defined` | Custom variable referenced in a tag without a definition | Define a GTM variable `auth_isLoggedIn` (Data Layer or JS) or remove references |
| `Cannot read properties of null (reading 'setAttribute')` | Tag runs before DOM target exists | Guard with `if (element) element.setAttribute(...)` or fire tag on the correct trigger |

The frontend also drops events whose stack includes `gtm.js` / `googletagmanager.com` via `src/lib/sentry-filter.ts` so GTM mistakes do not open new Sentry issues. Fix the container anyway so users are not affected in the browser.

**In Sentry (manual):** Archive resolved noise issues as *Ignored* (until escalating) and enable **Project Settings → Inbound Filters → Browser extensions** and **Legacy browsers**.

## Release, users and outage handling

- **Client release:** `next.config.js` inlines `SENTRY_RELEASE` / `DEPLOYMENT_VERSION` as `NEXT_PUBLIC_SENTRY_RELEASE`, so browser events carry `release` (needed for "resolved in release" / regressions).
- **Users:** `CustomerProvider` calls `Sentry.setUser({ id })` (opaque Medusa customer id, no email); cleared on logout.
- **Player noise:** `filterSentryEvent` drops null-after-dispose / `InvalidStateError` events whose top frame is in `video.js`, `videojs-contrib-eme` or `audienceplayer-embed-player`. `runtime.ts` calls `player.off()` before `dispose()`.
- **Medusa outages:** `getEvent`, `getEventsPaginated`, `getVathuisPaginated` retry 502/503/504 twice, then throw `MedusaUnavailableError`. `sentry.server.config.ts` fingerprints it as `medusa-upstream-unavailable` (tag `upstream:medusa`), so an outage is one issue. **Manual:** add a Sentry alert on that issue for > 20 events / 5 min.
- **Storage:** use `src/lib/safe-storage.ts` (`safeLocalStorage` / `safeSessionStorage`); even reading `window.sessionStorage` can throw when blocked.
