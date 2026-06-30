'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CONTAINER_CLASS } from '@/lib/cms'
import { VATHUIS_BASE_PATH, VATHUIS_CATALOG_PATH } from '@/lib/routes'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { label: 'VA Thuis', href: VATHUIS_BASE_PATH, exact: true },
  { label: 'Ons aanbod', href: VATHUIS_CATALOG_PATH, exact: false },
] as const

export function VaThuisSubNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="VA Thuis"
      className="border-b border-va-darkgray-800 bg-va-black"
    >
      <div className={`${CONTAINER_CLASS} flex gap-6 py-3`}>
        {NAV_ITEMS.map((item) => {
          const active =
            item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'text-sm font-semibold transition-colors',
                active
                  ? 'text-va-yellow underline underline-offset-4 decoration-va-yellow'
                  : 'text-white/80 hover:text-white',
              )}
              aria-current={active ? 'page' : undefined}
            >
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
