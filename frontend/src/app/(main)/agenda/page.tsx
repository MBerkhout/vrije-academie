import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { commerceClient } from '@/lib/commerce'
import { cmsClient } from '@/lib/cms/server'
import { getPlpPage, getCategoriesForFilter, getTeachersForFilter } from '@/lib/cms/sanity-refs'
import { CONTAINER_CLASS } from '@/lib/cms'
import { parseFilterState, PAGE_SIZE, serializeFilterState } from './_state/url'

import { PlpBreadcrumbs } from '@/components/plp/PlpBreadcrumbs'
import { PlpBanner } from '@/components/plp/PlpBanner'
import { PlpHeader } from '@/components/plp/PlpHeader'
import { PlpTabs } from '@/components/plp/PlpTabs'
import { PlpSearchBar } from '@/components/plp/PlpSearchBar'
import { PlpActiveChips } from '@/components/plp/PlpActiveChips'
import { PlpSortSelect } from '@/components/plp/PlpSortSelect'
import {
  AgendaInfiniteResultsCount,
  AgendaInfiniteResultsList,
  AgendaInfiniteResultsLoadMore,
  AgendaInfiniteResultsProvider,
} from '@/components/agenda/AgendaInfiniteResults'
import { AgendaFilterSidebar } from '@/components/agenda/AgendaFilterSidebar'
import { PlpEmptyState } from '@/components/plp/PlpEmptyState'
import type { PlpFilterState } from '@/app/(main)/ons-aanbod/_state/url'
import { PLP_BASE_PATH } from '@/lib/routes'
import { formatDateFromYmd } from '@/lib/locale-format'

export const dynamic = 'force-dynamic'

interface AgendaPageProps {
  searchParams: Promise<Record<string, string | string[]>>
}

const AGENDA_SORT_OPTIONS = [
  { value: 'start_date', label: 'Eerstvolgende eerst' },
  { value: 'start_date_desc', label: 'Laatste eerst' },
  { value: 'price_asc', label: 'Prijs: laag–hoog' },
  { value: 'price_desc', label: 'Prijs: hoog–laag' },
]

export async function generateMetadata(): Promise<Metadata> {
  const siteName = 'Vrije Academie'
  return {
    title: `Agenda – ${siteName}`,
    description: `Bekijk alle aankomende activiteiten van ${siteName} op datum.`,
  }
}

export default async function AgendaPage({ searchParams }: AgendaPageProps) {
  const params = await searchParams
  const filterState = parseFilterState(params)
  const pageParam = Number((params.page as string) ?? '1')
  if (!isNaN(pageParam) && pageParam > 1) {
    const query = serializeFilterState(filterState).toString()
    redirect(query ? `/agenda?${query}` : '/agenda')
  }

  const sort: 'start_date' | 'start_date_desc' | 'price_asc' | 'price_desc' =
    (filterState.sort as any) ?? 'start_date'

  const [plpData, settings, categories, teachers, result] = await Promise.all([
    getPlpPage(),
    cmsClient.getGeneralSettings(),
    getCategoriesForFilter(),
    getTeachersForFilter(),
    commerceClient
      .getAgendaPaginated({
        ...filterState,
        sort,
        limit: PAGE_SIZE,
        offset: 0,
      })
      .catch(() => null),
  ])

  const items = result?.items ?? []
  const count = result?.count ?? 0
  const facets = result?.facets

  const tabs = plpData?.tabs ?? [
    { label: 'Ons aanbod', href: PLP_BASE_PATH },
    { label: 'Agenda', href: '/agenda' },
  ]

  const plpCopy = settings?.plp
  const pageTitle = 'Agenda'

  const hasFilters = !!(
    filterState.q ||
    filterState.categories?.length ||
    filterState.teachers?.length ||
    filterState.recordTypes?.length ||
    filterState.deliveryTypes?.length ||
    filterState.cities?.length ||
    filterState.dayParts?.length ||
    filterState.periodStart ||
    filterState.periodEnd ||
    filterState.date
  )

  // Extra chip for the Agenda-specific `date` filter (rendered + removed by PlpActiveChips)
  const extraChips = filterState.date
    ? [{ key: 'date', label: formatDateFromYmd(filterState.date) }]
    : []

  return (
    <div className="pb-16">
      {/* Breadcrumbs */}
      <div className={CONTAINER_CLASS}>
        <PlpBreadcrumbs
          crumbs={[
            { label: 'Home', href: '/' },
            { label: 'Agenda', href: '/agenda' },
          ]}
        />
      </div>

      {/* Promotional banner (shared with Ons aanbod) */}
      {plpData?.banner?.enabled && <PlpBanner banner={plpData.banner} />}

      {/* Page header */}
      <div className={`${CONTAINER_CLASS} mt-6`}>
        <PlpHeader title={pageTitle} intro={plpData?.intro} />
      </div>

      {/* Tabs */}
      <div className={`${CONTAINER_CLASS} mt-4`}>
        <PlpTabs tabs={tabs} activePath="/agenda" />
      </div>

      {/* Search bar */}
      <div className={`${CONTAINER_CLASS} mt-6`}>
        <PlpSearchBar
          defaultValue={filterState.q ?? ''}
          placeholder={plpCopy?.searchPlaceholder ?? 'Zoek naar een cursus, onderwerp of docent…'}
          submitLabel={plpCopy?.searchSubmitLabel ?? 'Zoek'}
          basePath="/agenda"
        />
      </div>

      {/* Main content: sidebar + results */}
      <div className={`${CONTAINER_CLASS} mt-8`}>
        <div className="flex gap-8 items-start">
          {/* Filter sidebar */}
          <aside className="hidden lg:block w-72 shrink-0">
            <AgendaFilterSidebar
              filterState={filterState}
              categories={categories}
              teachers={teachers}
              facets={facets}
            />
          </aside>

          {/* Results area */}
          <div className="flex-1 min-w-0">
            {result === null ? (
              <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                Kon de agenda niet laden. Probeer het opnieuw.
              </div>
            ) : items.length === 0 ? (
              <>
                <div className="flex flex-col gap-3 mb-6">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-va-darkgray">0 activiteiten gevonden</span>
                    <PlpSortSelect
                      currentSort={sort}
                      hasQuery={!!filterState.q}
                      basePath="/agenda"
                      options={AGENDA_SORT_OPTIONS}
                    />
                  </div>
                  {hasFilters && (
                    <PlpActiveChips
                      filterState={filterState as unknown as PlpFilterState}
                      categories={categories}
                      teachers={teachers}
                      cityOptions={facets?.cities}
                      basePath="/agenda"
                      extraChips={extraChips}
                    />
                  )}
                </div>
                <div className="lg:hidden mb-4">
                  <AgendaFilterSidebar
                    filterState={filterState}
                    categories={categories}
                    teachers={teachers}
                    facets={facets}
                    mobileOnly
                  />
                </div>
                <PlpEmptyState
                  heading={plpCopy?.emptyStateHeading ?? 'Geen activiteiten gevonden.'}
                  subtext={
                    plpCopy?.emptyStateSubtext ??
                    'Probeer een andere zoekopdracht of pas je filters aan.'
                  }
                  hasFilters={hasFilters}
                  basePath="/agenda"
                />
              </>
            ) : (
              <AgendaInfiniteResultsProvider
                initialItems={items}
                totalCount={count}
                filterState={filterState}
                sort={sort}
                pageSize={PAGE_SIZE}
              >
                <div className="flex flex-col gap-3 mb-6">
                  <div className="flex items-center justify-between gap-4">
                    <AgendaInfiniteResultsCount className="text-sm text-va-darkgray" />
                    <PlpSortSelect
                      currentSort={sort}
                      hasQuery={!!filterState.q}
                      basePath="/agenda"
                      options={AGENDA_SORT_OPTIONS}
                    />
                  </div>
                  {hasFilters && (
                    <PlpActiveChips
                      filterState={filterState as unknown as PlpFilterState}
                      categories={categories}
                      teachers={teachers}
                      cityOptions={facets?.cities}
                      basePath="/agenda"
                      extraChips={extraChips}
                    />
                  )}
                </div>

                <div className="lg:hidden mb-4">
                  <AgendaFilterSidebar
                    filterState={filterState}
                    categories={categories}
                    teachers={teachers}
                    facets={facets}
                    mobileOnly
                  />
                </div>

                <Suspense>
                  <AgendaInfiniteResultsList />
                </Suspense>

                <AgendaInfiniteResultsLoadMore
                  loadMoreLabel={plpCopy?.loadMoreLabel ?? 'Laad meer activiteiten'}
                />
              </AgendaInfiniteResultsProvider>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
