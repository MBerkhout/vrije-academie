import { describe, expect, it } from 'vitest'
import { instructorBioText } from './instructor-bio'

describe('instructorBioText', () => {
  it('decodes Salesforce apostrophe entities', () => {
    expect(
      instructorBioText(
        'Ook kent Krzysztof Museum Catharijneconvent en het Rijksmuseum op z&#39;n duimpje.'
      )
    ).toBe('Ook kent Krzysztof Museum Catharijneconvent en het Rijksmuseum op z\'n duimpje.')
  })

  it('returns null for blank bios', () => {
    expect(instructorBioText('   ')).toBeNull()
    expect(instructorBioText(null)).toBeNull()
  })
})
