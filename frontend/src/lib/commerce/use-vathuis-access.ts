'use client'

import { useEffect, useState } from 'react'
import { commerceClient } from '@/lib/commerce'
import type { VathuisAccessStatus } from '@/lib/commerce/types'
import { useCustomer } from '@/lib/commerce/CustomerProvider'

const NO_ACCESS: VathuisAccessStatus = {
  hasAccess: false,
  grantedAt: null,
  expiresAt: null,
}

export function useVathuisAccess(productHandle: string | null | undefined) {
  const { customer, loading: customerLoading } = useCustomer()
  const [access, setAccess] = useState<VathuisAccessStatus>(NO_ACCESS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!productHandle) {
      setAccess(NO_ACCESS)
      setLoading(false)
      return
    }

    if (customerLoading) return

    if (!customer) {
      setAccess(NO_ACCESS)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    void (async () => {
      try {
        const result = await commerceClient.getVathuisAccess(productHandle)
        if (!cancelled) setAccess(result)
      } catch {
        if (!cancelled) setAccess(NO_ACCESS)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [customer, customerLoading, productHandle])

  return { access, loading: loading || customerLoading }
}
