'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import clsx from 'clsx'
import type { PopularSearchItem, SearchSuggestion, SearchSuggestionsResult } from '@/lib/cms/types'
import { isExternalHref, resolveMenuItemHref } from '@/lib/menu-href'
import { addRecentSearch, getRecentSearches } from '@/lib/search/recent-searches'
import { cn } from '@/lib/utils'

type QuickSearchProps = {
  open: boolean
  onClose: () => void
  placeholder?: string
  popularSearches?: PopularSearchItem[]
  /** When set, submit navigates here with ?q= instead of /zoeken */
  submitBasePath?: string
  initialQuery?: string
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

function IconClose({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

const EMPTY_SUGGESTIONS: SearchSuggestionsResult = {
  products: [],
  categories: [],
  places: [],
  pages: [],
}

const SECTION_LABELS: Record<SearchSuggestion['kind'], string> = {
  product: 'Producten',
  category: 'Categorieën',
  place: 'Plaatsen',
  page: "Pagina's",
}

function flatSuggestions(result: SearchSuggestionsResult): SearchSuggestion[] {
  return [...result.categories, ...result.products, ...result.places, ...result.pages]
}

const SUGGEST_SECTION_ORDER = [
  ['category', 'categories'],
  ['product', 'products'],
  ['place', 'places'],
  ['page', 'pages'],
] as const satisfies ReadonlyArray<
  [SearchSuggestion['kind'], keyof SearchSuggestionsResult]
>

function SuggestionRow({
  item,
  active,
  onSelect,
  onHover,
}: {
  item: SearchSuggestion
  active: boolean
  onSelect: () => void
  onHover: () => void
}) {
  const external = isExternalHref(item.href)
  const className = cn(
    'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors',
    active ? 'bg-va-lightgray-200' : 'hover:bg-va-lightgray-100'
  )

  const inner = (
    <>
      {item.kind === 'product' && item.thumbnailUrl ? (
        <div className="relative h-12 w-12 shrink-0 overflow-hidden bg-va-lightgray-200">
          <Image src={item.thumbnailUrl} alt="" fill className="object-cover" sizes="48px" />
        </div>
      ) : (
        <div className="flex h-12 w-12 shrink-0 items-center justify-center bg-va-lightgray-200 text-xs font-semibold uppercase text-va-gray">
          {item.kind === 'place' ? 'PL' : item.kind === 'category' ? 'CA' : item.kind === 'page' ? 'PG' : 'AC'}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-sans text-sm font-medium text-va-black">{item.title}</p>
        {item.subtitle ? (
          <p className="truncate font-sans text-xs text-va-gray">{item.subtitle}</p>
        ) : null}
      </div>
    </>
  )

  if (external) {
    return (
      <a href={item.href} className={className} onMouseEnter={onHover} onClick={onSelect}>
        {inner}
      </a>
    )
  }

  return (
    <Link href={item.href} className={className} onMouseEnter={onHover} onClick={onSelect}>
      {inner}
    </Link>
  )
}

export function QuickSearch({
  open,
  onClose,
  placeholder = 'Waar ben je naar op zoek?',
  popularSearches: popularSearchesProp,
  submitBasePath = '/zoeken',
  initialQuery = '',
}: QuickSearchProps) {
  const popularSearches = popularSearchesProp ?? []
  const fieldId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState(initialQuery)
  const [suggestions, setSuggestions] = useState<SearchSuggestionsResult>(EMPTY_SUGGESTIONS)
  const [loading, setLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [recentSearches, setRecentSearches] = useState<string[]>([])

  const flat = useMemo(() => flatSuggestions(suggestions), [suggestions])
  const hasQuery = query.trim().length >= 2
  const showSuggestions = hasQuery && flat.length > 0

  useEffect(() => {
    if (!open) return
    setQuery(initialQuery)
    setRecentSearches(getRecentSearches())
    document.body.style.overflow = 'hidden'
    requestAnimationFrame(() => inputRef.current?.focus())
    return () => {
      document.body.style.overflow = ''
    }
  }, [open, initialQuery])

  useEffect(() => {
    if (!open) return
    const q = query.trim()
    if (q.length < 2) {
      setSuggestions(EMPTY_SUGGESTIONS)
      setLoading(false)
      setActiveIndex(-1)
      return
    }

    setLoading(true)
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(q)}`)
        if (!res.ok) throw new Error('suggest failed')
        const data = (await res.json()) as SearchSuggestionsResult
        setSuggestions(data)
        setActiveIndex(-1)
      } catch {
        setSuggestions(EMPTY_SUGGESTIONS)
      } finally {
        setLoading(false)
      }
    }, 250)

    return () => window.clearTimeout(timer)
  }, [query, open])

  const navigateToQuery = useCallback(
    (q: string) => {
      const trimmed = q.trim()
      if (!trimmed) return
      addRecentSearch(trimmed)
      window.location.href = `${submitBasePath}?q=${encodeURIComponent(trimmed)}`
    },
    [submitBasePath]
  )

  const handleSelectSuggestion = useCallback(
    (item: SearchSuggestion) => {
      addRecentSearch(query.trim() || item.title)
      onClose()
    },
    [onClose, query]
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (activeIndex >= 0 && flat[activeIndex]) {
      handleSelectSuggestion(flat[activeIndex])
      return
    }
    navigateToQuery(query)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      onClose()
      return
    }
    if (!showSuggestions) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => (i + 1 >= flat.length ? 0 : i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => (i <= 0 ? flat.length - 1 : i - 1))
    }
  }

  if (!open || typeof document === 'undefined') return null

  let rowOffset = 0

  return createPortal(
    <div className="fixed inset-0 z-[200] flex flex-col bg-white animate-va-fade motion-reduce:animate-none">
      <div className="border-b border-va-lightgray-300 bg-white">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-4 sm:px-6 sm:py-5">
          <form onSubmit={handleSubmit} className="flex min-w-0 flex-1 items-stretch" role="search">
            <label htmlFor={fieldId} className="sr-only">
              Zoeken
            </label>
            <div className="relative flex min-w-0 flex-1 items-center rounded-l-lg border border-va-yellow border-r-0 bg-white">
              <IconSearch className="pointer-events-none absolute left-4 h-5 w-5 text-va-gray sm:left-5 sm:h-6 sm:w-6" />
              <input
                ref={inputRef}
                id={fieldId}
                name="q"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                autoComplete="off"
                className={clsx(
                  'min-w-0 flex-1 rounded-l-lg border-0 bg-transparent py-3 pl-12 pr-4 sm:py-4 sm:pl-14',
                  'font-sans text-base text-va-black placeholder:text-va-gray',
                  'outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-va-yellow'
                )}
              />
            </div>
            <button
              type="submit"
              className={clsx(
                'shrink-0 rounded-r-lg border border-va-yellow bg-va-yellow px-4 sm:px-6 py-3 sm:py-4',
                'font-sans text-sm font-semibold text-va-black',
                'transition-[background-color] hover:bg-va-yellow-600 active:bg-va-yellow-700',
                'outline-none focus-visible:ring-2 focus-visible:ring-va-yellow focus-visible:ring-offset-2'
              )}
            >
              Zoeken
            </button>
          </form>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex shrink-0 items-center justify-center rounded-full p-2 text-va-darkgray transition-colors hover:bg-va-lightgray-200 outline-none focus-visible:ring-2 focus-visible:ring-va-yellow"
            aria-label="Sluiten"
          >
            <IconClose className="h-6 w-6" />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
          {loading && hasQuery ? (
            <p className="font-sans text-sm text-va-gray">Zoeken…</p>
          ) : null}

          {!loading && hasQuery && flat.length === 0 ? (
            <p className="font-sans text-sm text-va-darkgray">
              Geen suggesties gevonden. Druk op Enter voor alle resultaten.
            </p>
          ) : null}

          {showSuggestions ? (
            <div className="space-y-8">
              {SUGGEST_SECTION_ORDER.map(([kind, key]) => {
                const items = suggestions[key]
                if (!items.length) return null
                const startIndex = rowOffset
                rowOffset += items.length
                return (
                  <section key={kind}>
                    <h2 className="mb-2 font-sans text-xs font-semibold uppercase tracking-wide text-va-gray">
                      {SECTION_LABELS[kind]}
                    </h2>
                    <ul className="divide-y divide-va-lightgray-300 overflow-hidden rounded-lg border border-va-lightgray-300 bg-white">
                      {items.map((item, i) => (
                        <li key={`${kind}-${item.href}`}>
                          <SuggestionRow
                            item={item}
                            active={activeIndex === startIndex + i}
                            onSelect={() => handleSelectSuggestion(item)}
                            onHover={() => setActiveIndex(startIndex + i)}
                          />
                        </li>
                      ))}
                    </ul>
                  </section>
                )
              })}
            </div>
          ) : (
            <div className="space-y-8">
              {recentSearches.length > 0 ? (
                <section>
                  <h2 className="mb-3 font-sans text-sm font-semibold text-va-black">Recent gezocht</h2>
                  <ul className="flex flex-wrap gap-2">
                    {recentSearches.map((term) => (
                      <li key={term}>
                        <button
                          type="button"
                          onClick={() => navigateToQuery(term)}
                          className="rounded-full border border-va-lightgray-300 px-3 py-1.5 font-sans text-sm text-va-darkgray transition-colors hover:border-va-gray hover:text-va-black"
                        >
                          {term}
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {popularSearches.length > 0 ? (
                <section>
                  <h2 className="mb-3 font-sans text-sm font-semibold text-va-black">Vaak gezocht</h2>
                  <ul className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-4 sm:gap-y-2">
                    {popularSearches.map((item, i) => {
                      const href = resolveMenuItemHref(item)
                      const external = isExternalHref(href)
                      const className =
                        'font-sans text-sm text-va-darkgray underline-offset-2 transition-colors hover:text-va-black hover:underline'
                      return (
                        <li key={i}>
                          {external ? (
                            <a href={href} className={className} rel="noopener noreferrer" target="_blank">
                              {item.label}
                            </a>
                          ) : (
                            <Link href={href} className={className}>
                              {item.label}
                            </Link>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </section>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
