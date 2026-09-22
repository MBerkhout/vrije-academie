export type WorkflowErrorItem = {
  error?: unknown
}

/** Shape of `.run({ throwOnError: false })`. `thrownError` exists at runtime on some engines. */
export type WorkflowRunFailureSource = {
  thrownError?: Error | null
  errors?: WorkflowErrorItem[] | null
}

/**
 * First error from a Medusa workflow `.run({ throwOnError: false })` result.
 */
export function firstWorkflowError(ret: WorkflowRunFailureSource | null | undefined): Error | null {
  if (ret?.thrownError) return ret.thrownError
  const first = ret?.errors?.[0]?.error
  if (first == null) return null
  return first instanceof Error ? first : new Error(String(first))
}
