import type { EventInstructor } from '@/lib/commerce/types'

const TITLE_PREFIX = /^(mevr\.?|dhr\.?|drs\.?|dr\.?|prof\.?|mr\.?|mrs\.?)\s+/i

export function normalizeInstructorName(name: string): string {
  return name.replace(TITLE_PREFIX, '').replace(/\s+/g, ' ').trim().toLowerCase()
}

/** Match a session instructor label to a full PDP profile (photo / bio). */
export function resolveSessionInstructor(
  sessionName: string | null | undefined,
  instructors: EventInstructor[]
): EventInstructor | null {
  const label = sessionName?.trim()
  if (!label) return null

  const needle = normalizeInstructorName(label)
  return (
    instructors.find((item) => normalizeInstructorName(item.name) === needle) ??
    instructors.find((item) => {
      const name = normalizeInstructorName(item.name)
      return name.includes(needle) || needle.includes(name)
    }) ??
    null
  )
}