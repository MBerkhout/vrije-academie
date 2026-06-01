'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { PlpFilterState } from '@/app/(main)/ons-aanbod/_state/url'
import {
  resolvePlpFilterHref,
  isCategoryScopedPlpPath,
  isProductTypeScopedPlpPath,
  usesPlpCanonicalFilterHref,
} from '@/app/(main)/ons-aanbod/_state/redirects'
import { resolveFilterSerialize } from '@/lib/filter-url-helpers'
import type { CategoryOption, TeacherOption } from '@/lib/cms/sanity-refs'
import type { EventFacets } from '@/lib/commerce/types'
import { PLP_PRODUCT_TYPES } from '@/lib/plp-product-types'
import { cn } from '@/lib/utils'
import { PLP_BASE_PATH } from '@/lib/routes'

interface PlpFilterSidebarProps {
  filterState: PlpFilterState
  categories: CategoryOption[]
  teachers: TeacherOption[]
  facets?: EventFacets
  mobileOnly?: boolean
  /** Route to push to when filters change. Defaults to `PLP_BASE_PATH`. */
  basePath?: string
}

function FilterGroupCollapsible({
  title,
  children,
  defaultOpen = true,
}: {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-va-lightgray py-4">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between text-sm font-semibold text-va-black"
        aria-expanded={open}
      >
        {title}
        <span className="text-va-gray">{open ? '−' : '+'}</span>
      </button>
      {open && <div className="mt-3 space-y-2">{children}</div>}
    </div>
  )
}

function ToggleCheckbox({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer text-sm text-va-black hover:text-va-darkgray">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-va-yellow w-4 h-4 rounded"
      />
      {label}
    </label>
  )
}

/** Plaats: first 5; Meer bekijken reveals up to ~10 rows then scroll. */
const PLAATS_COLLAPSED_COUNT = 5
const PLAATS_SCROLL_AT_COUNT = 10

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

function PlaatsSearchableMultiSelectChecklist({
  options,
  selected,
  onToggle,
  placeholder = 'Zoeken…',
}: {
  options: { value: string; label: string; count?: number }[]
  selected: string[]
  onToggle: (v: string) => void
  placeholder?: string
}) {
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState(false)

  const filtered = query.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options

  const hasSearch = query.trim().length > 0
  const needsCollapse = !hasSearch && filtered.length > PLAATS_COLLAPSED_COUNT
  const showFullList = hasSearch || expanded || !needsCollapse
  const visibleOptions =
    needsCollapse && !showFullList ? filtered.slice(0, PLAATS_COLLAPSED_COUNT) : filtered

  const needsScroll =
    showFullList && visibleOptions.length > PLAATS_SCROLL_AT_COUNT

  return (
    <div className="space-y-2">
      <div className="relative">
        <svg
          className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-va-gray pointer-events-none"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
          }}
          placeholder={placeholder}
          className="w-full pl-7 pr-2 py-1.5 text-sm border border-va-lightgray focus:outline-none focus:ring-2 focus:ring-va-yellow placeholder:text-va-gray"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-va-gray hover:text-va-black text-base leading-none"
          >
            ×
          </button>
        )}
      </div>
      {filtered.length === 0 ? (
        <p className="text-xs text-va-gray py-1">Geen resultaten</p>
      ) : (
        <>
          <div
            className={cn(
              needsScroll && 'max-h-[17.5rem] overflow-y-auto pr-0.5',
            )}
          >
            <MultiSelectChecklist
              options={visibleOptions}
              selected={selected}
              onToggle={onToggle}
            />
          </div>
          {needsCollapse && !showFullList && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="flex w-full items-center justify-center gap-1.5 bg-white py-2.5 text-sm font-medium text-va-black border-t border-va-lightgray hover:bg-va-lightgray/30 transition-colors"
            >
              Meer bekijken
              <ChevronDownIcon className="w-4 h-4 shrink-0 text-va-black" />
            </button>
          )}
        </>
      )}
    </div>
  )
}

function MultiSelectChecklist({
  options,
  selected,
  onToggle,
}: {
  options: { value: string; label: string; count?: number }[]
  selected: string[]
  onToggle: (v: string) => void
}) {
  return (
    <div className="space-y-2">
      {options.map((opt) => (
        <label
          key={opt.value}
          className="flex items-center justify-between gap-2 cursor-pointer text-sm text-va-black hover:text-va-darkgray"
        >
          <span className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selected.includes(opt.value)}
              onChange={() => onToggle(opt.value)}
              className="accent-va-yellow w-4 h-4 rounded"
            />
            {opt.label}
          </span>
          {opt.count !== undefined && (
            <span className="text-xs text-va-gray">{opt.count}</span>
          )}
        </label>
      ))}
    </div>
  )
}

const MONTHS = [
  { value: 1, label: 'Jan' },
  { value: 2, label: 'Feb' },
  { value: 3, label: 'Mrt' },
  { value: 4, label: 'Apr' },
  { value: 5, label: 'Mei' },
  { value: 6, label: 'Jun' },
  { value: 7, label: 'Jul' },
  { value: 8, label: 'Aug' },
  { value: 9, label: 'Sep' },
  { value: 10, label: 'Okt' },
  { value: 11, label: 'Nov' },
  { value: 12, label: 'Dec' },
]

const VOORJAAR_MONTHS = [1, 2, 3, 4, 5, 6]
const NAJAAR_MONTHS = [7, 8, 9, 10, 11, 12]

function pad(n: number) {
  return n.toString().padStart(2, '0')
}

function lastDayOfMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate()
}

function PeriodeFilter({
  periodStart,
  periodEnd,
  onChange,
}: {
  periodStart?: string
  periodEnd?: string
  onChange: (start?: string, end?: string) => void
}) {
  const year = periodStart ? parseInt(periodStart.slice(0, 4)) : new Date().getFullYear()
  const startMonth = periodStart ? parseInt(periodStart.slice(5, 7)) : null
  const endMonth = periodEnd ? parseInt(periodEnd.slice(5, 7)) : null
  const isSingleMonth = startMonth !== null && startMonth === endMonth

  const isVoorjaar =
    periodStart === `${year}-01-01` && periodEnd === `${year}-06-30`
  const isNajaar =
    periodStart === `${year}-07-01` && periodEnd === `${year}-12-31`

  function selectMonth(m: number) {
    if (isSingleMonth && startMonth === m) {
      onChange(undefined, undefined)
      return
    }
    onChange(
      `${year}-${pad(m)}-01`,
      `${year}-${pad(m)}-${pad(lastDayOfMonth(year, m))}`,
    )
  }

  function selectSeason(season: 'voorjaar' | 'najaar') {
    if (season === 'voorjaar') {
      if (isVoorjaar) { onChange(undefined, undefined); return }
      onChange(`${year}-01-01`, `${year}-06-30`)
    } else {
      if (isNajaar) { onChange(undefined, undefined); return }
      onChange(`${year}-07-01`, `${year}-12-31`)
    }
  }

  function isMonthActive(m: number) {
    if (isSingleMonth && startMonth === m) return true
    if (isVoorjaar && VOORJAAR_MONTHS.includes(m)) return true
    if (isNajaar && NAJAAR_MONTHS.includes(m)) return true
    return false
  }

  return (
    <div className="space-y-3">
      {/* Season shortcuts */}
      <div className="flex gap-2">
        {(
          [
            { key: 'voorjaar', label: 'Voorjaar', active: isVoorjaar },
            { key: 'najaar', label: 'Najaar', active: isNajaar },
          ] as const
        ).map(({ key, label, active }) => (
          <button
            key={key}
            type="button"
            onClick={() => selectSeason(key)}
            className={cn(
              'flex-1 text-sm py-1.5 border transition-colors font-medium',
              active
                ? 'bg-va-yellow border-va-yellow text-va-black'
                : 'border-va-lightgray text-va-darkgray hover:border-va-darkgray hover:bg-va-lightgray/50',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Month grid – 7 columns so Jan–Jul top row, Aug–Dec bottom row */}
      <div className="grid grid-cols-7 gap-1">
        {MONTHS.map((m) => (
          <button
            key={m.value}
            type="button"
            onClick={() => selectMonth(m.value)}
            className={cn(
              'text-xs py-1.5 border transition-colors text-center leading-none',
              isMonthActive(m.value)
                ? 'bg-va-yellow border-va-yellow text-va-black font-semibold'
                : 'border-va-lightgray text-va-darkgray hover:border-va-darkgray hover:bg-va-lightgray/50',
            )}
          >
            {m.label}
          </button>
        ))}
      </div>
    </div>
  )
}

const DAY_PARTS = [
  { value: 'ochtend', label: 'Ochtend' },
  { value: 'middag', label: 'Middag' },
  { value: 'avond', label: 'Avond' },
]

const DELIVERY_OPTIONS = [
  { value: 'online', label: 'Online' },
  { value: 'offline', label: 'Op locatie' },
  { value: 'pre_recorded', label: 'Pre-recorded' },
]

export function PlpFilterSidebar({
  filterState,
  categories,
  teachers,
  facets,
  mobileOnly = false,
  basePath = PLP_BASE_PATH,
}: PlpFilterSidebarProps) {
  const router = useRouter()
  const serialize = resolveFilterSerialize(basePath)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const activeCount =
    (filterState.categories?.length ?? 0) +
    (filterState.productTypes?.length ?? 0) +
    (filterState.teachers?.length ?? 0) +
    (filterState.cities?.length ?? 0) +
    (filterState.deliveryTypes?.length ?? 0) +
    (filterState.dayParts?.length ?? 0) +
    (filterState.periodStart || filterState.periodEnd ? 1 : 0)

  function applyFilter(newState: PlpFilterState) {
    if (usesPlpCanonicalFilterHref(basePath)) {
      router.push(resolvePlpFilterHref(newState))
      return
    }
    const params = serialize(newState)
    params.delete('page')
    router.push(`${basePath}?${params.toString()}`)
  }

  function toggleArray(key: keyof PlpFilterState, value: string) {
    const current = (filterState[key] as string[] | undefined) ?? []
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value]
    applyFilter({ ...filterState, [key]: next })
  }

  function clearAll() {
    if (isCategoryScopedPlpPath(basePath) || isProductTypeScopedPlpPath(basePath)) {
      router.push(basePath)
      return
    }
    router.push(PLP_BASE_PATH)
  }

  const citiesFromFacets = facets?.cities?.map((c) => ({
    value: c.slug,
    label: c.label ?? c.slug,
    count: c.count,
  })) ?? []

  // Build facet count lookups
  const facetCount = {
    delivery: (slug: string) => facets?.delivery_type?.find((d) => d.slug === slug)?.count ?? 0,
    category: (slug: string) => facets?.categories?.find((fc) => fc.slug === slug)?.count ?? 0,
    productType: (slug: string) => facets?.product_type?.find((f) => f.slug === slug)?.count ?? 0,
    teacher: (slug: string) => facets?.teachers?.find((fd) => fd.slug === slug)?.count ?? 0,
    dayPart: (slug: string) => facets?.day_part?.find((d) => d.slug === slug)?.count ?? 0,
  }

  // Keep an option if it has results OR is currently active (so it can be deselected)
  const isVisible = (slug: string, active: string[], count: number) =>
    count > 0 || active.includes(slug)

  const deliveryOptions = DELIVERY_OPTIONS
    .map((opt) => ({ ...opt, count: facetCount.delivery(opt.value) }))
    .filter((opt) => isVisible(opt.value, filterState.deliveryTypes ?? [], opt.count))

  const categoryOptions = categories
    .map((c) => ({ value: c.slug, label: c.label, count: facetCount.category(c.slug) }))
    .filter((opt) => isVisible(opt.value, filterState.categories ?? [], opt.count))

  const productTypeOptions = PLP_PRODUCT_TYPES.map((t) => ({
    value: t.slug,
    label: t.label,
    count: facetCount.productType(t.slug),
  })).filter((opt) => isVisible(opt.value, filterState.productTypes ?? [], opt.count))

  const teacherOptions = teachers
    .map((t) => ({ value: t.slug, label: t.name, count: facetCount.teacher(t.slug) }))
    .filter((opt) => isVisible(opt.value, filterState.teachers ?? [], opt.count))

  const dayPartOptions = DAY_PARTS
    .map((opt) => ({ ...opt, count: facetCount.dayPart(opt.value) }))
    .filter((opt) => isVisible(opt.value, filterState.dayParts ?? [], opt.count))

  const sidebarContent = (
    <div className="space-y-0">
      {/* Delivery type toggles */}
      {deliveryOptions.length > 0 && (
        <FilterGroupCollapsible title="Beschikbaarheid" defaultOpen>
          <MultiSelectChecklist
            options={deliveryOptions}
            selected={filterState.deliveryTypes ?? []}
            onToggle={(v) => toggleArray('deliveryTypes', v)}
          />
        </FilterGroupCollapsible>
      )}

      {/* Product type (Reis, Studiedag, …) */}
      {productTypeOptions.length > 0 && (
        <FilterGroupCollapsible title="Soort activiteit" defaultOpen>
          <MultiSelectChecklist
            options={productTypeOptions}
            selected={filterState.productTypes ?? []}
            onToggle={(v) => toggleArray('productTypes', v)}
          />
        </FilterGroupCollapsible>
      )}

      {/* Categories */}
      {categoryOptions.length > 0 && (
        <FilterGroupCollapsible title="Categorie">
          <MultiSelectChecklist
            options={categoryOptions}
            selected={filterState.categories ?? []}
            onToggle={(v) => toggleArray('categories', v)}
          />
        </FilterGroupCollapsible>
      )}

      {/* Docenten */}
      {teacherOptions.length > 0 && (
        <FilterGroupCollapsible title="Docent" defaultOpen={false}>
          <MultiSelectChecklist
            options={teacherOptions}
            selected={filterState.teachers ?? []}
            onToggle={(v) => toggleArray('teachers', v)}
          />
        </FilterGroupCollapsible>
      )}

      {/* City */}
      {citiesFromFacets.length > 0 && (
        <FilterGroupCollapsible title="Plaats" defaultOpen={false}>
          <PlaatsSearchableMultiSelectChecklist
            options={citiesFromFacets}
            selected={filterState.cities ?? []}
            onToggle={(v) => toggleArray('cities', v)}
            placeholder="Zoek op plaats…"
          />
        </FilterGroupCollapsible>
      )}

      {/* Dag deel */}
      {dayPartOptions.length > 0 && (
        <FilterGroupCollapsible title="Dagdeel" defaultOpen={false}>
          <MultiSelectChecklist
            options={dayPartOptions}
            selected={filterState.dayParts ?? []}
            onToggle={(v) => toggleArray('dayParts', v)}
          />
        </FilterGroupCollapsible>
      )}

      {/* Periode */}
      <FilterGroupCollapsible title="Periode" defaultOpen={false}>
        <PeriodeFilter
          periodStart={filterState.periodStart}
          periodEnd={filterState.periodEnd}
          onChange={(start, end) =>
            applyFilter({ ...filterState, periodStart: start, periodEnd: end })
          }
        />
      </FilterGroupCollapsible>

      {/* Reset */}
      <div className="pt-4">
        <button
          type="button"
          onClick={clearAll}
          className="w-full text-sm text-va-gray border border-va-lightgray py-2 hover:bg-va-lightgray transition-colors"
        >
          Reset
        </button>
      </div>
    </div>
  )

  if (mobileOnly) {
    return (
      <>
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="flex items-center gap-2 border border-va-lightgray px-4 py-2 text-sm font-medium text-va-black bg-white"
        >
          Filter
          {activeCount > 0 && (
            <span className="bg-va-yellow text-va-black text-xs font-bold px-1.5 py-0.5">
              {activeCount}
            </span>
          )}
        </button>

        {drawerOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/40 z-40"
              onClick={() => setDrawerOpen(false)}
            />
            {/* Drawer */}
            <div className="fixed inset-y-0 left-0 z-50 w-80 max-w-full bg-white shadow-xl flex flex-col">
              <div className="flex items-center justify-between px-4 py-4 border-b border-va-lightgray">
                <span className="font-semibold text-va-black">Filters</span>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Sluit filters"
                  className="text-va-gray hover:text-va-black text-xl leading-none"
                >
                  ×
                </button>
              </div>
              <div className="overflow-y-auto flex-1 px-4">{sidebarContent}</div>
            </div>
          </>
        )}
      </>
    )
  }

  return <div>{sidebarContent}</div>
}
