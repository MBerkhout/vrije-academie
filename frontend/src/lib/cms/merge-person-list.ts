import type { Person } from '@/lib/cms/types'

/** Medusa-synced Sanity `docent` row (subset from GROQ). */
export type SyncedDocent = {
  _id: string
  name: string
  role?: string
  bio?: string
  slug?: string
  photoUrl?: string
}

export function normalizePersonListName(name: string): string {
  return name.trim().toLocaleLowerCase('nl-NL').replace(/\s+/g, ' ')
}

/**
 * Merge mirrored docenten with editorial persons. Same name → person wins (photo, bio, profile URL).
 * Result is sorted A–Z (Dutch locale).
 */
export function mergePersonAndSyncedDocenten(
  persons: Person[],
  synced: SyncedDocent[],
): Person[] {
  const map = new Map<string, Person>()

  for (const d of synced) {
    const name = d.name?.trim()
    if (!name) continue
    const key = normalizePersonListName(name)
    if (map.has(key)) continue
    map.set(key, {
      _id: d._id,
      name,
      personType: 'docent',
      role: d.role,
      bio: d.bio,
      slug: d.slug,
      photoUrl: d.photoUrl,
    })
  }

  for (const p of persons) {
    const name = p.name?.trim()
    if (!name) continue
    const key = normalizePersonListName(name)
    const prev = map.get(key)
    map.set(key, prev ? { ...prev, ...p, _id: p._id } : p)
  }

  return Array.from(map.values()).sort((a, b) =>
    a.name.localeCompare(b.name, 'nl-NL', { sensitivity: 'base' }),
  )
}
