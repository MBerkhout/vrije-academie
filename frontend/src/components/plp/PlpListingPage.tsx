import { commerceClient } from '@/lib/commerce'
import { cmsClient } from '@/lib/cms/server'
import { getPlpPage, getCategoriesForFilter, getTeachersForFilter } from '@/lib/cms/sanity-refs'
import { CONTAINER_CLASS } from '@/lib/cms'
import type { PlpFilterState } from '@/app/(main)/ons-aanbod/_state/url'
import { PAGE_SIZE } from '@/app/(main)/ons-aanbod/_state/url'

import { PlpBreadcrumbs } from '@/components/plp/PlpBreadcrumbs'
import { PlpBanner } from '@/components/plp/PlpBanner'
import { PlpHeader } from '@/components/plp/PlpHeader'
import { PlpTabs } from '@/components/plp/PlpTabs'
import { PlpLiveListing } from '@/components/plp/PlpLiveListing'
import { JsonLd } from '@/components/common/JsonLd'
import { buildBreadcrumbListJsonLd, buildCollectionPageJsonLd, buildItemListJsonLd } from '@/lib/json-ld'
import { eventIsFullySoldOut } from '@/lib/event-status-presentation'
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
  /** Plain-text intro below the page title (e.g. category description). */
  introText?: string
}

export async function PlpListingPage({
  pageTitle,
  basePath,
  filterState,
  scopedCrumb,
  activeTabPath = PLP_BASE_PATH,
  introText,
}: PlpListingPageProps) {
  const sort = filterState.sort ?? (filterState.q ? 'relevance' : 'order')

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
            image: event.thumbnail ?? event.image_urls?.[0] ?? undefined,
            priceFromCents: event.price_from,
            inStock: !eventIsFullySoldOut(event),
          })),
        })
      : null

  const collectionPageJsonLd = buildCollectionPageJsonLd({
    name: pageTitle,
    description: introText,
    url: basePath,
  })

  return (
    <>
      <JsonLd data={breadcrumbJsonLd} />
      <JsonLd data={collectionPageJsonLd} />
      {itemListJsonLd && <JsonLd data={itemListJsonLd} />}

      <div className="pb-16">
        <div className={CONTAINER_CLASS}>
          <PlpBreadcrumbs crumbs={breadcrumbCrumbs} className="pt-3 pb-1 md:pt-4 md:pb-2" />
        </div>

        {plpData?.banner?.enabled && <PlpBanner banner={plpData.banner} />}

        <div className={`${CONTAINER_CLASS} mt-1 md:mt-2`}>
          <PlpHeader title={pageTitle} intro={plpData?.intro} introText={introText} />
        </div>

        <div className={`${CONTAINER_CLASS} mt-2 md:mt-4`}>
          <PlpTabs tabs={tabs} activePath={activeTabPath} />
        </div>

        <div className={CONTAINER_CLASS}>
          <PlpLiveListing
            basePath={basePath}
            filterState={filterState}
            initialEvents={events}
            initialCount={count}
            facets={facets}
            categories={categories}
            teachers={teachers}
            stockThreshold={stockThreshold}
            searchPlaceholder={
              plpCopy?.searchPlaceholder ?? 'Zoek naar een cursus, onderwerp of docent…'
            }
            emptyStateHeading={plpCopy?.emptyStateHeading}
            emptyStateSubtext={plpCopy?.emptyStateSubtext}
            loadMoreLabel={plpCopy?.loadMoreLabel}
            loadError={eventsResult === null}
          />
        </div>
      </div>
    </>
  )
}
