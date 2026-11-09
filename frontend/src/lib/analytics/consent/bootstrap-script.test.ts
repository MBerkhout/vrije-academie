import { describe, expect, it } from 'vitest'

import { HAS_CONSENT_COOKIE_NAME } from '@/lib/analytics/consent/constants'
import { getConsentBootstrapScript } from '@/lib/analytics/consent/bootstrap-script'

describe('consent bootstrap script', () => {
  it('includes consent default and hasConsent restore', () => {
    const script = getConsentBootstrapScript()
    expect(script).toContain("gtag('consent', 'default'")
    expect(script).toContain('wait_for_update')
    expect(script).toContain(`${HAS_CONSENT_COOKIE_NAME}=true`)
    expect(script).toContain("gtag('consent', 'update'")
  })
})
