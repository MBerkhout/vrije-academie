/**
 * Domain vocabulary:
 * - Product Group (business) ↔ Medusa `Product`
 * - Product (business) ↔ Medusa `ProductVariant`
 *
 * Extend `RECORD_TYPES` / `RecordType` when Salesforce introduces a new *coarse*
 * group kind (catalog gating). Fine-grained Salesforce names (Wandeling, Reis, …)
 * stay on Medusa `product.type` and map through `mapSalesforceRecordType()`.
 */
export const RECORD_TYPES = [
  "collegereeks",
  "lezing",
  "excursie",
  "studiedag",
  "vathuis",
] as const

export type RecordType = (typeof RECORD_TYPES)[number]

export const DELIVERY_TYPES = ["online", "offline", "pre_recorded"] as const

export type DeliveryType = (typeof DELIVERY_TYPES)[number]
