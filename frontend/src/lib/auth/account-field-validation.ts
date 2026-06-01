import { defaultMessages } from '@/lib/i18n'

export type FieldValidity = { state: 'idle' } | { state: 'valid' } | { state: 'invalid'; message: string }

export type AccountFieldName =
  | 'email'
  | 'password'
  | 'newPassword'
  | 'confirmPassword'
  | 'firstName'
  | 'lastName'
  | 'phone'
  | 'postalCode'
  | 'houseNumber'
  | 'street'
  | 'city'

/** Full validity map for checkout guest / account profile forms */
export type CheckoutGuestValidity = Record<AccountFieldName, FieldValidity>

/** Shared initial validity for checkout guest step and account profile forms */
export function initialCheckoutGuestValidity(): CheckoutGuestValidity {
  return {
    email: { state: 'idle' },
    password: { state: 'idle' },
    firstName: { state: 'idle' },
    lastName: { state: 'idle' },
    phone: { state: 'idle' },
    postalCode: { state: 'idle' },
    houseNumber: { state: 'idle' },
    street: { state: 'idle' },
    city: { state: 'idle' },
    newPassword: { state: 'idle' },
    confirmPassword: { state: 'idle' },
  }
}

export type ValidateAccountFieldOptions = {
  /** For confirmPassword: must match this value */
  password?: string
  /**
   * `password` field only: existing-user login checks non-empty; registration checks min length.
   * `newPassword` always uses registration rules.
   */
  passwordRequirement?: 'login' | 'register'
}

export function validateAccountField(
  name: AccountFieldName,
  value: string,
  extra?: ValidateAccountFieldOptions
): FieldValidity {
  const v = value.trim()
  const passReq = extra?.passwordRequirement ?? 'register'
  const msg = defaultMessages.auth.validation

  switch (name) {
    case 'email':
      if (!v) return { state: 'invalid', message: msg.emailRequired }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))
        return { state: 'invalid', message: msg.emailInvalid }
      return { state: 'valid' }
    case 'password':
      if (passReq === 'login') {
        if (!v) return { state: 'invalid', message: msg.passwordLoginRequired }
        return { state: 'valid' }
      }
      if (v.length < 8) return { state: 'invalid', message: msg.passwordMin }
      return { state: 'valid' }
    case 'newPassword':
      if (v.length < 8) return { state: 'invalid', message: msg.passwordMin }
      return { state: 'valid' }
    case 'confirmPassword':
      if (!v) return { state: 'invalid', message: msg.confirmRequired }
      if (v !== extra?.password) return { state: 'invalid', message: msg.passwordMismatch }
      return { state: 'valid' }
    case 'firstName':
      if (!v) return { state: 'invalid', message: msg.firstNameRequired }
      return { state: 'valid' }
    case 'lastName':
      if (!v) return { state: 'invalid', message: msg.lastNameRequired }
      return { state: 'valid' }
    case 'phone':
      if (!v) return { state: 'idle' }
      if (!/^[+0-9\s\-()]{6,}$/.test(v))
        return { state: 'invalid', message: msg.phoneInvalid }
      return { state: 'valid' }
    case 'postalCode':
      if (!v) return { state: 'invalid', message: msg.postalRequired }
      if (!/^[0-9]{4}\s?[a-zA-Z]{2}$/.test(v))
        return { state: 'invalid', message: msg.postalInvalid }
      return { state: 'valid' }
    case 'houseNumber':
      if (!v) return { state: 'invalid', message: msg.houseRequired }
      return { state: 'valid' }
    case 'street':
      if (!v) return { state: 'invalid', message: msg.streetRequired }
      return { state: 'valid' }
    case 'city':
      if (!v) return { state: 'invalid', message: msg.cityRequired }
      return { state: 'valid' }
  }
}
