'use client'

import { ValidatedInput } from '@/components/auth/ValidatedInput'
import type { FieldValidity } from '@/lib/auth/account-field-validation'

interface OtpCodeInputProps {
  id?: string
  label: string
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  validity?: FieldValidity
  disabled?: boolean
  resendLabel?: string
  onResend?: () => void
  resendDisabled?: boolean
  resendCooldownSeconds?: number
}

export function OtpCodeInput({
  id = 'otp-code',
  label,
  value,
  onChange,
  onBlur,
  validity = { state: 'idle' },
  disabled = false,
  resendLabel = 'Code opnieuw sturen',
  onResend,
  resendDisabled = false,
  resendCooldownSeconds,
}: OtpCodeInputProps) {
  return (
    <div className="space-y-2">
      <ValidatedInput
        id={id}
        name="otp"
        label={label}
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        value={value}
        onChange={(v) => onChange(v.replace(/\D/g, '').slice(0, 6))}
        onBlur={onBlur ?? (() => {})}
        validity={validity}
        disabled={disabled}
      />
      {onResend && (
        <button
          type="button"
          onClick={onResend}
          disabled={disabled || resendDisabled}
          className="font-sans text-xs text-va-darkgray hover:text-va-black underline underline-offset-2 transition-colors disabled:opacity-60"
        >
          {resendCooldownSeconds && resendCooldownSeconds > 0
            ? `${resendLabel} (${resendCooldownSeconds}s)`
            : resendLabel}
        </button>
      )}
    </div>
  )
}
