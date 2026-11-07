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

```bash
k6 run loadtest/scenarios/browse.js
./loadtest/run-all.sh
```

While tests run, on the server watch `pm2 monit`, `pm2 logs`, swap (`free -h`), and grep `store-slow` / `listing-cache` / `event-detail-cache`.

## Thresholds

Defaults in each script (p95 page &lt; 1.5s, errors &lt; 1%). Tune after the first baseline and record results in `docs/DEPLOYMENT.md` § Load testing.
