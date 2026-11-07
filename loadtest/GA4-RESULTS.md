# GA4-shaped load tests (staging v2, 2026-03-22)

Scripts: `scenarios/ga4-*.js` — mixed journey (60% browse, 25% account, 10% search, 5% checkout), 3–5 s think time.

**Pass criteria:** `page_load_ms` p95 &lt; 800 ms, `checkout_step_ms` p95 &lt; 1.5 s, `http_req_failed` &lt; 1%.

Always run with `unset K6_VUS` (a global `K6_VUS` in `config.env` breaks multi-stage scripts).

## Results summary

| Test | VUs / duration | page p95 | checkout p95 | Error rate | Verdict |
|------|----------------|----------|--------------|------------|---------|
| **Normal** (full) | 50, 15 min | **117 ms** | **665 ms** | **2.5%** | Latency pass; **fail** on errors (see note) |
| **Peak** (full, flawed journey) | 200, 15 min | 1.67 s | 9.27 s | 2.4% | **Fail** latency + errors |
| **Smoke** (fixed `/checkout/inloggen`) | 50, 3 min | **145 ms** | **455 ms** | **0%** | **Pass** |
| **Peak smoke** (fixed, post-redeploy) | 200, 5 min | **1.68 s** | above 1.5 s | **0%** | **Fail** latency; stability OK |
| **Spike** | 350, 5 min | low on OK reqs | — | **~33%** | **Fail** — host RAM ~93%, frontend crashed (500), redeploy required |

### Note on normal / first peak error rate

Journey initially called **`/checkout` (404)**. That inflated `http_req_failed`. Fixed in `lib/mixed-journey.js` → **`/checkout/inloggen`**. Re-run normal/peak for a clean error-rate number if needed.

### Spike / launch readiness

At **350 VU** the single staging host (frontend **1× cluster**, **~93% RAM** during spike) did not hold. After spike, Next.js served **500** (`client reference manifest` missing) until **`frontend/scripts/deploy.sh`** was run manually.

For **Nov 10 + email**, plan **200 VU** as a realistic peak target on current hardware; **350+** needs more frontend/Medusa workers or **4 CPU / 16 GB** before go-live. Run spike only off-hours and **never against production** without a window.

## Commands

```bash
set -a && source loadtest/config.env && set +a && unset K6_VUS

k6 run loadtest/scenarios/ga4-normal.js      # 50 VU, 15 min
k6 run loadtest/scenarios/ga4-peak.js          # 200 VU, 15 min
k6 run loadtest/scenarios/ga4-spike.js        # 350 VU spike — destructive on small host
GA4_SOAK_DURATION=15m k6 run loadtest/scenarios/ga4-soak.js

k6 run loadtest/scenarios/ga4-smoke.js        # 50 VU, 3 min sanity
k6 run loadtest/scenarios/ga4-peak-smoke.js  # 200 VU, 5 min
```

## Interpretation vs GA4

- **50 VU normal** matches “40–100 concurrent” with comfortable headroom when errors are fixed (sub-150 ms p95 in smoke).
- **200 VU** stays up with **0% errors** after redeploy but **page p95 ~1.7 s** — above 800 ms target; account + PDP paths dominate. Needs scaling or CDN before mailing at 2–3× this week’s peak.
- **Account traffic** hits `/login`, `/mijn-account/*` without cookies (login wall) — still dynamic SSR; for true logged-in profiel load, add a `LOAD_TEST_SESSION_COOKIE` later.

Raw logs: `loadtest/results-ga4-*.log` (gitignored).
