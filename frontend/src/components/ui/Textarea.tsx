'use client'

import { useId } from 'react'
import { cn } from '@/lib/utils'

interface TextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'> {
  label?: string
  error?: string
  className?: string
}

export function Textarea({
  label,
  error,
  className,
  id: idProp,
  rows = 4,
  ...textareaProps
}: TextareaProps) {
  const generatedId = useId()
  const id = idProp ?? generatedId

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
      <textarea
        id={id}
        rows={rows}
        className={cn(
          'w-full px-3 py-2 text-sm text-va-black border rounded-sm transition-colors',
          'border-va-lightgray focus:border-va-black focus:outline-none',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          error && 'border-va-orange focus:border-va-orange',
          className
        )}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        {...textareaProps}
      />
      {error && (
        <p id={`${id}-error`} className="mt-1 text-xs text-va-orange">
          {error}
        </p>
      )}
    </div>
  )
}
