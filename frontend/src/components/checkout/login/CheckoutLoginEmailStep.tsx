'use client'

import type { GeneralSettings } from '@/lib/cms/types'
import { ValidatedInput } from '@/components/auth/ValidatedInput'
import type { FieldValidity } from '@/lib/auth/account-field-validation'

type CheckoutSettings = NonNullable<GeneralSettings['checkout']>

interface CheckoutLoginEmailStepProps {
  settings: CheckoutSettings
  heading: string
  email: string
  onEmailChange: (v: string) => void
  validity: FieldValidity
  validateOnBlur: (value: string) => void
  error: string | null
  busy: boolean
  onSubmit: (e: React.FormEvent) => void
}

export function CheckoutLoginEmailStep({
  settings,
  heading,
  email,
  onEmailChange,
  validity,
  validateOnBlur,
  error,
  busy,
  onSubmit,
}: CheckoutLoginEmailStepProps) {
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <h1 className="font-sans text-xl font-bold text-va-black">{heading}</h1>
      {settings.emailStep?.intro && (
        <p className="font-sans text-sm text-va-darkgray">{settings.emailStep.intro}</p>
      )}
      <ValidatedInput
        id="checkout-email"
        name="email"
        label="E-mailadres"
        type="email"
        autoComplete="email"
        value={email}
        onChange={onEmailChange}
        onBlur={() => validateOnBlur(email)}
        validity={validity}
        disabled={busy}
      />
      {error && <p className="font-sans text-xs text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-lg bg-va-yellow text-va-black font-sans font-semibold text-sm px-6 py-3 hover:bg-va-yellow/90 transition-colors disabled:opacity-60"
      >
        {busy ? '…' : (settings.emailStep?.nextLabel ?? 'Volgende')}
      </button>
    </form>
  )
}
