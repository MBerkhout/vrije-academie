/** Salesforce `External_Registration_URL__c` mirrored on Medusa product metadata. */
export function externalRegistrationUrlFromMetadata(
  metadata: Record<string, unknown> | null | undefined
): string | null {
  const raw =
    typeof metadata?.salesforce_external_registration_url === "string"
      ? metadata.salesforce_external_registration_url
      : null
  const trimmed = raw?.trim()
  return trimmed || null
}
