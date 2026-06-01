'use client'

import { useState } from 'react'
import clsx from 'clsx'
import { QuickSearch } from '@/components/search/QuickSearch'
import type { PopularSearchItem } from '@/lib/cms/types'
import { PLP_BASE_PATH } from '@/lib/routes'
import { cn } from '@/lib/utils'

interface PlpQuickSearchTriggerProps {
  defaultValue?: string
  placeholder?: string
  className?: string
  basePath?: string
  popularSearches?: PopularSearchItem[]
}

function IconSearch({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15zm0-2a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11z"
        fill="currentColor"
      />
      <path d="M20.2 21.8 15 16.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function PlpQuickSearchTrigger({
  defaultValue = '',
  placeholder = 'Zoek naar een cursus, onderwerp of docent…',
  className,
  basePath = PLP_BASE_PATH,
  popularSearches: popularSearchesProp,
}: PlpQuickSearchTriggerProps) {
  const popularSearches = popularSearchesProp ?? []
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'flex w-full items-center gap-3 border border-va-lightgray bg-white px-4 py-2.5 text-left text-sm',
          'text-va-gray transition-colors hover:border-va-gray focus:outline-none focus:ring-2 focus:ring-va-yellow',
          className
        )}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <IconSearch className="h-4 w-4 shrink-0 text-va-darkgray" />
        <span className={clsx('truncate', defaultValue ? 'text-va-black' : 'text-va-gray')}>
          {defaultValue || placeholder}
        </span>
      </button>
      <QuickSearch
        open={open}
        onClose={() => setOpen(false)}
        placeholder={placeholder}
        popularSearches={popularSearches}
        submitBasePath={basePath}
        initialQuery={defaultValue}
      />
    </>
  )
}
