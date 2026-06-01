import { Suspense } from 'react'
import { commerceClient } from '@/lib/commerce'
import { cmsClient } from '@/lib/cms/server'
import { getPlpPage, getCategoriesForFilter, getTeachersForFilter } from '@/lib/cms/sanity-refs'
import { CONTAINER_CLASS } from '@/lib/cms'
import type { PlpFilterState } from '@/app/(main)/ons-aanbod/_state/url'
import { hasActiveFilters, PAGE_SIZE } from '@/app/(main)/ons-aanbod/_state/url'

import { PlpBreadcrumbs } from '@/components/plp/PlpBreadcrumbs'
import { PlpBanner } from '@/components/plp/PlpBanner'
import { PlpHeader } from '@/components/plp/PlpHeader'
import { PlpTabs } from '@/components/plp/PlpTabs'
import { PlpQuickSearchTrigger } from '@/components/plp/PlpQuickSearchTrigger'
import { PlpFilterSidebar } from '@/components/plp/PlpFilterSidebar'
import { PlpActiveChips } from '@/components/plp/PlpActiveChips'
import { PlpSortSelect } from '@/components/plp/PlpSortSelect'
import {
  PlpInfiniteResultsCount,
  PlpInfiniteResultsGrid,
  PlpInfiniteResultsLoadMore,
  PlpInfiniteResultsProvider,
} from '@/components/plp/PlpInfiniteResults'
import { PlpEmptyState } from '@/components/plp/PlpEmptyState'
import { JsonLd } from '@/components/common/JsonLd'
import { buildBreadcrumbListJsonLd, buildItemListJsonLd } from '@/lib/json-ld'
import { PLP_BASE_PATH, plpProductPath } from '@/lib/routes'

export type PlpBreadcrumbCrumb = { label: string; href: string }

export type PlpListingPageProps = {
  pageTitle: string
  basePath: string
  filterState: PlpFilterState
  /** Extra crumbs after "Ons aanbod" (e.g. category or city). */
  scopedCrumb?: PlpBreadcrumbCrumb
  /** Tab highlight path; defaults to `PLP_BASE_PATH`. */
  activeTabPath?: string
}

export async function PlpListingPage({
  pageTitle,
  basePath,
  filterState,
  scopedCrumb,
  activeTabPath = PLP_BASE_PATH,
}: PlpListingPageProps) {
  const sort = filterState.sort ?? (filterState.q ? 'relevance' : 'start_date')

  const [plpData, settings, categories, teachers, eventsResult] = await Promise.all([
    getPlpPage(),
    cmsClient.getGeneralSettings(),
    getCategoriesForFilter(),
    getTeachersForFilter(),
    commerceClient
      .getEventsPaginated({
        ...filterState,
        sort,
        limit: PAGE_SIZE,
        offset: 0,
      })
      .catch(() => null),
  ])

  const events = eventsResult?.events ?? []
  const count = eventsResult?.count ?? 0
  const facets = eventsResult?.facets

  const tabs = plpData?.tabs ?? [
    { label: 'Ons aanbod', href: PLP_BASE_PATH },
    { label: 'Agenda', href: '/agenda' },
  ]

  const stockThreshold = settings?.pdp?.lowStockThreshold ?? 5
  const plpCopy = settings?.plp
  const hasFilters = hasActiveFilters(filterState)
  const breadcrumbCrumbs: PlpBreadcrumbCrumb[] = [
    { label: 'Home', href: '/' },
    { label: 'Ons aanbod', href: PLP_BASE_PATH },
    ...(scopedCrumb ? [scopedCrumb] : []),
  ]

  const breadcrumbJsonLd = buildBreadcrumbListJsonLd(
    breadcrumbCrumbs.map((c) => ({ name: c.label, item: c.href }))
  )

  const itemListJsonLd = events.length
      ? buildItemListJsonLd({
          name: pageTitle,
          numberOfItems: count,
          items: events.slice(0, 24).map((event) => ({
            path: plpProductPath(event.handle),
            name: event.title,
          })),
        })
      : null

  return (
    <>
      <JsonLd data={breadcrumbJsonLd} />
      {itemListJsonLd && <JsonLd data={itemListJsonLd} />}

      <div className="pb-16">
        <div className={CONTAINER_CLASS}>
          <PlpBreadcrumbs crumbs={breadcrumbCrumbs} />
        </div>

        {plpData?.banner?.enabled && <PlpBanner banner={plpData.banner} />}

        <div className={`${CONTAINER_CLASS} mt-6`}>
          <PlpHeader title={pageTitle} intro={plpData?.intro} />
        </div>

        <div className={`${CONTAINER_CLASS} mt-4`}>
          <PlpTabs tabs={tabs} activePath={activeTabPath} />
        </div>

        <div className={`${CONTAINER_CLASS} mt-6`}>
          <PlpQuickSearchTrigger
            defaultValue={filterState.q ?? ''}
            placeholder={plpCopy?.searchPlaceholder ?? 'Zoek naar een cursus, onderwerp of docent…'}
            popularSearches={settings?.header?.popularSearches}
            basePath={basePath}
          />
        </div>

        <div className={`${CONTAINER_CLASS} mt-8`}>
          <div className="flex gap-8 items-start">
            <aside className="hidden lg:block w-72 shrink-0">
              <PlpFilterSidebar
                filterState={filterState}
                categories={categories}
                teachers={teachers}
                facets={facets}
                basePath={basePath}
              />
            </aside>

            <div className="flex-1 min-w-0">
              {eventsResult === null ? (
                <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  Kon de activiteiten niet laden. Probeer het opnieuw.
                </div>
              ) : events.length === 0 ? (
                <>
                  <div className="flex flex-col gap-3 mb-6">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm text-va-darkgray">0 activiteiten gevonden</span>
                      <PlpSortSelect
                        currentSort={sort}
                        hasQuery={!!filterState.q}
                        basePath={basePath}
                      />
                    </div>
                    {hasFilters && (
                      <PlpActiveChips
                        filterState={filterState}
                        categories={categories}
                        teachers={teachers}
                        basePath={basePath}
                      />
                    )}
                  </div>
                  <div className="lg:hidden mb-4">
                    <PlpFilterSidebar
                      filterState={filterState}
                      categories={categories}
                      teachers={teachers}
                      facets={facets}
                      mobileOnly
                      basePath={basePath}
                    />
                  </div>
                  <PlpEmptyState
                    heading={plpCopy?.emptyStateHeading ?? 'Geen activiteiten gevonden.'}
                    subtext={
                      plpCopy?.emptyStateSubtext ??
                      'Probeer een andere zoekopdracht of pas je filters aan.'
                    }
                    hasFilters={hasFilters}
                  />
                </>
              ) : (
                <PlpInfiniteResultsProvider
                  initialEvents={events}
                  totalCount={count}
                  filterState={filterState}
                  sort={sort}
                  pageSize={PAGE_SIZE}
                >
                  <div className="flex flex-col gap-3 mb-6">
                    <div className="flex items-center justify-between gap-4">
                      <PlpInfiniteResultsCount className="text-sm text-va-darkgray" />
                      <PlpSortSelect
                        currentSort={sort}
                        hasQuery={!!filterState.q}
                        basePath={basePath}
                      />
                    </div>
                    {hasFilters && (
                      <PlpActiveChips
                        filterState={filterState}
                        categories={categories}
                        teachers={teachers}
                        basePath={basePath}
                      />
                    )}
                  </div>

                  <div className="lg:hidden mb-4">
                    <PlpFilterSidebar
                      filterState={filterState}
                      categories={categories}
                      teachers={teachers}
                      facets={facets}
                      mobileOnly
                      basePath={basePath}
                    />
                  </div>

                  <Suspense>
                    <PlpInfiniteResultsGrid
                      stockThreshold={stockThreshold}
                      filterState={filterState}
                    />
                  </Suspense>

                  <PlpInfiniteResultsLoadMore
                    loadMoreLabel={plpCopy?.loadMoreLabel ?? 'Laad meer activiteiten'}
                  />
                </PlpInfiniteResultsProvider>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
