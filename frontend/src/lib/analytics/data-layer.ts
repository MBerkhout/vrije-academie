import { isAnalyticsEnabled } from '@/lib/analytics/config'
import type { AnalyticsEvent } from '@/lib/analytics/types'

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[]
  }
}

export function initDataLayer(): void {
  if (typeof window === 'undefined') return
  window.dataLayer = window.dataLayer ?? []
}

export function pushEvent<T extends AnalyticsEvent>(payload: T): void {
  if (!isAnalyticsEnabled()) return
  if (typeof window === 'undefined') return
  initDataLayer()
  window.dataLayer!.push(payload as unknown as Record<string, unknown>)
  if (process.env.NODE_ENV === 'development') {
    console.debug('[analytics]', payload)
  }
}

export function pushRaw(payload: Record<string, unknown>): void {
  if (!isAnalyticsEnabled()) return
  if (typeof window === 'undefined') return
  initDataLayer()
  window.dataLayer!.push(payload)
  if (process.env.NODE_ENV === 'development') {
    console.debug('[analytics]', payload)
  }
}
