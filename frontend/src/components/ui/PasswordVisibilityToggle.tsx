'use client'

import { useState } from 'react'
import { defaultMessages } from '@/lib/i18n/messages'
import { cn } from '@/lib/utils'

export function usePasswordVisibility(type?: string) {
  const [visible, setVisible] = useState(false)
  const isPassword = type === 'password'
  return {
    isPassword,
    visible: isPassword && visible,
    resolvedType: isPassword ? (visible ? 'text' : 'password') : type,
    toggle: () => setVisible((v) => !v),
  }
}

interface PasswordVisibilityToggleProps {
  visible: boolean
  onToggle: () => void
  disabled?: boolean
  className?: string
}

export function PasswordVisibilityToggle({
  visible,
  onToggle,
  disabled,
  className,
}: PasswordVisibilityToggleProps) {
  const t = defaultMessages.common
  const label = visible ? t.hidePassword : t.showPassword

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-label={label}
      aria-pressed={visible}
      title={label}
      className={cn(
        'absolute right-2 top-1/2 -translate-y-1/2 p-1 text-va-gray hover:text-va-black transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-va-black rounded-sm',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
    >
      {visible ? <EyeOffIcon /> : <EyeIcon />}
    </button>
  )
}

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.75" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 3l18 18"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M9.9 5.2A9.4 9.4 0 0 1 12 5c6.5 0 10 7 10 7a16.7 16.7 0 0 1-3.2 4.2M6.1 6.6A16.4 16.4 0 0 0 2 12s3.5 7 10 7c1.5 0 2.9-.3 4.1-.9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.9 9.9A2.75 2.75 0 0 0 14.1 14"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}
