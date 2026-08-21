'use client'

import type { InputHTMLAttributes } from 'react'
import clsx from 'clsx'
import type { FieldValidity } from '@/lib/auth/account-field-validation'

export interface ValidatedInputProps {
  id?: string
  name: string
  label: string
  required?: boolean
  type?: string
  autoComplete?: string
  placeholder?: string
  description?: string
  min?: number | string
  max?: number | string
  step?: number | string
  inputMode?: InputHTMLAttributes<HTMLInputElement>['inputMode']
  value: string
  onChange: (v: string) => void
  onBlur: () => void
  validity: FieldValidity
  disabled?: boolean
}

export function ValidatedInput({
  id,
  name,
  label,
  required,
  type = 'text',
  autoComplete,
  placeholder,
  description,
  min,
  max,
  step,
  inputMode,
  value,
  onChange,
  onBlur,
  validity,
  disabled,
}: ValidatedInputProps) {
  const isInvalid = validity.state === 'invalid'
  const isValid = validity.state === 'valid'
  const inputId = id ?? name
  const descriptionId = description ? `${inputId}-description` : undefined
  const errorId = isInvalid ? `${inputId}-error` : undefined
  return (
    <div>
      <label className="block font-sans text-sm font-medium text-va-black mb-1" htmlFor={inputId}>
        {label}
        {required && ' *'}
      </label>
      <div className="relative">
        <input
          id={inputId}
          name={name}
          type={type}
          autoComplete={autoComplete}
          placeholder={placeholder}
          min={min}
          max={max}
          step={step}
          inputMode={inputMode}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          disabled={disabled}
          aria-invalid={isInvalid || undefined}
          aria-describedby={[descriptionId, errorId].filter(Boolean).join(' ') || undefined}
          className={clsx(
            'w-full rounded-lg border px-3 py-2 pr-9 font-sans text-sm focus:outline-none transition-colors',
            isInvalid && 'border-red-500 focus:border-red-600',
            isValid && 'border-green-500 focus:border-green-600',
            !isInvalid && !isValid && 'border-va-lightgray-300 focus:border-va-black'
          )}
        />
        {(isValid || isInvalid) && (
          <span
            className={clsx(
              'absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none',
              isValid ? 'text-green-600' : 'text-red-600'
            )}
            aria-hidden
          >
            {isValid ? (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M2.5 7l3 3 6-6"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            )}
          </span>
        )}
      </div>
      {description && (
        <p id={descriptionId} className="mt-1 font-sans text-xs text-va-darkgray">
          {description}
        </p>
      )}
      {isInvalid && (
        <p id={errorId} className="mt-1 font-sans text-xs text-red-600">
          {validity.message}
        </p>
      )}
    </div>
  )
}

export interface ValidatedTextareaProps {
  id?: string
  name: string
  label: string
  required?: boolean
  rows?: number
  autoComplete?: string
  placeholder?: string
  value: string
  onChange: (v: string) => void
  onBlur: () => void
  validity: FieldValidity
  disabled?: boolean
}

export function ValidatedTextarea({
  id,
  name,
  label,
  required,
  rows = 4,
  autoComplete,
  placeholder,
  value,
  onChange,
  onBlur,
  validity,
  disabled,
}: ValidatedTextareaProps) {
  const isInvalid = validity.state === 'invalid'
  const isValid = validity.state === 'valid'
  const inputId = id ?? name
  return (
    <div>
      <label className="block font-sans text-sm font-medium text-va-black mb-1" htmlFor={inputId}>
        {label}
        {required && ' *'}
      </label>
      <div className="relative">
        <textarea
          id={inputId}
          name={name}
          rows={rows}
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          disabled={disabled}
          aria-invalid={isInvalid || undefined}
          className={clsx(
            'w-full min-h-[100px] resize-y rounded-lg border px-3 py-2 pr-9 font-sans text-sm focus:outline-none transition-colors',
            isInvalid && 'border-red-500 focus:border-red-600',
            isValid && 'border-green-500 focus:border-green-600',
            !isInvalid && !isValid && 'border-va-lightgray-300 focus:border-va-black'
          )}
        />
        {(isValid || isInvalid) && (
          <span
            className={clsx(
              'absolute right-3 top-3 pointer-events-none',
              isValid ? 'text-green-600' : 'text-red-600'
            )}
            aria-hidden
          >
            {isValid ? (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M2.5 7l3 3 6-6"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            )}
          </span>
        )}
      </div>
      {isInvalid && <p className="font-sans text-xs text-red-600 mt-1">{validity.message}</p>}
    </div>
  )
}
