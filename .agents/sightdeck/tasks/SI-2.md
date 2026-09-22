---
title: Why reis Andalusië card shows online icon
task: SI-2
created: 2026-09-18T16:27
---

# Why reis Andalusië card shows online icon

Staging PDP: https://v2.vrijeacademie.nl/ons-aanbod/reis-andalusi-mix-van-cultuur-en-religie

## Question

The Reis Andalusië product card also shows an online (camera) icon. Why?

## Memory

- PLP cards use `plpEventDeliveryTypeDisplay()` → `'both'` when `delivery_types` includes both `offline` and `online`.
- Salesforce import maps empty `Product_City__c` to `delivery_type: "online"` (`inferDeliveryType`).
- Travel products often have city "Spanje" or a missing city rather than a Dutch city.
- PDP `GET /store/events/:handle` filters to future sessions; listing `GET /store/events` keeps past variants and aggregates `delivery_types` from all of them.
- Cities on listing are already computed from future offline sessions only.

## Resolution / Ergebnis

The Reis Andalusië **listing card** shows pin + camera because listing `delivery_types` is `['offline', 'online']`.

Cause: a **past** child session (`sf-a04Mz000001kgwZIAQ`, 2024-03-03) has no city, so import classified it as `online`. Listing includes that past variant in `delivery_types`. PDP strips past sessions, so the product page only shows Spanje / offline.

Other reizen on staging only have offline sessions, so they show the pin only.

Login was not required; the listing is public.
