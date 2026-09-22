---
title: VA Thuis Koop alle lessen adds to cart
task: SI-6
created: 2026-09-18T16:33
---

# VA Thuis Koop alle lessen adds to cart

## Goal

On VA Thuis PDPs, **Koop alle lessen** on locked episode rows should add the bundle product to the cart and navigate to `/winkelwagen`, matching the booking-panel CTA.

## Why

Locked rows currently only scroll to `#booking-panel`. Users expect the same purchase action as the sticky **Koop alle lessen** button.

## Approach

Pass `event` into `PdpEpisodesTable`. On buy-all, add `bundle_variant_id` via `addVariantToCart` and `router.push('/winkelwagen')`. Fall back to scrolling the booking panel if the bundle variant is missing.
