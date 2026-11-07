/** Stape Data Client expects `event_name` instead of `event`. */
export function toStapeDataClientBody(
  payload: Record<string, unknown> & { event: string }
): Record<string, unknown> {
  const { event, ...rest } = payload
  return {
    event_name: event,
    ...rest,
  }
}
