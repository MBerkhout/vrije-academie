---
title: Why Koers van de kunst card price is lower
task: SI-9
created: 2026-09-18T16:35
---

# Why Koers van de kunst card price is lower

Staging: https://v2.vrijeacademie.nl/ons-aanbod/colleges-koers-van-de-kunst

## Question

Why is the PLP card price lower than the PDP (€345)? Is it because of a past date?

## Resolution / Ergebnis

Yes. Listing `price_from` is the minimum over **all** variants, including past ones.

- PDP: future sessions only, all **€345** → `price_from` 34500
- Listing: 26 variants. Past 2015 Groningen/Amsterdam sessions are **€229** → `price_from` 22900

Same listing-aggregation issue as SI-2 / SI-5 (past sessions still drive product-level fields).
