import type { EventInstructor } from '@/lib/commerce/types'

const TITLE_PREFIX = /^(mevr\.?|dhr\.?|drs\.?|dr\.?|prof\.?|mr\.?|mrs\.?)\s+/i

export function normalizeInstructorName(name: string): string {
  return name.replace(TITLE_PREFIX, '').replace(/\s+/g, ' ').trim().toLowerCase()
}

/** Match a session instructor label to a full PDP profile (photo / bio). */
export function resolveSessionInstructor(
  sessionName: string | null | undefined,
  instructors: EventInstructor[],
  featured?: EventInstructor | null
): EventInstructor | null {
  const pool: EventInstructor[] = []
  const seen = new Set<string>()
  for (const item of [...instructors, featured ?? null]) {
    if (!item?.id || seen.has(item.id)) continue
    seen.add(item.id)
    pool.push(item)
  }

  const label = sessionName?.trim()
  if (!label) return pool[0] ?? null

  const needle = normalizeInstructorName(label)
  return (
    pool.find((item) => normalizeInstructorName(item.name) === needle) ??
    pool.find((item) => {
      const name = normalizeInstructorName(item.name)
      return name.includes(needle) || needle.includes(name)
    }) ??
    pool[0] ??
    null
  )
}
