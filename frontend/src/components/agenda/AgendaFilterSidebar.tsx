'use client'

import { useRouter } from 'next/navigation'
import { PlpFilterSidebar } from '@/components/plp/PlpFilterSidebar'
import { AgendaDayPicker } from './AgendaDayPicker'
import type { AgendaFilterState } from '@/app/(main)/agenda/_state/url'
import { serializeFilterState } from '@/app/(main)/agenda/_state/url'
import type { PlpFilterState } from '@/app/(main)/ons-aanbod/_state/url'
import type { CategoryOption, TeacherOption } from '@/lib/cms/sanity-refs'
import type { EventFacets } from '@/lib/commerce/types'

interface AgendaFilterSidebarProps {
  filterState: AgendaFilterState
  categories: CategoryOption[]
  teachers: TeacherOption[]
  facets?: EventFacets
  mobileOnly?: boolean
}

/**
 * Agenda-specific filter sidebar: calendar day picker on top + shared
 * Ons-aanbod filter sidebar below (reused with `basePath="/agenda"` and
 * the agenda serializer that knows about the extra `date` field).
 */
export function AgendaFilterSidebar({
  filterState,
  categories,
  teachers,
  facets,
  mobileOnly = false,
}: AgendaFilterSidebarProps) {
  const router = useRouter()

  function setDate(date: string | undefined) {
    const next: AgendaFilterState = { ...filterState, date }
    const params = serializeFilterState(next)
    params.delete('page')
    router.push(`/agenda?${params.toString()}`)
  }

  const sidebar = (
    <PlpFilterSidebar
      // Structurally compatible; agenda's extra `date` field is preserved by the serializer.
      filterState={filterState as unknown as PlpFilterState}
      categories={categories}
      teachers={teachers}
      facets={facets}
      basePath="/agenda"
      mobileOnly={mobileOnly}
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
