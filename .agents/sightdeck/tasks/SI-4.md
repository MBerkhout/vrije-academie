---
title: Rename Pre-recorded to VAthuis in Ons aanbod filters
task: SI-4
created: 2026-09-18T16:29
---

# Rename Pre-recorded to VAthuis in Ons aanbod filters

## Goal

On Ons aanbod and Agenda, the **Beschikbaarheid** option **Pre-recorded** should read **VAthuis**. Clicking it should open the VA Thuis catalog (`/va-thuis/ons-aanbod`) with category and docent filters, not filter the general listing for `delivery_type=pre_recorded`.

## Why

VA Thuis products are excluded from Ons aanbod and Agenda. The current Pre-recorded filter cannot show them.

## Approach

- Relabel `pre_recorded` → **VAthuis**.
- Always show the option (do not hide it when the Ons aanbod facet count is 0).
- Clicking navigates to `VATHUIS_CATALOG_PATH`.
- Redirect leftover `?delivery_type=pre_recorded` URLs on Ons aanbod and Agenda to the same catalog.
