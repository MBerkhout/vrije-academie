'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import {
  buildEuCountryPickerSections,
  getEuCountryLabel,
  type EuCountry,
} from '@/lib/address/eu-countries'
import { cn } from '@/lib/utils'

export interface CountryComboboxProps {
  value: string
  onChange: (code: string) => void
  disabled?: boolean
  label: string
  className?: string
}

function CountryOption({
  country,
  active,
  selected,
  onSelect,
}: {
  country: EuCountry
  active: boolean
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onSelect}
      className={cn(
        'w-full px-3 py-2 text-left font-sans text-sm transition-colors',
        active ? 'bg-va-lightgray text-va-black' : 'text-va-darkgray hover:bg-va-lightgray-100'
      )}
    >
      {country.labelNl}
    </button>
  )
}

export function CountryCombobox({
  value,
  onChange,
  disabled = false,
  label,
  className,
}: CountryComboboxProps) {
  const listboxId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)

  const { pinned, all } = useMemo(() => buildEuCountryPickerSections(search), [search])

  const flatOptions = useMemo(() => {
    const items: EuCountry[] = [...pinned]
    if (all.length) items.push(...all)
    return items
  }, [pinned, all])

  useEffect(() => {
    if (!open) return
    searchRef.current?.focus()
    setActiveIndex(0)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  const selectCountry = (code: string) => {
    onChange(code)
    setOpen(false)
    setSearch('')
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        setOpen(true)
      }
      return
    }

    if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
      setSearch('')
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, Math.max(flatOptions.length - 1, 0)))
      return
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
      return
    }

    if (e.key === 'Enter' && flatOptions[activeIndex]) {
      e.preventDefault()
      selectCountry(flatOptions[activeIndex].code)
    }
  }

  let optionIndex = 0

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <label className="block font-sans text-sm font-medium text-va-black mb-1">{label}</label>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onKeyDown}
        className="w-full rounded-lg border border-va-lightgray-300 px-3 py-2 font-sans text-sm text-left focus:outline-none focus:border-va-black bg-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between gap-2"
      >
        <span>{getEuCountryLabel(value)}</span>
        <span className="text-va-gray text-xs" aria-hidden>
          ▾
        </span>
      </button>

      {open ? (
        <div
          id={listboxId}
          role="listbox"
          className="absolute z-50 mt-1 w-full rounded-lg border border-va-lightgray-300 bg-white shadow-lg overflow-hidden"
        >
          <div className="p-2 border-b border-va-lightgray-200">
            <input
              ref={searchRef}
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setActiveIndex(0)
              }}
              onKeyDown={onKeyDown}
              placeholder="Zoek land…"
              className="w-full rounded-md border border-va-lightgray-300 px-2 py-1.5 font-sans text-sm focus:outline-none focus:border-va-black"
              aria-label="Zoek land"
            />
          </div>
          <div className="max-h-60 overflow-y-auto py-1">
            {pinned.map((country) => {
              const idx = optionIndex++
              return (
                <CountryOption
                  key={`pinned-${country.code}`}
                  country={country}
                  active={idx === activeIndex}
                  selected={country.code === value.toUpperCase()}
                  onSelect={() => selectCountry(country.code)}
                />
              )
            })}
            {all.length ? (
              <>
                <div className="my-1 border-t border-va-lightgray-200" role="separator" />
                {all.map((country) => {
                  const idx = optionIndex++
                  return (
                    <CountryOption
                      key={`all-${country.code}`}
                      country={country}
                      active={idx === activeIndex}
                      selected={country.code === value.toUpperCase()}
                      onSelect={() => selectCountry(country.code)}
                    />
                  )
                })}
              </>
            ) : (
              <p className="px-3 py-2 font-sans text-xs text-va-gray">Geen landen gevonden</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
