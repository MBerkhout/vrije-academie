import { validateAccountField, type FieldValidity } from '@/lib/auth/account-field-validation'
import { defaultMessages, interpolate } from '@/lib/i18n'

export type GiftCardFieldName = 'recipientName' | 'recipientEmail' | 'senderName' | 'message'

export type GiftCardFormValidity = Record<GiftCardFieldName, FieldValidity> & {
  customAmount: FieldValidity
}

export function initialGiftCardFormValidity(): GiftCardFormValidity {
  return {
    recipientName: { state: 'idle' },
    recipientEmail: { state: 'idle' },
    senderName: { state: 'idle' },
    message: { state: 'idle' },
    customAmount: { state: 'idle' },
  }
}

export function validateGiftCardField(name: GiftCardFieldName, value: string): FieldValidity {
  const msg = defaultMessages.auth.validation
  switch (name) {
    case 'recipientName':
      if (!value.trim())
        return { state: 'invalid', message: msg.giftCardRecipientNameRequired }
      return { state: 'valid' }
    case 'recipientEmail':
      return validateAccountField('email', value)
    case 'senderName':
    case 'message':
      if (!value.trim()) return { state: 'idle' }
      return { state: 'valid' }
  }
}

/** Validates the optional custom euro field only (tiles-only flow keeps this `idle`). */
export function validateGiftCardCustomAmount(
  customEuro: string,
  minEuro: number,
  maxEuro: number,
): FieldValidity {
  const msg = defaultMessages.auth.validation
  const t = customEuro.trim()
  if (!t) return { state: 'idle' }
  const n = parseInt(customEuro, 10)
  if (!Number.isFinite(n) || n < minEuro || n > maxEuro) {
    return {
      state: 'invalid',
      message: interpolate(msg.giftCardAmountInvalid, { min: minEuro, max: maxEuro }),
    }
  }
  return { state: 'valid' }
}

export function giftCardEffectiveEuro(
  customEuro: string,
  selectedEuro: number | null,
): number | null {
  if (customEuro.trim() !== '') {
    const n = parseInt(customEuro, 10)
    return Number.isFinite(n) ? n : null
  }
  return selectedEuro
}
