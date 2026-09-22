/** Salesforce/Medusa delivery type for on-demand VA Thuis bundles. */
export const VATHUIS_DELIVERY_TYPE = 'pre_recorded'

export const PLP_DELIVERY_OPTIONS = [
  { value: 'online', label: 'Online' },
  { value: 'offline', label: 'Op locatie' },
  { value: VATHUIS_DELIVERY_TYPE, label: 'VAthuis' },
] as const

export function isVathuisDeliveryType(value: string): boolean {
  return value === VATHUIS_DELIVERY_TYPE
}

/** Agenda has no on-demand rows; VAthuis belongs on Ons aanbod only. */
export function listingDeliveryOptions(includeVathuis = true) {
  if (includeVathuis) return [...PLP_DELIVERY_OPTIONS]
  return PLP_DELIVERY_OPTIONS.filter((opt) => !isVathuisDeliveryType(opt.value))
}

export function excludeVathuisDeliveryTypes(deliveryTypes?: string[] | null): string[] {
  return (deliveryTypes ?? []).filter((value) => !isVathuisDeliveryType(value))
}

export function deliveryTypeLabel(value: string): string {
  if (value === 'online') return 'Online'
  if (value === 'offline') return 'Op locatie'
  if (isVathuisDeliveryType(value)) return 'VAthuis'
  return value
}

export function hasVathuisDeliveryFilter(deliveryTypes?: string[] | null): boolean {
  return (deliveryTypes ?? []).some(isVathuisDeliveryType)
}
