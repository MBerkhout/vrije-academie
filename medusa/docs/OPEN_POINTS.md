# Open points & future work

## Custom `events` module

**Status**: Implemented. Product Groups and purchasable instances use the `events` module (`EventGroup`, `EventItem`, `Property`) with module links to Medusa `Product` / `ProductVariant`.

**Extending `record_type`**: add a value to `RECORD_TYPES` in `src/modules/events/types.ts` and run `npx medusa db:generate events` + `npx medusa db:migrate` after model updates.

## Cart quantity & promotions

Default Medusa behaviour: line items may have quantity &gt; 1; promotion module is unchanged. Do not add cart/line-item/promotion workflow hooks for events without an explicit product decision.

## Recurring events

**Question**: Recurring series (e.g. weekly lectures)?

**Options**: Multiple Product Groups / variants per occurrence; or richer scheduling in a future module.

**Recommendation**: Prefer multiple concrete variants/instances until scheduling requirements grow.

## Capacity vs `available_quantity`

Capacity is per **variant** (`EventItem.available_quantity`). Optional later: validation that sums or business rules align across variants.

## Sanity

**Phase 2**: Sanity `event` (or page) content may reference Medusa product IDs.

**Split**: Medusa — pricing, checkout, `available_quantity`; Sanity — rich content.

## Salesforce

**Status**: Medusa ↔ Salesforce sync is implemented (`salesforceSync` module, workflows, admin routes/widgets, `/hooks/salesforce`). See [SALESFORCE_SYNC.md](./SALESFORCE_SYNC.md).

**Still out of scope**: Salesforce-driven **property import** on catalog entities (use custom mapping/API if needed later).

## Waitlist & reminders

Future: waitlist when sold out, email/calendar reminders, analytics — see historical notes in git if needed.

## Multi-language

Future: translations via CMS or Medusa localization when required.
