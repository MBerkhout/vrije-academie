import { describe, expect, it } from 'vitest'
import { mergePersonAndSyncedDocenten } from './merge-person-list'

describe('mergePersonAndSyncedDocenten', () => {
  it('merges synced docents and sorts by name', () => {
    const merged = mergePersonAndSyncedDocenten(
      [],
      [
        { _id: 'd2', name: 'Zara', slug: 'zara' },
        { _id: 'd1', name: 'Anna', slug: 'anna' },
      ],
    )
    expect(merged.map((p) => p.name)).toEqual(['Anna', 'Zara'])
    expect(merged[0].slug).toBe('anna')
  })

  it('prefers editorial person over synced docent with the same name', () => {
    const merged = mergePersonAndSyncedDocenten(
      [{ _id: 'p1', name: 'Mirjam Deckers', role: 'Curator CMS', bio: 'From Studio' }],
      [{ _id: 'd1', name: 'Mirjam Deckers', role: 'SF role', slug: 'mirjam-deckers' }],
    )
    expect(merged).toHaveLength(1)
    expect(merged[0].role).toBe('Curator CMS')
    expect(merged[0].bio).toBe('From Studio')
    expect(merged[0]._id).toBe('p1')
    expect(merged[0].slug).toBe('mirjam-deckers')
  })
})
