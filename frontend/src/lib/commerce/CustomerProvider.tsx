'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import { commerceClient } from '@/lib/commerce'
import { trackLogin, trackLogout, trackSignUp } from '@/lib/analytics/events/engagement'
import type { Customer, RegisterInput } from './types'

interface CustomerContextValue {
  customer: Customer | null
  loading: boolean
  refresh: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  register: (input: RegisterInput) => Promise<void>
  logout: () => Promise<void>
}

const CustomerContext = createContext<CustomerContextValue>({
  customer: null,
  loading: false,
  refresh: async () => {},
  login: async () => {},
  register: async () => {},
  logout: async () => {},
})

export function CustomerProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const c = await commerceClient.getCustomer()
      setCustomer(c)
    } catch {
      setCustomer(null)
    }
  }, [])

  useEffect(() => {
    refresh().finally(() => setLoading(false))
  }, [refresh])

  // Listen for external customer updates (e.g. from another tab or component)
  useEffect(() => {
    const handler = () => { refresh() }
    window.addEventListener('va:customer-updated', handler)
    return () => window.removeEventListener('va:customer-updated', handler)
  }, [refresh])

  const login = useCallback(async (email: string, password: string) => {
    const c = await commerceClient.login(email, password)
    setCustomer(c)
    trackLogin(email)
    window.dispatchEvent(new Event('va:customer-updated'))
  }, [])

  const register = useCallback(async (input: RegisterInput) => {
    const c = await commerceClient.register(input)
    setCustomer(c)
    trackSignUp(input.email)
    window.dispatchEvent(new Event('va:customer-updated'))
  }, [])

  const logout = useCallback(async () => {
    await commerceClient.logout()
    setCustomer(null)
    trackLogout()
    window.dispatchEvent(new Event('va:customer-updated'))
  }, [])

  return (
    <CustomerContext.Provider value={{ customer, loading, refresh, login, register, logout }}>
      {children}
    </CustomerContext.Provider>
  )
}

export function useCustomer() {
  return useContext(CustomerContext)
}
