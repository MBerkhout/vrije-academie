'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { PlpFilterState } from '@/app/(main)/ons-aanbod/_state/url'
import {
  resolvePlpFilterHref,
  usesPlpCanonicalFilterHref,
} from '@/app/(main)/ons-aanbod/_state/redirects'
import {
  isAgendaBasePath,
  resolveClearAllHref,
  resolveFilterSerialize,
} from '@/lib/filter-url-helpers'
import type { CategoryOption, TeacherOption } from '@/lib/cms/sanity-refs'
import type { EventFacets } from '@/lib/commerce/types'
import { PLP_PRODUCT_TYPES, productTypeListLabelFromSlug, type ProductTypePluralMap } from '@/lib/plp-product-types'
import {
  listingDeliveryOptions,
  VATHUIS_DELIVERY_TYPE,
} from '@/lib/plp-delivery-types'
import { cn } from '@/lib/utils'
import { PLP_BASE_PATH } from '@/lib/routes'
import { trackFilterChange } from '@/lib/analytics/events/ecommerce'
import { sortFacetsByCount } from '@/lib/commerce/city-facets'
import {
  listingPeriodControls,
  listingPeriodSelectionDates,
} from '@/lib/plp/listing-period-filter'

interface PlpFilterSidebarProps {
  filterState: PlpFilterState
  categories: CategoryOption[]
  teachers: TeacherOption[]
  facets?: EventFacets
  mobileOnly?: boolean
  /** Route to push to when filters change. Defaults to `PLP_BASE_PATH`. */
  basePath?: string
  /** Light (default) or dark styling for VA Thuis. */
  variant?: 'light' | 'dark'
  /** Category + docent filters only (VA Thuis catalog). */
  catalogOnly?: boolean
  /** Listing plurals for Soort activiteit (PDP stays singular). */
  productTypePlurals?: ProductTypePluralMap
  /** Extra selections not in PlpFilterState (e.g. agenda `date`) for the mobile badge. */
  extraActiveCount?: number
  /** Rendered first in the mobile drawer (e.g. agenda day picker). */
  leadingFilterGroup?: {
    title: string
    children: React.ReactNode
    activeCount?: number
    defaultOpen?: boolean
  }
}

type FilterVariant = 'light' | 'dark'

function filterTheme(variant: FilterVariant) {
  if (variant === 'dark') {
    return {
      groupBorder: 'border-va-darkgray-700',
      title: 'text-white',
      chevron: 'text-va-gray-400',
      label: 'text-white/90 hover:text-white',
      labelText: 'group-hover:underline underline-offset-2 decoration-va-black',
      count: 'text-va-gray-500',
      resetBtn: 'text-va-gray-400 border-va-darkgray-600 hover:bg-va-darkgray-800',
      mobileTrigger:
        'border-va-darkgray-600 text-white bg-va-darkgray-950 hover:bg-va-darkgray-900',
      drawer: 'bg-va-darkgray-950',
      drawerBorder: 'border-va-darkgray-700',
      drawerTitle: 'text-white',
      drawerClear: 'text-va-gray-400 hover:text-white',
      gradientFrom: 'from-va-darkgray-950',
      expandBtn: 'text-white hover:underline underline-offset-2 decoration-white',
      expandIcon: 'text-white transition-transform group-hover:translate-y-0.5',
      checkbox:
        'accent-va-yellow w-4 h-4 shrink-0 rounded border border-va-darkgray-500 transition-colors group-hover:border-white group-hover:ring-1 group-hover:ring-inset group-hover:ring-white/80',
    }
  }
  return {
    groupBorder: 'border-va-lightgray',
    title: 'text-va-black',
    chevron: 'text-va-gray',
    label: 'text-va-black hover:text-va-darkgray',
    labelText: 'group-hover:underline underline-offset-2 decoration-va-black',
    count: 'text-va-gray',
    resetBtn: 'text-va-gray border-va-lightgray hover:bg-va-lightgray',
    mobileTrigger:
      'border-va-black text-va-black bg-white hover:bg-va-lightgray-300 active:bg-va-lightgray',
    drawer: 'bg-white',
    drawerBorder: 'border-va-lightgray',
    drawerTitle: 'text-va-black',
    drawerClear: 'text-va-gray hover:text-va-black',
    gradientFrom: 'from-white',
    expandBtn: 'text-va-black hover:underline underline-offset-2 decoration-va-black',
    expandIcon: 'text-va-black transition-transform group-hover:translate-y-0.5',
    checkbox:
      'accent-va-yellow w-4 h-4 shrink-0 rounded border border-va-lightgray transition-colors group-hover:border-va-black group-hover:ring-1 group-hover:ring-inset group-hover:ring-va-black',
  }
}

function FilterGroupCollapsible({
  title,
  children,
  defaultOpen = true,
  activeCount = 0,
  showActiveCount = false,
  openWhenActive = false,
  largeTitle = false,
  variant = 'light',
}: {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
  activeCount?: number
  showActiveCount?: boolean
  /** Keep the group expanded while it has active filter values. */
  openWhenActive?: boolean
  largeTitle?: boolean
  variant?: FilterVariant
}) {
  const [open, setOpen] = useState(defaultOpen)
  const theme = filterTheme(variant)

  useEffect(() => {
    if (openWhenActive && activeCount > 0) {
      setOpen(true)
    }
  }, [openWhenActive, activeCount])
  return (
    <div className={cn('border-b py-4', theme.groupBorder)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'flex w-full items-center justify-between font-semibold',
          theme.title,
          largeTitle ? 'text-base' : 'text-sm',
        )}
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          {title}
          {showActiveCount && activeCount > 0 && (
            <span className="bg-va-yellow text-va-black text-xs font-bold px-1.5 py-0.5 min-w-[1.25rem] text-center">
              {activeCount}
            </span>
          )}
        </span>
        <span className={theme.chevron}>{open ? '−' : '+'}</span>
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
    <label className="group flex items-center gap-2 cursor-pointer text-sm text-va-black hover:text-va-darkgray">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className={filterTheme('light').checkbox}
      />
      <span className="group-hover:underline underline-offset-2 decoration-va-black">{label}</span>
    </label>
  )
}

/** Plaats / docent: first 5; Meer bekijken reveals up to ~10 rows then scroll. */
const SEARCHABLE_COLLAPSED_COUNT = 5
const SEARCHABLE_SCROLL_AT_COUNT = 10

/** Categorie: first 6 with fade; Meer tonen reveals the full list. */
const CATEGORY_COLLAPSED_COUNT = 6

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

function FilterSlidersIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M4 6h16M4 12h10M4 18h6" />
    </svg>
  )
}

function groupDefaultOpen(
  desktopDefault: boolean | undefined,
  collapseGroups: boolean,
  mobileDefaultOpen = false,
): boolean {
  if (collapseGroups) return mobileDefaultOpen
  return desktopDefault ?? true
}

function SearchableMultiSelectChecklist({
  options,
  selected,
  onToggle,
  placeholder = 'Zoeken…',
  collapsedCount = SEARCHABLE_COLLAPSED_COUNT,
  scrollAtCount = SEARCHABLE_SCROLL_AT_COUNT,
  expandLabel = 'Meer bekijken',
  variant = 'light',
}: {
  options: { value: string; label: string; count?: number }[]
  selected: string[]
  onToggle: (v: string) => void
  placeholder?: string
  collapsedCount?: number
  scrollAtCount?: number
  expandLabel?: string
  variant?: FilterVariant
}) {
  const theme = filterTheme(variant)
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState(false)

  const filtered = query.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options

  const hasSearch = query.trim().length > 0
  const needsCollapse = !hasSearch && filtered.length > collapsedCount
  const showFullList = hasSearch || expanded || !needsCollapse
  const visibleOptions =
    needsCollapse && !showFullList ? filtered.slice(0, collapsedCount) : filtered

  const needsScroll = showFullList && visibleOptions.length > scrollAtCount

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
          className={cn(
            'w-full pl-7 pr-2 py-1.5 text-sm border focus:outline-none focus:ring-2 focus:ring-va-yellow placeholder:text-va-gray',
            variant === 'dark'
              ? 'border-va-darkgray-600 bg-va-darkgray-900 text-white'
              : 'border-va-lightgray bg-white text-va-black',
          )}
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className={cn(
              'absolute right-2 top-1/2 -translate-y-1/2 text-base leading-none',
              variant === 'dark' ? 'text-va-gray-400 hover:text-white' : 'text-va-gray hover:text-va-black',
            )}
          >
            ×
          </button>
        )}
      </div>
      {filtered.length === 0 ? (
        <p className="text-xs text-va-gray py-1">Geen resultaten</p>
      ) : (
        <div>
          <div
            className={cn(
              'relative',
              needsScroll && 'max-h-[17.5rem] overflow-y-auto pr-0.5',
              needsCollapse && !showFullList && 'max-h-[9.25rem] overflow-hidden',
            )}
          >
            <MultiSelectChecklist
              options={visibleOptions}
              selected={selected}
              onToggle={onToggle}
              variant={variant}
            />
            {needsCollapse && !showFullList && (
              <div
                className={cn(
                  'pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t to-transparent',
                  theme.gradientFrom,
                  variant === 'dark' ? 'via-va-darkgray-950/95' : 'via-white/95',
                )}
                aria-hidden
              />
            )}
          </div>
          {needsCollapse && !showFullList && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className={cn(
                'group mt-1 flex w-full items-center justify-center gap-1.5 py-1 text-sm font-medium transition-colors',
                theme.expandBtn,
              )}
            >
              {expandLabel}
              <ChevronDownIcon className={cn('w-4 h-4 shrink-0', theme.expandIcon)} />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function MultiSelectChecklist({
  options,
  selected,
  onToggle,
  variant = 'light',
}: {
  options: { value: string; label: string; count?: number }[]
  selected: string[]
  onToggle: (v: string) => void
  variant?: FilterVariant
}) {
  const theme = filterTheme(variant)
  return (
    <div className="space-y-2">
      {options.map((opt) => (
        <label
          key={opt.value}
          className={cn('group flex items-center justify-between gap-2 cursor-pointer text-sm', theme.label)}
        >
          <span className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selected.includes(opt.value)}
              onChange={() => onToggle(opt.value)}
              className={theme.checkbox}
            />
            <span className={theme.labelText}>{opt.label}</span>
          </span>
          {opt.count !== undefined && (
            <span className={cn('text-xs', theme.count)}>{opt.count}</span>
          )}
        </label>
      ))}
    </div>
  )
}

function CollapsibleMultiSelectChecklist({
  options,
  selected,
  onToggle,
  collapsedCount,
  expandLabel = 'Meer tonen',
  variant = 'light',
}: {
  options: { value: string; label: string; count?: number }[]
  selected: string[]
  onToggle: (v: string) => void
  collapsedCount: number
  expandLabel?: string
  variant?: FilterVariant
}) {
  const theme = filterTheme(variant)
  const needsCollapse = options.length > collapsedCount
  const [expanded, setExpanded] = useState(() => {
    if (!needsCollapse) return true
    return selected.some((value) => {
      const index = options.findIndex((opt) => opt.value === value)
      return index >= collapsedCount
    })
  })

  const showFullList = expanded || !needsCollapse
  const visibleOptions = showFullList
    ? options
    : options.slice(0, collapsedCount)

  return (
    <div>
      <div
        className={cn(
          'relative',
          needsCollapse && !expanded && 'max-h-[10.5rem] overflow-hidden',
        )}
      >
        <MultiSelectChecklist
          options={visibleOptions}
          selected={selected}
          onToggle={onToggle}
          variant={variant}
        />
        {needsCollapse && !expanded && (
          <div
            className={cn(
              'pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t to-transparent',
              theme.gradientFrom,
              variant === 'dark' ? 'via-va-darkgray-950/95' : 'via-white/95',
            )}
            aria-hidden
          />
        )}
      </div>
      {needsCollapse && !expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className={cn(
            'group mt-1 flex w-full items-center justify-center gap-1.5 py-1 text-sm font-medium transition-colors',
            theme.expandBtn,
          )}
        >
          {expandLabel}
          <ChevronDownIcon className={cn('w-4 h-4 shrink-0', theme.expandIcon)} />
        </button>
      )}
    </div>
  )
}

const SEASON_LABELS = {
  voorjaar: 'Voorjaar',
  najaar: 'Najaar',
} as const

function PeriodeFilter({
  periodStart,
  periodEnd,
  onChange,
  monthCounts,
}: {
  periodStart?: string
  periodEnd?: string
  onChange: (start?: string, end?: string) => void
  monthCounts?: Record<string, number>
}) {
  const { seasons, months } = listingPeriodControls({
    monthCounts,
    periodStart,
    periodEnd,
  })
  if (seasons.length === 0 && months.length === 0) return null

  function selectMonth(month: number, selected: boolean) {
    if (selected) {
      onChange(undefined, undefined)
      return
    }
    const range = listingPeriodSelectionDates({ kind: 'month', month })
    onChange(range.start, range.end)
  }

  function selectSeason(season: 'voorjaar' | 'najaar', selected: boolean) {
    if (selected) {
      onChange(undefined, undefined)
      return
    }
    const range = listingPeriodSelectionDates({ kind: 'season', season })
    onChange(range.start, range.end)
  }

  return (
    <div className="space-y-3">
      {seasons.length > 0 && (
        <div className="flex gap-2">
          {seasons.map((season) => (
            <button
              key={season.key}
              type="button"
              onClick={() => selectSeason(season.key, season.selected)}
              className={cn(
                'flex-1 text-sm py-1.5 border transition-colors font-medium',
                season.selected
                  ? 'bg-va-yellow border-va-yellow text-va-black'
                  : 'border-va-lightgray text-va-darkgray hover:border-va-darkgray hover:bg-va-lightgray/50',
              )}
            >
              {SEASON_LABELS[season.key]}
            </button>
          ))}
        </div>
      )}
      {months.length > 0 && (
        <div className="grid grid-cols-7 gap-1">
          {months.map((month) => (
            <button
              key={month.value}
              type="button"
              onClick={() => selectMonth(month.value, month.selected)}
              className={cn(
                'text-xs py-1.5 border transition-colors text-center leading-none',
                month.selected
                  ? 'bg-va-yellow border-va-yellow text-va-black font-semibold'
                  : 'border-va-lightgray text-va-darkgray hover:border-va-darkgray hover:bg-va-lightgray/50',
              )}
            >
              {month.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const DAY_PARTS = [
  { value: 'ochtend', label: 'Ochtend' },
  { value: 'middag', label: 'Middag' },
  { value: 'avond', label: 'Avond' },
]


export function PlpFilterSidebar({
  filterState,
  categories,
  teachers,
  facets,
  mobileOnly = false,
  basePath = PLP_BASE_PATH,
  variant = 'light',
  catalogOnly = false,
  productTypePlurals,
  extraActiveCount = 0,
  leadingFilterGroup,
}: PlpFilterSidebarProps) {
  const router = useRouter()
  const serialize = resolveFilterSerialize(basePath)
  const theme = filterTheme(variant)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerSession, setDrawerSession] = useState(0)

  useEffect(() => {
    if (!drawerOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [drawerOpen])

  function openMobileDrawer() {
    setDrawerSession((n) => n + 1)
    setDrawerOpen(true)
  }

  const activeCount =
    (catalogOnly
      ? (filterState.categories?.length ?? 0) + (filterState.teachers?.length ?? 0)
      : (filterState.categories?.length ?? 0) +
        (filterState.productTypes?.length ?? 0) +
        (filterState.teachers?.length ?? 0) +
        (filterState.cities?.length ?? 0) +
        (filterState.deliveryTypes?.length ?? 0) +
        (filterState.dayParts?.length ?? 0) +
        (filterState.periodStart || filterState.periodEnd ? 1 : 0)) + extraActiveCount

  function applyFilter(newState: PlpFilterState, meta?: { filterName: string; filterValue: string }) {
    if (meta) {
      trackFilterChange({
        scope: 'aanbod_overzicht',
        filterName: meta.filterName,
        filterValue: meta.filterValue,
        resultsCount: 0,
      })
    }
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
    const filterNameMap: Partial<Record<keyof PlpFilterState, string>> = {
      categories: 'vakgebied',
      productTypes: 'categorie',
      teachers: 'docent',
      cities: 'plaats',
      deliveryTypes: 'modaliteit',
      dayParts: 'dagdeel',
      recordTypes: 'type',
    }
    applyFilter(
      { ...filterState, [key]: next },
      { filterName: filterNameMap[key] ?? String(key), filterValue: value }
    )
  }

  function clearAll() {
    router.push(resolveClearAllHref(basePath))
  }

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

  const citiesFromFacets = (facets?.cities ?? [])
    .map((c) => ({
      value: c.slug,
      label: c.label ?? c.slug,
      count: c.count,
    }))
    .filter((opt) => isVisible(opt.value, filterState.cities ?? [], opt.count))

  const monthCounts = Object.fromEntries(
    (facets?.months ?? []).map((m) => [m.slug, m.count]),
  )
  const hasPeriodSelection = Boolean(filterState.periodStart || filterState.periodEnd)
  const hasPeriodOptions =
    hasPeriodSelection || (facets?.months ?? []).some((m) => m.count > 0)

  const deliveryOptions = listingDeliveryOptions(!isAgendaBasePath(basePath))
    .map((opt) => ({ value: opt.value, label: opt.label, count: facetCount.delivery(opt.value) }))
    .filter((opt) =>
      opt.value === VATHUIS_DELIVERY_TYPE
        ? true
        : isVisible(opt.value, filterState.deliveryTypes ?? [], opt.count),
    )

  const categoryOptions = categories
    .map((c) => ({ value: c.slug, label: c.label, count: facetCount.category(c.slug) }))
    .filter((opt) => isVisible(opt.value, filterState.categories ?? [], opt.count))

  const productTypeOptions = PLP_PRODUCT_TYPES.map((t) => ({
    value: t.slug,
    label: productTypeListLabelFromSlug(t.slug, productTypePlurals),
    count: facetCount.productType(t.slug),
  })).filter((opt) => isVisible(opt.value, filterState.productTypes ?? [], opt.count))

  const teacherOptions = sortFacetsByCount(
    teachers
      .map((t) => ({ value: t.slug, label: t.name, count: facetCount.teacher(t.slug) }))
      .filter((opt) => isVisible(opt.value, filterState.teachers ?? [], opt.count)),
  )

  const dayPartOptions = DAY_PARTS
    .map((opt) => ({ ...opt, count: facetCount.dayPart(opt.value) }))
    .filter((opt) => isVisible(opt.value, filterState.dayParts ?? [], opt.count))

  function renderFilterGroups(collapseGroups: boolean, showDesktopReset: boolean) {
    const groupBadge = collapseGroups
    const largeTitle = collapseGroups

    return (
      <div className="space-y-0">
        {leadingFilterGroup && collapseGroups && (
          <FilterGroupCollapsible
            title={leadingFilterGroup.title}
            defaultOpen={groupDefaultOpen(
              leadingFilterGroup.defaultOpen ?? true,
              collapseGroups,
              leadingFilterGroup.defaultOpen ?? true,
            )}
            openWhenActive
            showActiveCount={groupBadge}
            largeTitle={largeTitle}
            activeCount={leadingFilterGroup.activeCount ?? 0}
            variant={variant}
          >
            {leadingFilterGroup.children}
          </FilterGroupCollapsible>
        )}

        {!catalogOnly && deliveryOptions.length > 0 && (
          <FilterGroupCollapsible
            title="Beschikbaarheid"
            defaultOpen={groupDefaultOpen(true, collapseGroups, true)}
            showActiveCount={groupBadge}
            largeTitle={largeTitle}
            activeCount={filterState.deliveryTypes?.length ?? 0}
            variant={variant}
          >
            <MultiSelectChecklist
              options={deliveryOptions}
              selected={filterState.deliveryTypes ?? []}
              onToggle={(v) => toggleArray('deliveryTypes', v)}
              variant={variant}
            />
          </FilterGroupCollapsible>
        )}

        {!catalogOnly && productTypeOptions.length > 0 && (
          <FilterGroupCollapsible
            title="Soort activiteit"
            defaultOpen={groupDefaultOpen(true, collapseGroups)}
            showActiveCount={groupBadge}
            largeTitle={largeTitle}
            activeCount={filterState.productTypes?.length ?? 0}
            variant={variant}
          >
            <MultiSelectChecklist
              options={productTypeOptions}
              selected={filterState.productTypes ?? []}
              onToggle={(v) => toggleArray('productTypes', v)}
              variant={variant}
            />
          </FilterGroupCollapsible>
        )}

        {categoryOptions.length > 0 && (
          <FilterGroupCollapsible
            title="Categorie"
            defaultOpen={
              catalogOnly ? true : groupDefaultOpen(undefined, collapseGroups, true)
            }
            showActiveCount={groupBadge}
            largeTitle={largeTitle}
            activeCount={filterState.categories?.length ?? 0}
            variant={variant}
          >
            <CollapsibleMultiSelectChecklist
              options={categoryOptions}
              selected={filterState.categories ?? []}
              onToggle={(v) => toggleArray('categories', v)}
              collapsedCount={CATEGORY_COLLAPSED_COUNT}
              variant={variant}
            />
          </FilterGroupCollapsible>
        )}

        {teacherOptions.length > 0 && (
          <FilterGroupCollapsible
            title="Docent"
            defaultOpen={
              (filterState.teachers?.length ?? 0) > 0
                ? true
                : catalogOnly
                  ? true
                  : groupDefaultOpen(false, collapseGroups, true)
            }
            openWhenActive
            showActiveCount={groupBadge}
            largeTitle={largeTitle}
            activeCount={filterState.teachers?.length ?? 0}
            variant={variant}
          >
            <SearchableMultiSelectChecklist
              options={teacherOptions}
              selected={filterState.teachers ?? []}
              onToggle={(v) => toggleArray('teachers', v)}
              placeholder="Zoek op docent…"
              variant={variant}
            />
          </FilterGroupCollapsible>
        )}

        {!catalogOnly && citiesFromFacets.length > 0 && (
          <FilterGroupCollapsible
            title="Plaats"
            defaultOpen={groupDefaultOpen(true, collapseGroups, true)}
            showActiveCount={groupBadge}
            largeTitle={largeTitle}
            activeCount={filterState.cities?.length ?? 0}
          >
            <SearchableMultiSelectChecklist
              options={citiesFromFacets}
              selected={filterState.cities ?? []}
              onToggle={(v) => toggleArray('cities', v)}
              placeholder="Zoek op plaats…"
              variant={variant}
            />
          </FilterGroupCollapsible>
        )}

        {!catalogOnly && dayPartOptions.length > 0 && (
          <FilterGroupCollapsible
            title="Dagdeel"
            defaultOpen={groupDefaultOpen(false, collapseGroups)}
            showActiveCount={groupBadge}
            largeTitle={largeTitle}
            activeCount={filterState.dayParts?.length ?? 0}
            variant={variant}
          >
            <MultiSelectChecklist
              options={dayPartOptions}
              selected={filterState.dayParts ?? []}
              onToggle={(v) => toggleArray('dayParts', v)}
              variant={variant}
            />
          </FilterGroupCollapsible>
        )}

        {!catalogOnly && hasPeriodOptions && (
        <FilterGroupCollapsible
          title="Periode"
          defaultOpen={groupDefaultOpen(false, collapseGroups)}
          showActiveCount={groupBadge}
          largeTitle={largeTitle}
          activeCount={filterState.periodStart || filterState.periodEnd ? 1 : 0}
          variant={variant}
        >
          <PeriodeFilter
            periodStart={filterState.periodStart}
            periodEnd={filterState.periodEnd}
            monthCounts={monthCounts}
            onChange={(start, end) =>
              applyFilter({ ...filterState, periodStart: start, periodEnd: end })
            }
          />
        </FilterGroupCollapsible>
        )}

        {showDesktopReset && (
          <div className="pt-4">
            <button
              type="button"
              onClick={clearAll}
              className={cn('w-full text-sm border py-2 transition-colors', theme.resetBtn)}
            >
              {catalogOnly ? 'Wis filters' : 'Reset'}
            </button>
          </div>
        )}
      </div>
    )
  }

  if (mobileOnly) {
    return (
      <>
        <button
          type="button"
          onClick={openMobileDrawer}
          className={cn('flex items-center gap-2 border-2 px-4 py-2.5 text-sm font-semibold shadow-sm transition-colors', theme.mobileTrigger)}
        >
          <FilterSlidersIcon className="h-4 w-4 shrink-0" />
          Filter
          {activeCount > 0 && (
            <span className="bg-va-yellow text-va-black text-xs font-bold px-1.5 py-0.5 min-w-[1.25rem] text-center">
              {activeCount}
            </span>
          )}
        </button>

        {drawerOpen && (
          <div
            className={cn('fixed inset-0 z-50 flex flex-col', theme.drawer)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="plp-mobile-filters-title"
          >
            <div className={cn('flex shrink-0 items-center justify-between gap-4 border-b px-4 py-4', theme.drawerBorder)}>
              <span id="plp-mobile-filters-title" className={cn('font-semibold', theme.drawerTitle)}>
                Filters
              </span>
              <button
                type="button"
                onClick={clearAll}
                className={cn('shrink-0 text-sm underline transition-colors', theme.drawerClear)}
              >
                Wis alle filters
              </button>
            </div>

            <div key={drawerSession} className="min-h-0 flex-1 overflow-y-auto px-4">
              {renderFilterGroups(true, false)}
            </div>

            <div className={cn('shrink-0 border-t px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]', theme.drawerBorder, theme.drawer)}>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="w-full bg-va-yellow text-va-black text-sm font-semibold py-3 hover:bg-va-yellow-600 active:bg-va-yellow-700 transition-colors"
              >
                Filters sluiten
              </button>
            </div>
          </div>
        )}
      </>
    )
  }

  return (
    <div className={cn(variant === 'dark' && 'rounded-lg bg-va-darkgray-950 p-4')}>
      {renderFilterGroups(false, true)}
    </div>
  )
}
