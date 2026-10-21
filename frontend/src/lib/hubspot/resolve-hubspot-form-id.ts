/** Manual form-ID overrides the form-toolkit list selection. */
export function resolveHubSpotFormId(
  manualId: string | undefined,
  selectedId: string | undefined,
): string | undefined {
  const trimmed = manualId?.trim()
  if (trimmed) return trimmed
  const selected = selectedId?.trim()
  return selected || undefined
}
