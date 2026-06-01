'use client'

import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { PLP_BASE_PATH } from '@/lib/routes'

interface PlpSearchBarProps {
  defaultValue: string
  placeholder?: string
  submitLabel?: string
  className?: string
  basePath?: string
}

export function PlpSearchBar({
  defaultValue,
  placeholder = 'Zoek naar een cursus, onderwerp of docent…',
  submitLabel = 'Zoek',
  className,
  basePath = PLP_BASE_PATH,
}: PlpSearchBarProps) {
  const router = useRouter()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const q = (form.elements.namedItem('q') as HTMLInputElement).value.trim()
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    router.push(`${basePath}?${params.toString()}`)
  }

  function handleClear() {
    router.push(basePath)
  }

  return (
    <form onSubmit={handleSubmit} className={cn('flex gap-2', className)} role="search">
      <div className="relative flex-1">
        <input
          type="search"
          name="q"
          defaultValue={defaultValue}
          placeholder={placeholder}
          aria-label="Zoek activiteiten"
          className="w-full border border-va-lightgray px-4 py-2.5 text-sm text-va-black placeholder:text-va-gray focus:outline-none focus:ring-2 focus:ring-va-yellow pr-8"
        />
        {defaultValue && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Zoekopdracht wissen"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-va-gray hover:text-va-black"
          >
            ×
          </button>
        )}
      </div>
      <button
        type="submit"
        className="bg-va-yellow text-va-black px-5 py-2.5 text-sm font-medium hover:bg-va-yellow/80 transition-colors shrink-0"
      >
        {submitLabel}
      </button>
    </form>
  )
}
