import { describe, it, expect } from 'vitest'
import { cleanInvisiblePath } from '../clean-invisible-path'

describe('cleanInvisiblePath', () => {
  it('returns the clean path for encoded zero-width characters', () => {
    expect(
      cleanInvisiblePath('/ons-aanbod/colleges-architectuur-in-40-gebouwen%E2%80%8B%E2%80%8C%EF%BB%BF%E2%80%8D'),
    ).toBe('/ons-aanbod/colleges-architectuur-in-40-gebouwen')
  })

  it('returns null for clean paths', () => {
    expect(cleanInvisiblePath('/ons-aanbod/workshop')).toBeNull()
    expect(cleanInvisiblePath('/ons-aanbod/fine%20art')).toBeNull()
  })

  it('returns null for malformed encoding', () => {
    expect(cleanInvisiblePath('/%E0%A4%A')).toBeNull()
  })
})
