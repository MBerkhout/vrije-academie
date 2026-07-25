import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { commerceClient } from '@/lib/commerce'
import { cmsClient } from '@/lib/cms/server'
import { getPlpPage, getCategoriesForFilter, getTeachersForFilter } from '@/lib/cms/sanity-refs'
import { CONTAINER_CLASS } from '@/lib/cms'
import { parseFilterState, PAGE_SIZE, serializeFilterState } from './_state/url'

import { PlpBreadcrumbs } from '@/components/plp/PlpBreadcrumbs'
import { PlpBanner } from '@/components/plp/PlpBanner'
import { PlpHeader } from '@/components/plp/PlpHeader'
import { PlpTabs } from '@/components/plp/PlpTabs'
import { AgendaLiveListing } from '@/components/agenda/AgendaLiveListing'
import { JsonLd } from '@/components/common/JsonLd'
import { buildCollectionPageJsonLd, buildItemListJsonLd } from '@/lib/json-ld'
import { PLP_BASE_PATH, plpProductPath } from '@/lib/routes'

export const dynamic = 'force-dynamic'

interface AgendaPageProps {
  searchParams: Promise<Record<string, string | string[]>>
}

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

  const sort =
    filterState.sort ?? (filterState.q ? 'relevance' : 'start_date')

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

  const collectionPageJsonLd = buildCollectionPageJsonLd({
    name: pageTitle,
    description: `Bekijk alle aankomende activiteiten van Vrije Academie op datum.`,
    url: '/agenda',
  })

  const itemListJsonLd = items.length
    ? buildItemListJsonLd({
        name: pageTitle,
        numberOfItems: count,
        items: items.slice(0, 24).map((item) => ({
          path: plpProductPath(item.product_handle),
          name: item.product_title,
          image: item.thumbnail ?? undefined,
          priceFromCents: item.price,
          inStock: item.available_quantity !== 0,
        })),
      })
    : null

  return (
    <div className="pb-16">
      <JsonLd data={collectionPageJsonLd} />
      {itemListJsonLd && <JsonLd data={itemListJsonLd} />}
      <div className={CONTAINER_CLASS}>
        <PlpBreadcrumbs
          crumbs={[
            { label: 'Home', href: '/' },
            { label: 'Agenda', href: '/agenda' },
          ]}
        />
      </div>

      {plpData?.banner?.enabled && <PlpBanner banner={plpData.banner} />}

      <div className={`${CONTAINER_CLASS} mt-6`}>
        <PlpHeader title={pageTitle} intro={plpData?.intro} />
      </div>

      <div className={`${CONTAINER_CLASS} mt-4`}>
        <PlpTabs tabs={tabs} activePath="/agenda" />
      </div>

      <div className={CONTAINER_CLASS}>
        <AgendaLiveListing
          filterState={filterState}
          initialItems={items}
          initialCount={count}
          facets={facets}
          categories={categories}
          teachers={teachers}
          searchPlaceholder={plpCopy?.searchPlaceholder}
          searchSubmitLabel={plpCopy?.searchSubmitLabel}
          emptyStateHeading={plpCopy?.emptyStateHeading}
          emptyStateSubtext={plpCopy?.emptyStateSubtext}
          loadMoreLabel={plpCopy?.loadMoreLabel}
          loadError={result === null}
        />
      </div>
    </div>
  )
}
