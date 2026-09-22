'use client'

import { useId } from 'react'
import { cn } from '@/lib/utils'
import {
  PasswordVisibilityToggle,
  usePasswordVisibility,
} from '@/components/ui/PasswordVisibilityToggle'

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'className'> {
  label?: string
  error?: string
  className?: string
}

export function Input({
  label,
  error,
  className,
  id: idProp,
  type,
  disabled,
  ...inputProps
}: InputProps) {
  const generatedId = useId()
  const id = idProp ?? generatedId
  const { isPassword, visible, resolvedType, toggle } = usePasswordVisibility(type)

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={id}
          className={cn(
            'block text-sm font-medium text-va-black mb-1',
            error && 'text-va-orange'
          )}
        >
          {label}
        </label>
      )}
      <div className={cn(isPassword && 'relative')}>
        <input
          id={id}
          disabled={disabled}
          autoCapitalize={isPassword ? 'none' : undefined}
          autoCorrect={isPassword ? 'off' : undefined}
          spellCheck={isPassword ? false : undefined}
          className={cn(
            'w-full px-3 py-2 text-sm text-va-black border rounded-sm transition-colors',
            'border-va-lightgray focus:border-va-black focus:outline-none',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error && 'border-va-orange focus:border-va-orange',
            isPassword && 'pr-10',
            className
          )}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          {...inputProps}
          type={resolvedType}
        />
        {isPassword ? (
          <PasswordVisibilityToggle visible={visible} onToggle={toggle} disabled={disabled} />
        ) : null}
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-1 text-xs text-va-orange">
          {error}
        </p>
      )}
    </div>
  )
}
