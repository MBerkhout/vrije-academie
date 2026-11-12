# GTM errors in Sentry

Some client errors in Sentry originate from **Google Tag Manager** custom HTML/JS, not from this repo. Examples from production:

| Sentry issue | Symptom | Likely GTM fix |
|--------------|---------|----------------|
| `auth_isLoggedIn is not defined` | Custom variable referenced in a tag without a definition | Define a GTM variable `auth_isLoggedIn` (Data Layer or JS) or remove references |
| `Cannot read properties of null (reading 'setAttribute')` | Tag runs before DOM target exists | Guard with `if (element) element.setAttribute(...)` or fire tag on the correct trigger |

The frontend also drops events whose stack includes `gtm.js` / `googletagmanager.com` via `src/lib/sentry-filter.ts` so GTM mistakes do not open new Sentry issues. Fix the container anyway so users are not affected in the browser.

**In Sentry (manual):** Archive resolved noise issues as *Ignored* (until escalating) and enable **Project Settings → Inbound Filters → Browser extensions** and **Legacy browsers**.
