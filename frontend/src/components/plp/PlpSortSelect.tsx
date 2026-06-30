'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { PLP_BASE_PATH } from '@/lib/routes'

const DEFAULT_SORT_OPTIONS = [
  { value: 'order', label: 'Aanbevolen' },
  { value: 'start_date', label: 'Vroegste startdatum' },
  { value: 'newest', label: 'Nieuwste eerst' },
  { value: 'relevance', label: 'Meest relevant' },
  { value: 'price_asc', label: 'Prijs: laag–hoog' },
  { value: 'price_desc', label: 'Prijs: hoog–laag' },
]

interface PlpSortSelectProps {
  currentSort: string
  hasQuery: boolean
  className?: string
  basePath?: string
  options?: { value: string; label: string }[]
}

export function PlpSortSelect({
  currentSort,
  hasQuery,
  className,
  basePath = PLP_BASE_PATH,
  options = DEFAULT_SORT_OPTIONS,
}: PlpSortSelectProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('sort', e.target.value)
    params.delete('page')
    router.push(`${basePath}?${params.toString()}`)
  }

  const defaultSort = hasQuery ? 'relevance' : 'order'
  const active = currentSort || defaultSort

  return (
    <select
      value={active}
      onChange={handleChange}
      aria-label="Sorteren op"
      className={cn(
        'text-sm border border-va-lightgray px-3 py-2 text-va-black bg-white focus:outline-none focus:ring-2 focus:ring-va-yellow',
        className
      )}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}
