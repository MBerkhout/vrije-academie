'use client'

import clsx from 'clsx'
import {
  passwordStrengthBarClass,
  passwordStrengthLevel,
  passwordStrengthLabels,
} from '@/lib/auth/password-strength'

interface PasswordStrengthMeterProps {
  password: string
  /** Override segment count (default 3) */
  segments?: number
  className?: string
}

export function PasswordStrengthMeter({ password, segments = 3, className }: PasswordStrengthMeterProps) {
  const level = passwordStrengthLevel(password)
  if (!password) return null

  const barClass = passwordStrengthBarClass(level)
  const inactiveClass = 'bg-va-lightgray-300'
  const strengthLabels = passwordStrengthLabels()

  return (
    <div className={clsx('mt-1', className)}>
      <div className="flex gap-1">
        {Array.from({ length: segments }, (_, i) => (
          <div
            key={i}
            className={clsx('h-1 flex-1 rounded', i < level ? barClass : inactiveClass)}
          />
        ))}
      </div>
      <p className="font-sans text-xs text-va-darkgray mt-0.5">{strengthLabels[level]}</p>
    </div>
  )
}
