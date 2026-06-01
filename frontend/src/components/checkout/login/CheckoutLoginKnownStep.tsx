'use client'

import type { GeneralSettings } from '@/lib/cms/types'
import { ValidatedInput } from '@/components/auth/ValidatedInput'
import { EmailRow } from './EmailRow'
import type { FieldValidity } from '@/lib/auth/account-field-validation'

type CheckoutSettings = NonNullable<GeneralSettings['checkout']>

interface CheckoutLoginKnownStepProps {
  settings: CheckoutSettings
  knownHeading: string
  email: string
  password: string
  onPasswordChange: (v: string) => void
  onBlurPassword: () => void
  passwordValidity: FieldValidity
  error: string | null
  busy: boolean
  onSubmit: (e: React.FormEvent) => void
  onEditEmail: () => void
  onBackToEmail: () => void
  onGuestContinue: () => void
  showToast: (msg: string) => void
}

export function CheckoutLoginKnownStep({
  settings,
  knownHeading,
  email,
  password,
  onPasswordChange,
  onBlurPassword,
  passwordValidity,
  error,
  busy,
  onSubmit,
  onEditEmail,
  onBackToEmail,
  onGuestContinue,
  showToast,
}: CheckoutLoginKnownStepProps) {
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <h1 className="font-sans text-xl font-bold text-va-black">{knownHeading}</h1>
      <EmailRow email={email} onEdit={onEditEmail} />
      <ValidatedInput
        id="checkout-password"
        name="password"
        label={settings.knownEmail?.passwordLabel ?? 'Wachtwoord'}
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={onPasswordChange}
        onBlur={onBlurPassword}
        validity={passwordValidity}
        disabled={busy}
      />
      {error && <p className="font-sans text-xs text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="w-full bg-va-yellow text-va-black font-sans font-semibold text-sm px-6 py-3 hover:bg-va-yellow/90 transition-colors disabled:opacity-60"
      >
        {busy ? '…' : (settings.knownEmail?.loginLabel ?? 'Inloggen')}
      </button>
      <div className="flex flex-wrap gap-x-6 gap-y-1 font-sans text-xs">
        <button
          type="button"
          onClick={() => showToast('Eenmalig wachtwoord versturen is binnenkort beschikbaar.')}
          className="text-va-darkgray hover:text-va-black underline underline-offset-2 transition-colors"
        >
          {settings.knownEmail?.otpLabel ?? 'Eenmalig wachtwoord sturen'}
        </button>
        <a
          href="/login?forgot=1"
          className="text-va-darkgray hover:text-va-black underline underline-offset-2 transition-colors"
        >
          {settings.knownEmail?.forgotPasswordLabel ?? 'Wachtwoord vergeten?'}
        </a>
        {settings.guestCheckoutEnabled !== false && (
          <button
            type="button"
            onClick={onGuestContinue}
            className="text-va-darkgray hover:text-va-black underline underline-offset-2 transition-colors"
          >
            {settings.knownEmail?.guestContinueLabel ?? 'Doorgaan als gast'}
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={onBackToEmail}
        className="font-sans text-xs text-va-darkgray hover:text-va-black underline underline-offset-2 transition-colors"
      >
        {settings.knownEmail?.backLabel ?? 'Terug'}
      </button>
    </form>
  )
}
