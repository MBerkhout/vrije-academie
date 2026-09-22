---
title: Why lezing Rui Chafes has Online filter
task: SI-5
created: 2026-09-18T16:33
---

# Why lezing Rui Chafes has Online filter

Staging PDP: https://v2.vrijeacademie.nl/ons-aanbod/lezing-rui-chafes-x-alberto-giacometti

## Question

Why does this lezing have an Online filter (listing facet / hybrid card), while the PDP only shows a Den Haag on-site session?

## Resolution / Ergebnis

Same listing-aggregation issue as SI-2, with a real linked-online session that is already in the past.

Salesforce `Linked_Online_Productgroup__c` is set (`has_linked_online_sessions: true`). Listing still includes:

- `sf-a04Mz00000daw75IAA` offline Den Haag **2026-09-07** (past)
- `sf-a04Mz00000dbCa2IAE` offline Den Haag **2026-09-21** (future)
- `sf-a04Mz00000dbMhSIAU` `ONLINE - Lezing Rui Chafes x Alberto Giacometti` online **2026-09-09** (past)

Listing `delivery_types` is therefore `['offline', 'online']`, so the product matches `delivery_type[]=online` and counts toward the Online facet.

PDP `GET /store/events/:handle` drops past sessions, so only the 21 Sep Den Haag session remains and the Online/Fysiek session filter is hidden.
