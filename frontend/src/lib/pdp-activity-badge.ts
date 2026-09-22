import { productTypeLabelFromSlug, productTypeToSlug } from '@/lib/plp-product-types'
import { plpProductTypeHref, plpRecordTypeHref } from '@/lib/routes'

/** Extra PDP chip: Soort activiteit landing, else coarse EventGroup record type. */
export function pdpActivityTypeBadge(input: {
  productType?: string | null
  recordType?: string | null
}): { label: string; href: string | null } | null {
  const productSlug = productTypeToSlug(input.productType)
  if (productSlug) {
    return {
      label: productTypeLabelFromSlug(productSlug),
      href: plpProductTypeHref(productSlug),
    }
  }

  const recordType = input.recordType?.trim()
  if (!recordType) return null
  return {
    label: recordType,
    href: plpRecordTypeHref(recordType),
  }
}
