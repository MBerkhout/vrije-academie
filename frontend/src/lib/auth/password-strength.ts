/**
 * Simple length-based password strength (aligned across checkout + account signup).
 * 0 = empty, 1 = weak, 2 = medium, 3 = strong.
 */
export type PasswordStrengthLevel = 0 | 1 | 2 | 3

export function passwordStrengthLevel(password: string): PasswordStrengthLevel {
  if (password.length === 0) return 0
  if (password.length < 8) return 1
  if (password.length < 12) return 2
  return 3
}

/** Tailwind background class for filled strength segments at this level */
export function passwordStrengthBarClass(level: PasswordStrengthLevel): string {
  switch (level) {
    case 1:
      return 'bg-red-500'
    case 2:
      return 'bg-yellow-500'
    case 3:
      return 'bg-green-500'
    default:
      return 'bg-va-lightgray-300'
  }
}

import { defaultMessages } from '@/lib/i18n'

/** UI labels for password strength segments (defaults from `locales/nl.json`). */
export function passwordStrengthLabels(): Record<PasswordStrengthLevel, string> {
  const s = defaultMessages.auth.passwordStrength
  return { 0: s.empty, 1: s.weak, 2: s.medium, 3: s.strong }
}
