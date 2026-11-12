import type { ErrorEvent, EventHint } from '@sentry/nextjs'

type StackFrame = {
  filename?: string
  abs_path?: string
}

const GTM_FRAME = /gtm\.js|googletagmanager\.com/i
const EXTENSION_FRAME = /^(chrome|moz|safari)-extension:\/\//i
const THIRD_PARTY_FETCH_HOST =
  /Failed to fetch \((ad\.doubleclick\.net|google-analytics\.com|www\.googletagmanager\.com)\)/i

const MEDUSA_NETWORK_ERROR =
  /(Load failed|Failed to fetch|NetworkError when attempting to fetch resource).*medusa\.vrijeacademie\.nl/i

export const SENTRY_CLIENT_IGNORE_ERRORS: Array<string | RegExp> = [
  'ResizeObserver loop',
  'Non-Error promise rejection captured',
  /Tab not found/,
  /NS_ERROR_FAILURE/,
  /The operation is insecure/,
  /^Load error!$/,
  /runtime\.sendMessage/,
]

function stackFrames(event: ErrorEvent): StackFrame[] {
  const values = event.exception?.values
  if (!values?.length) return []
  const frames: StackFrame[] = []
  for (const value of values) {
    const trace = value.stacktrace?.frames
    if (trace?.length) frames.push(...trace)
  }
  return frames
}

function isExtensionFrame(frame: StackFrame): boolean {
  const parts = [frame.filename, frame.abs_path].filter(Boolean) as string[]
  return parts.some((part) => EXTENSION_FRAME.test(part.trim()))
}

function eventMessage(event: ErrorEvent, hint: EventHint): string {
  const original = hint.originalException
  if (typeof original === 'string') return original
  if (original instanceof Error) return original.message
  const value = event.exception?.values?.[0]?.value
  if (typeof value === 'string') return value
  return event.message ?? ''
}

function frameHasGtm(frame: StackFrame): boolean {
  const parts = [frame.filename, frame.abs_path].filter(Boolean) as string[]
  return parts.some((part) => GTM_FRAME.test(part))
}

function hasThirdPartyStack(event: ErrorEvent): boolean {
  return stackFrames(event).some(frameHasGtm)
}

function hasExtensionStack(event: ErrorEvent): boolean {
  return stackFrames(event).some(isExtensionFrame)
}

function isCheckoutTransaction(event: ErrorEvent): boolean {
  const transaction = event.transaction ?? event.request?.url ?? ''
  return /checkout\/betaling/i.test(transaction)
}

function shouldDropMedusaNetworkError(event: ErrorEvent, message: string): boolean {
  if (!MEDUSA_NETWORK_ERROR.test(message)) return false
  if (isCheckoutTransaction(event)) return false
  if (typeof navigator !== 'undefined') {
    if (navigator.onLine === false) return true
    if (document.visibilityState === 'hidden') return true
  }
  return false
}

function shouldDowngradeMedusaNetworkError(event: ErrorEvent, message: string): boolean {
  if (!MEDUSA_NETWORK_ERROR.test(message)) return false
  if (isCheckoutTransaction(event)) return false
  return true
}

/**
 * Client-only `beforeSend` filter: drop third-party/GTM/extension noise and
 * downgrade benign Medusa fetch aborts to warning.
 */
export function filterSentryEvent(event: ErrorEvent, hint: EventHint): ErrorEvent | null {
  const message = eventMessage(event, hint)

  if (hasThirdPartyStack(event)) return null
  if (hasExtensionStack(event)) return null
  if (THIRD_PARTY_FETCH_HOST.test(message)) return null

  if (shouldDropMedusaNetworkError(event, message)) return null

  if (shouldDowngradeMedusaNetworkError(event, message)) {
    return { ...event, level: 'warning' }
  }

  return event
}
