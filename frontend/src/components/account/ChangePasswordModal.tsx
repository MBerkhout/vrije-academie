'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { commerceClient } from '@/lib/commerce'
import { useCustomer } from '@/lib/commerce/CustomerProvider'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { defaultMessages } from '@/lib/i18n/messages'

interface ChangePasswordModalProps {
  open: boolean
  onClose: () => void
}

export function ChangePasswordModal({ open, onClose }: ChangePasswordModalProps) {
  const { customer, refresh } = useCustomer()
  const t = defaultMessages.accountPage
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const [oldPw, setOldPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [busy, setBusy] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return
    setError(null)
    setSuccess(false)
    setOldPw('')
    setNewPw('')
    setConfirmPw('')
  }, [open])

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
      panelRef.current?.querySelector<HTMLInputElement>('input[type="password"]')?.focus()
    }, 0)
    return () => window.clearTimeout(tId)
  }, [open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!customer?.email) {
      setError(t.passwordError)
      return
    }
    if (newPw.length < 8) {
      setError(t.passwordTooShort)
      return
    }
    if (newPw !== confirmPw) {
      setError(t.passwordMismatch)
      return
    }
    setBusy(true)
    try {
      await commerceClient.changePassword({
        email: customer.email,
        oldPassword: oldPw,
        newPassword: newPw,
      })
      setSuccess(true)
      await refresh()
      window.dispatchEvent(new Event('va:customer-updated'))
      window.setTimeout(() => {
        onClose()
        setSuccess(false)
      }, 1200)
    } catch {
      setError(t.passwordError)
    } finally {
      setBusy(false)
    }
  }

  if (!mounted || !open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label={t.passwordClose}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-[101] w-full max-w-md border border-va-lightgray bg-white p-6 shadow-xl rounded-none"
      >
        <h2 id={titleId} className="font-sans text-lg font-bold text-va-black mb-4">
          {t.passwordModalTitle}
        </h2>
        {success ? (
          <p className="font-serif text-sm text-va-darkgray" role="status">
            {t.passwordSuccess}
          </p>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <Input
              type="password"
              autoComplete="current-password"
              label={t.passwordCurrent}
              value={oldPw}
              onChange={(e) => setOldPw(e.target.value)}
              required
              disabled={busy}
            />
            <Input
              type="password"
              autoComplete="new-password"
              label={t.passwordNew}
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              required
              minLength={8}
              disabled={busy}
            />
            <Input
              type="password"
              autoComplete="new-password"
              label={t.passwordConfirm}
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              required
              minLength={8}
              disabled={busy}
            />
            {error ? (
              <p className="font-sans text-sm text-va-orange" role="alert">
                {error}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-3 pt-2">
              <Button type="submit" variant="primary" size="md" disabled={busy}>
                {busy ? defaultMessages.common.loading : t.passwordSubmit}
              </Button>
              <Button type="button" variant="outline" size="md" onClick={onClose} disabled={busy}>
                {t.passwordClose}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body,
  )
}
