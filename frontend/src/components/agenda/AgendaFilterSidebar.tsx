'use client'

import { useRouter } from 'next/navigation'
import { PlpFilterSidebar } from '@/components/plp/PlpFilterSidebar'
import { AgendaDayPicker } from './AgendaDayPicker'
import type { AgendaFilterState } from '@/app/(main)/agenda/_state/url'
import { serializeFilterState } from '@/app/(main)/agenda/_state/url'
import type { PlpFilterState } from '@/app/(main)/ons-aanbod/_state/url'
import type { CategoryOption, TeacherOption } from '@/lib/cms/sanity-refs'
import type { EventFacets } from '@/lib/commerce/types'
import type { ProductTypePluralMap } from '@/lib/plp-product-types'

interface AgendaFilterSidebarProps {
  filterState: AgendaFilterState
  categories: CategoryOption[]
  teachers: TeacherOption[]
  facets?: EventFacets
  mobileOnly?: boolean
  productTypePlurals?: ProductTypePluralMap
}

/**
 * Agenda-specific filter sidebar: calendar day picker on top (desktop) or as
 * the first open **Agenda** group in the mobile drawer, plus the shared
 * Ons-aanbod filter sidebar below (reused with `basePath="/agenda"` and
 * the agenda serializer that knows about the extra `date` field).
 * VAthuis is omitted from Beschikbaarheid — on-demand has no agenda rows.
 */
export function AgendaFilterSidebar({
  filterState,
  categories,
  teachers,
  facets,
  mobileOnly = false,
  productTypePlurals,
}: AgendaFilterSidebarProps) {
  const router = useRouter()

  function setDate(date: string | undefined) {
    const next: AgendaFilterState = { ...filterState, date }
    const params = serializeFilterState(next)
    params.delete('page')
    router.push(`/agenda?${params.toString()}`)
  }

  const dateSelected = Boolean(filterState.date)
  const sidebar = (
    <PlpFilterSidebar
      // Structurally compatible; agenda's extra `date` field is preserved by the serializer.
      filterState={filterState as unknown as PlpFilterState}
      categories={categories}
      teachers={teachers}
      facets={facets}
      basePath="/agenda"
      mobileOnly={mobileOnly}
      productTypePlurals={productTypePlurals}
      extraActiveCount={dateSelected ? 1 : 0}
      leadingFilterGroup={
        mobileOnly
          ? {
              title: 'Agenda',
              defaultOpen: true,
              activeCount: dateSelected ? 1 : 0,
              children: <AgendaDayPicker value={filterState.date} onChange={setDate} />,
            }
          : undefined
      }
    />
  )

  if (mobileOnly) {
    return sidebar
  }

  return (
    <div className="space-y-4">
      <div className="border border-va-lightgray rounded-md p-3 bg-white">
        <AgendaDayPicker value={filterState.date} onChange={setDate} />
      </div>
      {sidebar}
    </div>
  )
}
