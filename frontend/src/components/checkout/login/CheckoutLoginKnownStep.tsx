'use client'

import type { GeneralSettings } from '@/lib/cms/types'
import { OtpCodeInput } from '@/components/auth/OtpCodeInput'
import { ValidatedInput } from '@/components/auth/ValidatedInput'
import { EmailRow } from './EmailRow'
import type { FieldValidity } from '@/lib/auth/account-field-validation'

type CheckoutSettings = NonNullable<GeneralSettings['checkout']>
type AuthMode = 'password' | 'otp'

interface CheckoutLoginKnownStepProps {
  settings: CheckoutSettings
  knownHeading: string
  email: string
  hasPassword: boolean
  authMode: AuthMode
  password: string
  otpCode: string
  otpSent: boolean
  otpResendCooldown: number
  onPasswordChange: (v: string) => void
  onOtpCodeChange: (v: string) => void
  onBlurPassword: () => void
  onBlurOtp: () => void
  passwordValidity: FieldValidity
  otpValidity: FieldValidity
  error: string | null
  busy: boolean
  onSubmit: (e: React.FormEvent) => void
  onEditEmail: () => void
  onBackToEmail: () => void
  onSendOtp: () => void
  onResendOtp: () => void
  onSwitchToPassword?: () => void
}

export function CheckoutLoginKnownStep({
  settings,
  knownHeading,
  email,
  hasPassword,
  authMode,
  password,
  otpCode,
  otpSent,
  otpResendCooldown,
  onPasswordChange,
  onOtpCodeChange,
  onBlurPassword,
  onBlurOtp,
  passwordValidity,
  otpValidity,
  error,
  busy,
  onSubmit,
  onEditEmail,
  onBackToEmail,
  onSendOtp,
  onResendOtp,
  onSwitchToPassword,
}: CheckoutLoginKnownStepProps) {
  const showPassword = hasPassword && authMode === 'password'
  const showOtp = authMode === 'otp'

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <h1 className="font-sans text-xl font-bold text-va-black">{knownHeading}</h1>
      <EmailRow email={email} onEdit={onEditEmail} />

      {showOtp && otpSent && (
        <p className="font-sans text-sm text-va-darkgray" role="status">
          {settings.knownEmail?.otpSentLabel ??
            'Er is een eenmalig wachtwoord verstuurd naar je e-mailadres.'}
        </p>
      )}

      {showPassword && (
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
      )}

      {showOtp && (
        <OtpCodeInput
          id="checkout-otp"
          label={settings.knownEmail?.otpCodeLabel ?? 'Verificatiecode'}
          value={otpCode}
          onChange={onOtpCodeChange}
          onBlur={onBlurOtp}
          validity={otpValidity}
          disabled={busy}
          resendLabel={settings.knownEmail?.otpResendLabel ?? 'Code opnieuw sturen'}
          onResend={onResendOtp}
          resendDisabled={busy || otpResendCooldown > 0}
          resendCooldownSeconds={otpResendCooldown}
        />
      )}

      {error && <p className="font-sans text-xs text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={busy}
        className="w-full bg-va-yellow text-va-black font-sans font-semibold text-sm px-6 py-3 hover:bg-va-yellow/90 transition-colors disabled:opacity-60"
      >
        {busy
          ? '…'
          : showOtp
            ? (settings.knownEmail?.otpVerifyLabel ?? 'Bevestigen')
            : (settings.knownEmail?.loginLabel ?? 'Inloggen')}
      </button>

      <div className="flex flex-wrap gap-x-6 gap-y-1 font-sans text-xs">
        {hasPassword && authMode === 'password' && (
          <button
            type="button"
            onClick={onSendOtp}
            disabled={busy}
            className="text-va-darkgray hover:text-va-black underline underline-offset-2 transition-colors disabled:opacity-60"
          >
            {settings.knownEmail?.otpLabel ?? 'Eenmalig wachtwoord sturen'}
          </button>
        )}
        {hasPassword && authMode === 'otp' && onSwitchToPassword && (
          <button
            type="button"
            onClick={onSwitchToPassword}
            disabled={busy}
            className="text-va-darkgray hover:text-va-black underline underline-offset-2 transition-colors disabled:opacity-60"
          >
            {settings.knownEmail?.passwordLabel ?? 'Wachtwoord'} gebruiken
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
