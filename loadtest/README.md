# Load tests (k6)

Run against **staging** (`https://v2.vrijeacademie.nl`) from a laptop or a second host — not production without a maintenance window.

## Setup

```bash
brew install k6   # or https://grafana.com/docs/k6/latest/set-up/install-k6/
cp loadtest/config.env.example loadtest/config.env
# edit config.env
set -a && source loadtest/config.env && set +a
```

`K6_VUS` in `config.env` overrides simple scenarios; **do not set it** when running `pdp-hot-cold.js` (multi-scenario).

## Scenarios

| Script | Purpose |
|--------|---------|
| `scenarios/browse.js` | Home, PLP, agenda, sample PDPs |
| `scenarios/pdp-hot-cold.js` | One hot PDP vs random handles |
| `scenarios/spike.js` | 10× ramp on a single PDP |
| `scenarios/api-only.js` | Medusa `/store/*` ceiling |
| `scenarios/checkout-light.js` | Cart create + line item (no payment) |
| `scenarios/ga4-normal.js` | **50 VU**, 15 min — GA4 mixed journey (browse / account / search / checkout) |
| `scenarios/ga4-peak.js` | **200 VU** (configurable), 15 min — launch peak |
| `scenarios/ga4-spike.js` | **350 VU** spike ~2 min — email blast |
| `scenarios/ga4-soak.js` | **40 VU**, 1 h — endurance (`GA4_SOAK_DURATION=15m` for a quick drill) |

**Pass criteria (staging):** `page_load_ms` p95 &lt; 800 ms, `checkout_step_ms` p95 &lt; 1.5 s, `http_req_failed` &lt; 1%. Think time 3–5 s between steps (see `lib/mixed-journey.js`).

```bash
k6 run loadtest/scenarios/ga4-normal.js
GA4_PEAK_VUS=200 k6 run loadtest/scenarios/ga4-peak.js
k6 run loadtest/scenarios/ga4-spike.js
GA4_SOAK_DURATION=15m k6 run loadtest/scenarios/ga4-soak.js
```

```bash
k6 run loadtest/scenarios/browse.js
./loadtest/run-all.sh
```

While tests run, on the server watch `pm2 monit`, `pm2 logs`, swap (`free -h`), and grep `store-slow` / `listing-cache` / `event-detail-cache`.

## Thresholds

Defaults in each script (p95 page &lt; 1.5s, errors &lt; 1%). Tune after the first baseline and record results in `docs/DEPLOYMENT.md` § Load testing.
