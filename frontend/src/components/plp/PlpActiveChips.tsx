'use client'

import { useRouter } from 'next/navigation'
import type { PlpFilterState } from '@/app/(main)/ons-aanbod/_state/url'
import {
  resolvePlpFilterHref,
  isCategoryScopedPlpPath,
  isProductTypeScopedPlpPath,
  usesPlpCanonicalFilterHref,
} from '@/app/(main)/ons-aanbod/_state/redirects'
import { resolveFilterRemove, resolveFilterSerialize } from '@/lib/filter-url-helpers'
import type { CategoryOption, TeacherOption } from '@/lib/cms/sanity-refs'
import { productTypeLabelFromSlug } from '@/lib/plp-product-types'
import { cn } from '@/lib/utils'
import { PLP_BASE_PATH } from '@/lib/routes'

interface PlpActiveChipsProps {
  filterState: PlpFilterState
  categories: CategoryOption[]
  teachers: TeacherOption[]
  className?: string
  basePath?: string
  /** Extra chips to render for fields not in PlpFilterState (e.g. Agenda `date`).
   *  Removal uses the provided `removeFilter` with the key cast loosely. */
  extraChips?: { key: string; label: string }[]
}

type ChipDef = {
  key: keyof PlpFilterState
  value?: string
  label: string
}

export function PlpActiveChips({
  filterState,
  categories,
  teachers,
  className,
  basePath = PLP_BASE_PATH,
  extraChips = [],
}: PlpActiveChipsProps) {
  const router = useRouter()
  const serialize = resolveFilterSerialize(basePath)
  const removeFilter = resolveFilterRemove(basePath)

  const chips: ChipDef[] = []

  if (filterState.q) {
    chips.push({ key: 'q', label: `"${filterState.q}"` })
  }
  for (const slug of filterState.categories ?? []) {
    const cat = categories.find((c) => c.slug === slug)
    chips.push({ key: 'categories', value: slug, label: cat?.label ?? slug })
  }
  for (const slug of filterState.teachers ?? []) {
    const teacher = teachers.find((t) => t.slug === slug)
    chips.push({ key: 'teachers', value: slug, label: teacher?.name ?? slug })
  }
  for (const v of filterState.cities ?? []) {
    chips.push({ key: 'cities', value: v, label: v })
  }
  for (const v of filterState.productTypes ?? []) {
    chips.push({ key: 'productTypes', value: v, label: productTypeLabelFromSlug(v) })
  }
  for (const v of filterState.recordTypes ?? []) {
    chips.push({ key: 'recordTypes', value: v, label: v })
  }
  for (const v of filterState.deliveryTypes ?? []) {
    chips.push({ key: 'deliveryTypes', value: v, label: v === 'online' ? 'Online' : v === 'offline' ? 'Op locatie' : 'Pre-recorded' })
  }
  for (const v of filterState.dayParts ?? []) {
    chips.push({ key: 'dayParts', value: v, label: v.charAt(0).toUpperCase() + v.slice(1) })
  }
  if (filterState.periodStart || filterState.periodEnd) {
    const year = filterState.periodStart
      ? filterState.periodStart.slice(0, 4)
      : filterState.periodEnd?.slice(0, 4)
    const startMonth = filterState.periodStart
      ? parseInt(filterState.periodStart.slice(5, 7))
      : null
    const endMonth = filterState.periodEnd
      ? parseInt(filterState.periodEnd.slice(5, 7))
      : null
    const MONTH_NAMES = ['Jan','Feb','Mrt','Apr','Mei','Jun','Jul','Aug','Sep','Okt','Nov','Dec']
    let periodLabel = 'Periode'
    if (filterState.periodStart === `${year}-01-01` && filterState.periodEnd === `${year}-06-30`) {
      periodLabel = `Voorjaar ${year}`
    } else if (filterState.periodStart === `${year}-07-01` && filterState.periodEnd === `${year}-12-31`) {
      periodLabel = `Najaar ${year}`
    } else if (startMonth !== null && startMonth === endMonth) {
      periodLabel = `${MONTH_NAMES[startMonth - 1]} ${year}`
    }
    chips.push({ key: 'periodStart', label: periodLabel })
  }

  if (!chips.length && !extraChips.length) return null

  function navigateFilterState(newState: PlpFilterState) {
    if (usesPlpCanonicalFilterHref(basePath)) {
      router.push(resolvePlpFilterHref(newState))
      return
    }
    const params = serialize(newState)
    router.push(`${basePath}?${params.toString()}`)
  }

  function removeChip(chip: ChipDef) {
    let newState = removeFilter(filterState, chip.key, chip.value)
    if (chip.key === 'periodStart' || chip.key === 'periodEnd') {
      newState = { ...newState, periodStart: undefined, periodEnd: undefined }
    }
    navigateFilterState(newState)
  }

  function clearAll() {
    if (isCategoryScopedPlpPath(basePath) || isProductTypeScopedPlpPath(basePath)) {
      router.push(basePath)
      return
    }
    router.push(PLP_BASE_PATH)
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {chips.map((chip, i) => (
        <span
          key={`${chip.key}-${chip.value ?? i}`}
          className="inline-flex items-center gap-1 bg-va-yellow/20 text-va-black text-xs font-medium px-2.5 py-1 border border-va-yellow/40"
        >
          {chip.label}
          <button
            type="button"
            onClick={() => removeChip(chip)}
            aria-label={`Verwijder filter ${chip.label}`}
            className="ml-0.5 text-va-darkgray hover:text-va-black text-sm leading-none"
          >
            ×
          </button>
        </span>
      ))}
      {extraChips.map((chip) => (
        <span
          key={`extra-${chip.key}`}
          className="inline-flex items-center gap-1 bg-va-yellow/20 text-va-black text-xs font-medium px-2.5 py-1 border border-va-yellow/40"
        >
          {chip.label}
          <button
            type="button"
            onClick={() => {
              const newState = removeFilter(filterState, chip.key as keyof PlpFilterState)
              navigateFilterState(newState)
            }}
            aria-label={`Verwijder filter ${chip.label}`}
            className="ml-0.5 text-va-darkgray hover:text-va-black text-sm leading-none"
          >
            ×
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={clearAll}
        className="text-xs text-va-gray underline hover:text-va-black transition-colors"
      >
        Wis alle filters
      </button>
    </div>
  )
}
