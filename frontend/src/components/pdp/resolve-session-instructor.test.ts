import { describe, expect, it } from 'vitest'
import type { EventInstructor } from '@/lib/commerce/types'
import {
  normalizeInstructorName,
  resolveSessionInstructor,
} from './resolve-session-instructor'

const birgitte: EventInstructor = {
  id: '1',
  slug: 'birgitte',
  name: 'Birgitte Mommers',
  bio: 'Kunsthistorica',
}

const isolde: EventInstructor = {
  id: '2',
  slug: 'isolde',
  name: 'Isolde Scholberg',
}

describe('normalizeInstructorName', () => {
  it('strips salutation prefixes', () => {
    expect(normalizeInstructorName('mevr. Birgitte Mommers')).toBe('birgitte mommers')
    expect(normalizeInstructorName('dhr. Edward Tuuk')).toBe('edward tuuk')
    expect(normalizeInstructorName('Drs. Birgitte Mommers')).toBe('birgitte mommers')
  })
})

describe('resolveSessionInstructor', () => {
  it('matches session labels that include a salutation', () => {
    expect(
      resolveSessionInstructor('mevr. Birgitte Mommers', [isolde, birgitte])?.id
    ).toBe('1')
  })

  it('returns null when the session has no instructor name', () => {
    expect(resolveSessionInstructor(null, [isolde])).toBeNull()
    expect(resolveSessionInstructor('   ', [isolde])).toBeNull()
  })
})