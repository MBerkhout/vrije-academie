'use client'

import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { PLP_BASE_PATH } from '@/lib/routes'

interface PlpSearchBarProps {
  /** Uncontrolled initial value (omit when using `value` + `onChange`). */
  defaultValue?: string
  /** Controlled value for live search. */
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  submitLabel?: string
  className?: string
  basePath?: string
  /** When true, typing updates results via parent; submit only syncs the URL. */
  live?: boolean
}

export function PlpSearchBar({
  defaultValue = '',
  value,
  onChange,
  placeholder = 'Zoek naar een cursus, onderwerp of docent…',
  submitLabel = 'Zoek',
  className,
  basePath = PLP_BASE_PATH,
  live = false,
}: PlpSearchBarProps) {
  const router = useRouter()
  const controlled = value !== undefined && onChange !== undefined
  const displayValue = controlled ? value : undefined

  function navigateWithQuery(q: string) {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    router.push(params.toString() ? `${basePath}?${params.toString()}` : basePath)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const q = (form.elements.namedItem('q') as HTMLInputElement).value.trim()
    if (live && controlled) {
      onChange(q)
      navigateWithQuery(q)
      return
    }
    navigateWithQuery(q)
  }

  function handleClear() {
    if (controlled) {
      onChange('')
    }
    if (!live) {
      router.push(basePath)
    }
  }

  const showClear = controlled ? Boolean(value) : Boolean(defaultValue)

  return (
    <form onSubmit={handleSubmit} className={cn('flex gap-2', className)} role="search">
      <div className="relative flex-1">
        <input
          type="search"
          name="q"
          value={displayValue}
          defaultValue={controlled ? undefined : defaultValue}
          onChange={controlled ? (e) => onChange(e.target.value) : undefined}
          placeholder={placeholder}
          aria-label="Zoek activiteiten"
          autoComplete="off"
          className="w-full border border-va-lightgray px-4 py-2.5 text-sm text-va-black placeholder:text-va-gray focus:outline-none focus:ring-2 focus:ring-va-yellow pr-8"
        />
        {showClear && (
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
