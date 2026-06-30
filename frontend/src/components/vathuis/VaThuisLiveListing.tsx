'use client'

import { Suspense, type ReactNode } from 'react'
import type { EventCard, EventFacets } from '@/lib/commerce/types'
import {
  hasActiveVathuisFilters,
  serializeVathuisFilterState,
  VATHUIS_PAGE_SIZE,
  type VathuisFilterState,
} from '@/app/(main)/va-thuis/_state/url'
import type { CategoryOption, TeacherOption } from '@/lib/cms/sanity-refs'
import { PlpSearchBar } from '@/components/plp/PlpSearchBar'
import { PlpSortSelect } from '@/components/plp/PlpSortSelect'
import { Spinner } from '@/components/ui'
import { useLiveListingSearch } from '@/components/plp/useLiveListingSearch'
import { PlpFilterSidebar } from '@/components/plp/PlpFilterSidebar'
import type { PlpFilterState } from '@/app/(main)/ons-aanbod/_state/url'
import {
  VaThuisInfiniteResultsCount,
  VaThuisInfiniteResultsGrid,
  VaThuisInfiniteResultsLoadMore,
  VaThuisInfiniteResultsProvider,
} from '@/components/vathuis/VaThuisInfiniteResults'
import { VATHUIS_CATALOG_PATH } from '@/lib/routes'

const VATHUIS_SORT_OPTIONS = [
  { value: 'order', label: 'Aanbevolen' },
  { value: 'newest', label: 'Nieuwste eerst' },
  { value: 'relevance', label: 'Meest relevant' },
  { value: 'price_asc', label: 'Prijs: laag–hoog' },
  { value: 'price_desc', label: 'Prijs: hoog–laag' },
]

type VaThuisLiveListingProps = {
  basePath: string
  filterState: VathuisFilterState
  initialItems: EventCard[]
  initialCount: number
  facets?: EventFacets
  categories: CategoryOption[]
  teachers: TeacherOption[]
  stockThreshold: number
  searchPlaceholder?: string
  emptyStateHeading?: string
  emptyStateSubtext?: string
  loadMoreLabel?: string
  loadError?: boolean
}

function vathuisSortForQuery(query: string, filterState: VathuisFilterState): string {
  if (query.trim()) return 'relevance'
  return filterState.sort ?? 'order'
}

function mergeVathuisQuery(filterState: VathuisFilterState, q: string | undefined): VathuisFilterState {
  return { ...filterState, q }
}

function VaThuisActiveChips({
  filterState,
  categories,
  teachers,
  basePath,
}: {
  filterState: VathuisFilterState
  categories: CategoryOption[]
  teachers: TeacherOption[]
  basePath: string
}) {
  const chips: { key: string; label: string; remove: VathuisFilterState }[] = []

  for (const slug of filterState.categories ?? []) {
    const cat = categories.find((c) => c.slug === slug)
    chips.push({
      key: `cat-${slug}`,
      label: cat?.label ?? slug,
      remove: {
        ...filterState,
        categories: filterState.categories?.filter((s) => s !== slug),
      },
    })
  }

  for (const slug of filterState.teachers ?? []) {
    const teacher = teachers.find((t) => t.slug === slug)
    chips.push({
      key: `doc-${slug}`,
      label: teacher?.name ?? slug,
      remove: {
        ...filterState,
        teachers: filterState.teachers?.filter((s) => s !== slug),
      },
    })
  }

  if (!chips.length) return null

  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((chip) => {
        const query = serializeVathuisFilterState({
          ...chip.remove,
          categories: chip.remove.categories?.length ? chip.remove.categories : undefined,
          teachers: chip.remove.teachers?.length ? chip.remove.teachers : undefined,
        }).toString()
        const href = query ? `${basePath}?${query}` : basePath
        return (
          <a
            key={chip.key}
            href={href}
            className="inline-flex items-center gap-1 rounded-full bg-va-darkgray-800 px-3 py-1 text-xs text-white hover:bg-va-darkgray-700"
          >
            {chip.label}
            <span aria-hidden>×</span>
          </a>
        )
      })}
    </div>
  )
}

function toPlpFilterState(state: VathuisFilterState): PlpFilterState {
  return {
    q: state.q,
    sort: state.sort,
    categories: state.categories,
    teachers: state.teachers,
  }
}

export function VaThuisLiveListing({
  basePath,
  filterState,
  initialItems,
  initialCount,
  facets,
  categories,
  teachers,
  stockThreshold,
  searchPlaceholder,
  emptyStateHeading,
  emptyStateSubtext,
  loadMoreLabel,
  loadError = false,
}: VaThuisLiveListingProps) {
  const {
    query,
    setQuery,
    items,
    count,
    liveFilterState,
    sort,
    searching,
    searchError,
  } = useLiveListingSearch<EventCard, VathuisFilterState>({
    basePath,
    serverFilterState: filterState,
    initialItems,
    initialCount,
    fetchPath: '/api/plp/vathuis',
    listKey: 'items',
    pageSize: VATHUIS_PAGE_SIZE,
    serialize: serializeVathuisFilterState,
    getSort: vathuisSortForQuery,
    mergeQuery: mergeVathuisQuery,
  })

  const hasFilters = hasActiveVathuisFilters(liveFilterState)
  const plpFilterState = toPlpFilterState(liveFilterState)

  function ResultsToolbar({ showCount }: { showCount: boolean }) {
    return (
      <div className="flex flex-col gap-3 mb-6">
        <div className="flex items-center justify-between gap-4">
          {searching ? (
            <span className="inline-flex items-center gap-2 text-sm text-va-gray-300">
              <Spinner size="sm" />
              Zoeken…
            </span>
          ) : showCount ? (
            <VaThuisInfiniteResultsCount className="text-sm text-va-gray-300" />
          ) : (
            <span className="text-sm text-va-gray-300">0 colleges gevonden</span>
          )}
          <PlpSortSelect
            currentSort={sort}
            hasQuery={!!liveFilterState.q}
            basePath={basePath}
            options={VATHUIS_SORT_OPTIONS}
            className="border-va-darkgray-600 bg-va-darkgray-900 text-white"
          />
        </div>
        {searchError ? <p className="text-sm text-red-400">{searchError}</p> : null}
        {hasFilters && (
          <VaThuisActiveChips
            filterState={liveFilterState}
            categories={categories}
            teachers={teachers}
            basePath={basePath}
          />
        )}
      </div>
    )
  }

  let resultsBody: ReactNode

  if (loadError) {
    resultsBody = (
      <div className="rounded-md border border-red-800 bg-red-950/50 p-4 text-sm text-red-300">
        Kon de colleges niet laden. Probeer het opnieuw.
      </div>
    )
  } else if (items.length === 0 && !searching) {
    resultsBody = (
      <>
        <ResultsToolbar showCount={false} />
        <div className="lg:hidden mb-4">
          <PlpFilterSidebar
            filterState={plpFilterState}
            categories={categories}
            teachers={teachers}
            facets={facets}
            mobileOnly
            basePath={basePath}
            variant="dark"
            catalogOnly
          />
        </div>
        <div className="py-16 text-center">
          <h2 className="text-lg font-semibold text-white">
            {emptyStateHeading ?? 'Geen colleges gevonden.'}
          </h2>
          <p className="mt-2 text-sm text-va-gray-400">
            {emptyStateSubtext ?? 'Probeer een andere zoekopdracht of pas je filters aan.'}
          </p>
        </div>
      </>
    )
  } else {
    resultsBody = (
      <VaThuisInfiniteResultsProvider
        initialEvents={items}
        totalCount={count}
        filterState={liveFilterState}
        sort={sort}
        pageSize={VATHUIS_PAGE_SIZE}
      >
        <ResultsToolbar showCount />
        <div className="lg:hidden mb-4">
          <PlpFilterSidebar
            filterState={plpFilterState}
            categories={categories}
            teachers={teachers}
            facets={facets}
            mobileOnly
            basePath={basePath}
            variant="dark"
            catalogOnly
          />
        </div>
        <div className={searching ? 'opacity-60 pointer-events-none transition-opacity' : undefined}>
          <Suspense>
            <VaThuisInfiniteResultsGrid stockThreshold={stockThreshold} />
          </Suspense>
        </div>
        <VaThuisInfiniteResultsLoadMore loadMoreLabel={loadMoreLabel} />
      </VaThuisInfiniteResultsProvider>
    )
  }

  return (
    <>
      <div className="mt-6">
        <PlpSearchBar
          value={query}
          onChange={setQuery}
          placeholder={searchPlaceholder ?? 'Zoek naar een college, onderwerp of docent…'}
          basePath={basePath}
          live
          className="[&_input]:border-va-darkgray-600 [&_input]:bg-va-darkgray-900 [&_input]:text-white [&_input]:placeholder:text-va-gray-500"
        />
      </div>

      <div className="mt-8">
        <div className="flex gap-8 items-start">
          <aside className="hidden lg:block w-72 shrink-0">
            <PlpFilterSidebar
              filterState={plpFilterState}
              categories={categories}
              teachers={teachers}
              facets={facets}
              basePath={basePath}
              variant="dark"
              catalogOnly
            />
          </aside>
          <div className="flex-1 min-w-0">{resultsBody}</div>
        </div>
      </div>
    </>
  )
}

export { VATHUIS_CATALOG_PATH }
