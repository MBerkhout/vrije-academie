/**
 * Sanity 5 (via next-sanity) bundles i18next 25, which prints a Locize
 * `console.info` on init. i18next skips that notice when this flag is set.
 * Must run before `i18next.init()` (see instrumentation*.ts and root layout).
 */
const SUPPORT_NOTICE_KEY = '__i18next_supportNoticeShown'

export function suppressI18nextSupportNotice(): void {
  ;(globalThis as Record<string, unknown>)[SUPPORT_NOTICE_KEY] = true
}

suppressI18nextSupportNotice()
