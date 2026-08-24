/** Salesforce group `External_Registration_URL__c` / child `External_Registration_URL_Product__c`. */
export function trimExternalRegistrationUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null
  const trimmed = raw.trim()
  return trimmed || null
}

export function externalRegistrationUrlFromMetadata(
  metadata: Record<string, unknown> | null | undefined
): string | null {
  return trimExternalRegistrationUrl(metadata?.salesforce_external_registration_url)
}

export function childExternalRegistrationUrlFromSalesforce(
  child: { External_Registration_URL_Product__c?: string | null } | null | undefined
): string | null {
  return trimExternalRegistrationUrl(child?.External_Registration_URL_Product__c)
}

/** Child URL when set; otherwise the product-group URL. */
export function resolveSessionExternalRegistrationUrl(
  childUrl: string | null | undefined,
  groupUrl: string | null | undefined
): string | null {
  return trimExternalRegistrationUrl(childUrl) ?? trimExternalRegistrationUrl(groupUrl)
}

/**
 * Product-level URL for listing / Sanity / booking-panel fallback.
 * Prefers the product-group URL; otherwise the first child
 * `External_Registration_URL_Product__c`.
 */
export function resolveExternalRegistrationUrl(
  group: { External_Registration_URL__c?: string | null } | null | undefined,
  children:
    | Array<{ External_Registration_URL_Product__c?: string | null }>
    | null
    | undefined
): string | null {
  return (
    trimExternalRegistrationUrl(group?.External_Registration_URL__c) ??
    (children ?? [])
      .map((child) => childExternalRegistrationUrlFromSalesforce(child))
      .find((url): url is string => Boolean(url)) ??
    null
  )
}

export function variantExternalRegistrationMetadata(
  child: { External_Registration_URL_Product__c?: string | null },
  existing?: Record<string, unknown> | null
): Record<string, unknown> {
  return {
    ...(existing ?? {}),
    salesforce_external_registration_url: childExternalRegistrationUrlFromSalesforce(child),
  }
}

/** Group URL, else the first variant/child URL (listing / Sanity mirror). */
export function resolveProductExternalRegistrationUrl(
  productMetadata: Record<string, unknown> | null | undefined,
  variantMetadatas: Array<Record<string, unknown> | null | undefined> | null | undefined
): string | null {
  return (
    externalRegistrationUrlFromMetadata(productMetadata) ??
    (variantMetadatas ?? [])
      .map((metadata) => externalRegistrationUrlFromMetadata(metadata))
      .find((url): url is string => Boolean(url)) ??
    null
  )
}
