import { describe, expect, it } from 'vitest'

import { resolveHubSpotFormId } from './resolve-hubspot-form-id'

describe('resolveHubSpotFormId', () => {
  it('prefers manual ID over list selection', () => {
    expect(
      resolveHubSpotFormId('baf56412-974b-48eb-aba4-f4c8f795fc75', 'other-id'),
    ).toBe('baf56412-974b-48eb-aba4-f4c8f795fc75')
  })

  it('falls back to list selection and trims whitespace', () => {
    expect(resolveHubSpotFormId('  ', 'selected-id')).toBe('selected-id')
    expect(resolveHubSpotFormId(undefined, ' selected-id ')).toBe('selected-id')
  })
})
