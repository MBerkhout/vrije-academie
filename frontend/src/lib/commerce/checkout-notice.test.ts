import { describe, expect, it } from 'vitest'
import { buildEmailMismatchNotice, mapCartSyncErrorMessage } from './checkout-notice'

describe('checkout-notice', () => {
  it('builds a Dutch email mismatch explanation', () => {
    const notice = buildEmailMismatchNotice('a@example.nl', 'b@example.nl')
    expect(notice.kind).toBe('email_mismatch')
    expect(notice.message).toContain('a@example.nl')
    expect(notice.message).toContain('b@example.nl')
    expect(notice.message).toMatch(/VAthuis-collectie/i)
  })

  it('maps cart sync errors to Dutch copy', () => {
    expect(mapCartSyncErrorMessage('Cart belongs to another customer')).toMatch(/ander account/i)
    expect(mapCartSyncErrorMessage('CART_SYNC_FAILED')).toMatch(/opnieuw in/i)
  })
})
