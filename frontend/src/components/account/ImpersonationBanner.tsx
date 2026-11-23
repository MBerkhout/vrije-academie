'use client'

import { safeLocalStorage } from '@/lib/safe-storage'
import { useCustomer } from '@/lib/commerce/CustomerProvider'
import { clearImpersonationSession, isImpersonationSession } from '@/lib/commerce/impersonation'
import { MEDUSA_JWT_STORAGE_KEY } from '@/lib/commerce/medusa-jwt-storage'
import { Button } from '@/components/ui/Button'

export function ImpersonationBanner() {
  const { customer, loading, logout } = useCustomer()

  if (typeof window === 'undefined' || loading) return null

  const token = safeLocalStorage.getItem(MEDUSA_JWT_STORAGE_KEY)
  if (!isImpersonationSession(token)) return null

  const email = customer?.email ?? 'klant'

  return (
    <div
      className="sticky top-0 z-[60] bg-amber-100 border-b border-amber-300 text-amber-950"
      role="status"
    >
      <div className="max-w-[1240px] mx-auto px-4 md:px-8 min-[1304px]:px-0 py-2 flex flex-wrap items-center justify-between gap-2">
        <p className="font-sans text-sm">
          Je bekijkt de site als <strong>{email}</strong> (supportweergave).
        </p>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => {
            void (async () => {
              clearImpersonationSession()
              await logout()
            })()
          }}
        >
          Uitloggen
        </Button>
      </div>
    </div>
  )
}