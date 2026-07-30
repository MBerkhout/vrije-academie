/** Stable JSON serialization for shallow metadata / object comparison. */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value)
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`
  }
  const obj = value as Record<string, unknown>
  const keys = Object.keys(obj).sort()
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(",")}}`
}

export function deepEqual(a: unknown, b: unknown): boolean {
  return stableStringify(a) === stableStringify(b)
}

export function sameDate(a: Date | string | null | undefined, b: Date | string | null | undefined): boolean {
  if (a == null && b == null) return true
  if (a == null || b == null) return false
  const ta = a instanceof Date ? a.getTime() : new Date(a).getTime()
  const tb = b instanceof Date ? b.getTime() : new Date(b).getTime()
  return ta === tb
}
