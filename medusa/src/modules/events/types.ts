/**
 * Domain vocabulary:
 * - Product Group (business) ↔ Medusa `Product`
 * - Product (business) ↔ Medusa `ProductVariant`
 *
 * Extend `RECORD_TYPES` / `RecordType` when Salesforce introduces new group kinds.
 */
export const RECORD_TYPES = [
  "collegereeks",
  "lezing",
  "excursie",
  "studiedag",
] as const

export type RecordType = (typeof RECORD_TYPES)[number]

export const DELIVERY_TYPES = ["online", "offline", "pre_recorded"] as const

export type DeliveryType = (typeof DELIVERY_TYPES)[number]
