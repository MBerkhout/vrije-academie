'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ValidatedInput } from '@/components/auth/ValidatedInput'
import { Button } from '@/components/ui/Button'
import { commerceClient } from '@/lib/commerce'
import { useCustomer } from '@/lib/commerce/CustomerProvider'
import type { EventCard } from '@/lib/commerce/types'
import {
  trackFormError,
  trackNewsletterSignup,
  trackViewWaitlistForm,
  trackWaitlistSignup,
} from '@/lib/analytics/events/engagement'
import { buildUserDataFromCustomer } from '@/lib/analytics/mappers/user-data'
import {
  type FieldValidity,
  validateAccountField,
} from '@/lib/auth/account-field-validation'
import { defaultMessages } from '@/lib/i18n/messages'

interface PdpWaitlistModalProps {
  open: boolean
  onClose: () => void
  event: EventCard
}

type WaitlistField = 'quantity' | 'firstName' | 'lastName' | 'email' | 'phone'

function validateQuantity(value: string): FieldValidity {
  const trimmed = value.trim()
  if (!trimmed) return { state: 'invalid', message: 'Vul het aantal personen in' }
  const n = Number(trimmed)
  if (!Number.isInteger(n) || n < 1 || n > 99) {
    return { state: 'invalid', message: 'Kies een aantal tussen 1 en 99' }
  }
  return { state: 'valid' }
}

export function PdpWaitlistModal({ open, onClose, event }: PdpWaitlistModalProps) {
  const t = defaultMessages.pdp
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const { customer, loading: customerLoading } = useCustomer()

  const [quantity, setQuantity] = useState('1')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [validity, setValidity] = useState<Record<WaitlistField, FieldValidity>>({
    quantity: { state: 'idle' },
    firstName: { state: 'idle' },
    lastName: { state: 'idle' },
    email: { state: 'idle' },
    phone: { state: 'idle' },
  })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [busy, setBusy] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return
    trackViewWaitlistForm(event.handle, event.title)
  }, [open, event.handle, event.title])

  useEffect(() => {
    if (!open || customerLoading) return
    if (!customer) return
    setFirstName(customer.first_name?.trim() ?? '')
    setLastName(customer.last_name?.trim() ?? '')
    setEmail(customer.email?.trim() ?? '')
    setPhone(customer.phone?.trim() ?? '')
  }, [open, customer, customerLoading])

  useEffect(() => {
    if (!open) return
    setError(null)
    setSuccess(false)
    setBusy(false)
    setQuantity('1')
    if (!customer) {
      setFirstName('')
      setLastName('')
      setEmail('')
      setPhone('')
    }
    setValidity({
      quantity: { state: 'idle' },
      firstName: { state: 'idle' },
      lastName: { state: 'idle' },
      email: { state: 'idle' },
      phone: { state: 'idle' },
    })
  }, [open, customer])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    const tId = window.setTimeout(() => {
      panelRef.current?.querySelector<HTMLInputElement>('input')?.focus()
    }, 0)
    return () => window.clearTimeout(tId)
  }, [open])

  const touchField = useCallback((field: WaitlistField, value: string) => {
    let next: FieldValidity
    switch (field) {
      case 'quantity':
        next = validateQuantity(value)
        break
      case 'firstName':
        next = validateAccountField('firstName', value)
        break
      case 'lastName':
        next = validateAccountField('lastName', value)
        break
      case 'email':
        next = validateAccountField('email', value)
        break
      case 'phone':
        next = value.trim()
          ? validateAccountField('phone', value)
          : { state: 'invalid', message: t.waitlistPhoneRequired }
        break
    }
    setValidity((prev) => ({ ...prev, [field]: next }))
    if (next.state === 'invalid') {
      trackFormError('wachtlijst_formulier', field, next.message)
    }
    return next
  }, [t])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const checks: Array<[WaitlistField, string]> = [
      ['quantity', quantity],
      ['firstName', firstName],
      ['lastName', lastName],
      ['email', email],
      ['phone', phone],
    ]
    const nextValidity = { ...validity }
    let hasError = false
    for (const [field, value] of checks) {
      const result = touchField(field, value)
      nextValidity[field] = result
      if (result.state !== 'valid') hasError = true
    }
    setValidity(nextValidity)
    if (hasError) return

    setBusy(true)
    try {
      await commerceClient.joinWaitlist(event.handle, {
        quantity: Number(quantity),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
      })
      trackWaitlistSignup({
        itemId: event.handle,
        itemName: event.title,
        quantity: Number(quantity),
        userData: customer
          ? buildUserDataFromCustomer(customer)
          : {
              email: email.trim(),
              phone_number: phone.trim(),
              first_name: firstName.trim(),
              last_name: lastName.trim(),
            },
      })
      trackNewsletterSignup('wachtlijst_popup', email.trim())
      setSuccess(true)
      window.setTimeout(() => {
        onClose()
        setSuccess(false)
      }, 2000)
    } catch {
      setError(t.waitlistError)
    } finally {
      setBusy(false)
    }
  }

  if (!mounted || !open) return null

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label={t.waitlistClose}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-[101] w-full max-w-lg max-h-[90vh] overflow-y-auto border border-va-lightgray bg-white p-6 shadow-xl rounded-none"
      >
        <h2 id={titleId} className="font-sans text-lg font-bold text-va-black mb-3">
          {t.waitlistModalTitle}
        </h2>
        {success ? (
          <p className="font-sans text-sm text-va-darkgray" role="status">
            {t.waitlistSuccess}
          </p>
        ) : (
          <>
            <p className="font-sans text-sm text-va-gray mb-5 leading-relaxed">{t.waitlistIntro}</p>
            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
              <ValidatedInput
                name="quantity"
                label={t.waitlistFieldQuantity}
                type="number"
                min={1}
                max={99}
                step={1}
                inputMode="numeric"
                required
                value={quantity}
                onChange={setQuantity}
                onBlur={() => touchField('quantity', quantity)}
                validity={validity.quantity}
                disabled={busy}
              />
              <ValidatedInput
                name="firstName"
                label={t.waitlistFieldFirstName}
                autoComplete="given-name"
                required
                value={firstName}
                onChange={setFirstName}
                onBlur={() => touchField('firstName', firstName)}
                validity={validity.firstName}
                disabled={busy}
              />
              <ValidatedInput
                name="lastName"
                label={t.waitlistFieldLastName}
                autoComplete="family-name"
                required
                value={lastName}
                onChange={setLastName}
                onBlur={() => touchField('lastName', lastName)}
                validity={validity.lastName}
                disabled={busy}
              />
              <ValidatedInput
                name="email"
                label={t.waitlistFieldEmail}
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={setEmail}
                onBlur={() => touchField('email', email)}
                validity={validity.email}
                disabled={busy || Boolean(customer?.email)}
              />
              <ValidatedInput
                name="phone"
                label={t.waitlistFieldPhone}
                type="tel"
                autoComplete="tel"
                required
                value={phone}
                onChange={setPhone}
                onBlur={() => touchField('phone', phone)}
                validity={validity.phone}
                description={t.waitlistFieldPhoneHint}
                disabled={busy}
              />
              {error ? (
                <p className="font-sans text-sm text-va-orange" role="alert">
                  {error}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-3 pt-2">
                <Button type="submit" variant="primary" size="md" disabled={busy}>
                  {busy ? defaultMessages.common.loading : t.waitlistSubmit}
                </Button>
                <Button type="button" variant="outline" size="md" onClick={onClose} disabled={busy}>
                  {t.waitlistClose}
                </Button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}
