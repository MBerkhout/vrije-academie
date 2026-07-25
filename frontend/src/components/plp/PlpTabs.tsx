'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface Tab {
  label: string
  href: string
}

interface PlpTabsProps {
  tabs: Tab[]
  activePath: string
}

export function PlpTabs({ tabs, activePath }: PlpTabsProps) {
  const pathname = usePathname()
  const active = pathname || activePath

  return (
    <div className="border-b border-va-lightgray">
      <div className="flex gap-6" role="tablist">
        {tabs.map((tab) => {
          const isActive = active === tab.href
          return (
            <Link
              key={tab.href}
              href={tab.href}
              role="tab"
              aria-selected={isActive}
              className={cn(
                'pb-2 md:pb-3 text-sm font-medium border-b-2 -mb-px transition-colors',
                isActive
                  ? 'border-va-yellow text-va-black'
                  : 'border-transparent text-va-gray hover:text-va-black'
              )}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
