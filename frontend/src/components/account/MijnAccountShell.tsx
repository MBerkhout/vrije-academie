'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCustomer } from '@/lib/commerce/CustomerProvider'
import { Button } from '@/components/ui/Button'
import { defaultMessages } from '@/lib/i18n/messages'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/mijn-account', key: 'navOverview' as const },
  { href: '/mijn-account/gegevens', key: 'navDetails' as const },
  { href: '/mijn-account/bewaard', key: 'navSaved' as const },
  { href: '/mijn-account/aankopen', key: 'navPurchases' as const },
  { href: '/mijn-account/collectie', key: 'navCollection' as const },
]

function isNavActive(pathname: string, href: string): boolean {
  if (href === '/mijn-account') {
    return pathname === '/mijn-account' || pathname === '/mijn-account/'
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function MijnAccountShell({ children }: { children: React.ReactNode }) {
  const { customer, loading, logout } = useCustomer()
  const pathname = usePathname() ?? ''
  const t = defaultMessages.accountPage
  const common = defaultMessages.common

  if (loading) {
    return (
      <div className="max-w-[1240px] mx-auto px-4 md:px-8 min-[1240px]:px-0 py-12">
        <p className="font-serif text-va-darkgray" aria-busy="true">
          {common.loadingEllipsis}
        </p>
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="max-w-[1240px] mx-auto px-4 md:px-8 min-[1240px]:px-0 py-12">
        <p className="font-serif text-va-darkgray mb-6">{t.loginPrompt}</p>
        <Link
          href="/login?returnTo=%2Fmijn-account"
          className="inline-flex font-sans text-sm font-medium text-va-black underline underline-offset-2 hover:text-va-darkgray"
        >
          {t.loginLink}
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-[1240px] mx-auto px-4 md:px-8 min-[1240px]:px-0 py-12">
      <div className="flex flex-col gap-8 lg:flex-row lg:gap-12 lg:items-start">
        <aside
          className={cn(
            'w-full shrink-0 border-b border-va-lightgray pb-6 lg:w-56 lg:border-b-0 lg:border-r lg:pr-8 lg:pb-0',
          )}
        >
          <nav aria-label={t.heading}>
            <ul className="flex flex-row gap-1 overflow-x-auto lg:flex-col lg:gap-0 lg:overflow-visible">
              {NAV.map(({ href, key }) => {
                const active = isNavActive(pathname, href)
                return (
                  <li key={href} className="shrink-0 lg:shrink">
                    <Link
                      href={href}
                      className={cn(
                        'block whitespace-nowrap rounded-none px-3 py-2 font-sans text-sm font-medium transition-colors lg:whitespace-normal',
                        active
                          ? 'bg-va-lightgray text-va-black'
                          : 'text-va-darkgray hover:bg-va-lightgray/60 hover:text-va-black',
                      )}
                    >
                      {t[key]}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>
          <div className="mt-6 border-t border-va-lightgray pt-6">
            <Button
              type="button"
              variant="outline"
              size="md"
              className="w-full"
              onClick={() => void logout()}
            >
              {t.logout}
            </Button>
          </div>
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  )
}
