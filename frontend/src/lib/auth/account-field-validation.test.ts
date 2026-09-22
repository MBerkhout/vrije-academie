import { describe, expect, it } from 'vitest'
import { validateAccountField } from './account-field-validation'

describe('validateAccountField phone', () => {
  it('treats empty as optional', () => {
    expect(validateAccountField('phone', '')).toEqual({ state: 'idle' })
    expect(validateAccountField('phone', '   ')).toEqual({ state: 'idle' })
  })

  it('accepts NL, international, and formatted numbers by digit count', () => {
    expect(validateAccountField('phone', '0612345678').state).toBe('valid')
    expect(validateAccountField('phone', '06-1234 5678').state).toBe('valid')
    expect(validateAccountField('phone', '+31 6 1234 5678').state).toBe('valid')
    expect(validateAccountField('phone', '(020) 123 45 67').state).toBe('valid')
  })

  it('rejects too few or too many digits', () => {
    expect(validateAccountField('phone', '0612345')).toMatchObject({ state: 'invalid' })
    expect(validateAccountField('phone', '1234567890123456')).toMatchObject({ state: 'invalid' })
  })

  it('rejects letters and other symbols', () => {
    expect(validateAccountField('phone', '06-abc45678')).toMatchObject({ state: 'invalid' })
  })
})
