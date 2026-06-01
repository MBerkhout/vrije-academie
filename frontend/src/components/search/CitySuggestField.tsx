'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { SearchSuggestion } from '@/lib/cms/types'
import { cn } from '@/lib/utils'

type CitySuggestFieldProps = {
  inputId?: string
  placeholder?: string
  buttonLabel?: string
  className?: string
  inputClassName?: string
  buttonClassName?: string
  errorClassName?: string
  /** When true, show suggestions on focus even with empty input. */
  showAllOnFocus?: boolean
}

function findBestMatch(query: string, places: SearchSuggestion[]): SearchSuggestion | null {
  const q = query.trim().toLowerCase()
  if (!q || !places.length) return null
  return (
    places.find((p) => p.title.toLowerCase() === q) ??
    places.find((p) => p.title.toLowerCase().startsWith(q)) ??
    places[0] ??
    null
  )
}

export function CitySuggestField({
  inputId: inputIdProp,
  placeholder = 'Jouw woonplaats',
  buttonLabel = 'Zoek',
  className,
  inputClassName,
  buttonClassName,
  errorClassName,
  showAllOnFocus = true,
}: CitySuggestFieldProps) {
  const autoId = useId()
  const inputId = inputIdProp ?? autoId
  const listboxId = `${inputId}-listbox`
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const [query, setQuery] = useState('')
  const [places, setPlaces] = useState<SearchSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [error, setError] = useState<string | null>(null)

  const fetchPlaces = useCallback(async (q: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/search/places?q=${encodeURIComponent(q)}`)
      if (!res.ok) throw new Error('places suggest failed')
      const data = (await res.json()) as { places: SearchSuggestion[] }
      setPlaces(data.places ?? [])
      setActiveIndex(-1)
    } catch {
      setPlaces([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    const timer = window.setTimeout(() => {
      void fetchPlaces(query)
    }, 200)
    return () => window.clearTimeout(timer)
  }, [query, open, fetchPlaces])

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const navigateToPlace = useCallback(
    (place: SearchSuggestion) => {
      setError(null)
      setOpen(false)
      router.push(place.href)
    },
    [router]
  )

  const submitQuery = useCallback(
    (value: string, suggestions: SearchSuggestion[]) => {
      const trimmed = value.trim()
      if (!trimmed) {
        setError('Vul je woonplaats in.')
        return
      }
      const match = findBestMatch(trimmed, suggestions)
      if (!match) {
        setError('Geen plaats gevonden. Kies een suggestie uit de lijst.')
        return
      }
      navigateToPlace(match)
    },
    [navigateToPlace]
  )

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    submitQuery(query, places)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || !places.length) {
      if (e.key === 'ArrowDown' && showAllOnFocus) {
        setOpen(true)
      }
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => (i + 1 >= places.length ? 0 : i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => (i <= 0 ? places.length - 1 : i - 1))
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault()
      navigateToPlace(places[activeIndex])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const showList = open && (loading || places.length > 0)

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      <form onSubmit={handleSubmit} className="w-full">
        <label htmlFor={inputId} className="sr-only">
          Woonplaats
        </label>
        <div
          className={cn(
            'flex overflow-hidden',
            error ? 'ring-2 ring-red-500 ring-offset-2 ring-offset-va-yellow-200' : ''
          )}
        >
          <input
            ref={inputRef}
            id={inputId}
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setError(null)
              setOpen(true)
            }}
            onFocus={() => {
              setOpen(true)
              if (showAllOnFocus && !query.trim()) {
                void fetchPlaces('')
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            autoComplete="off"
            role="combobox"
            aria-expanded={showList}
            aria-controls={showList ? listboxId : undefined}
            aria-autocomplete="list"
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : undefined}
            className={cn(
              'min-w-0 flex-1 rounded-none border-0 bg-white px-4 py-3 font-sans text-va-black placeholder:text-va-gray-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-va-black-700',
              inputClassName
            )}
          />
          <button
            type="submit"
            className={cn(
              'shrink-0 rounded-none bg-va-black-800 px-6 py-3 font-sans text-sm font-semibold text-white transition-colors hover:bg-va-black-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-va-black focus-visible:ring-offset-2 focus-visible:ring-offset-va-yellow-200',
              buttonClassName
            )}
          >
            {buttonLabel}
          </button>
        </div>
      </form>

      {showList ? (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-20 mt-1 max-h-60 overflow-y-auto border border-va-lightgray-300 bg-white shadow-lg"
        >
          {loading ? (
            <li className="px-4 py-3 font-sans text-sm text-va-gray">Zoeken…</li>
          ) : (
            places.map((place, i) => (
              <li key={place.href} role="option" aria-selected={activeIndex === i}>
                <button
                  type="button"
                  className={cn(
                    'flex w-full px-4 py-3 text-left font-sans text-sm transition-colors',
                    activeIndex === i
                      ? 'bg-va-lightgray-200 text-va-black'
                      : 'text-va-darkgray hover:bg-va-lightgray-100 hover:text-va-black'
                  )}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => navigateToPlace(place)}
                >
                  {place.title}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}

      {error ? (
        <p
          id={`${inputId}-error`}
          className={cn('mt-3 text-center text-sm text-red-700', errorClassName)}
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </div>
  )
}
