export type WorkflowErrorItem = {
  error?: unknown
}

/**
 * First error from a Medusa workflow `.run({ throwOnError: false })` result.
 */
export function firstWorkflowError(
  thrownError?: Error | null,
  errors?: WorkflowErrorItem[] | null
): Error | null {
  if (thrownError) return thrownError
  const first = errors?.[0]?.error
  if (first == null) return null
  return first instanceof Error ? first : new Error(String(first))
}
