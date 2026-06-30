import { commerceClient } from '@/lib/commerce'
import { cmsClient } from '@/lib/cms/server'
import { getCategoriesForFilter, getTeachersForFilter } from '@/lib/cms/sanity-refs'
import { CONTAINER_CLASS } from '@/lib/cms'
import {
  parseVathuisFilterState,
  VATHUIS_PAGE_SIZE,
  type VathuisFilterState,
} from '@/app/(main)/va-thuis/_state/url'
import { Breadcrumbs } from '@/components/common/Breadcrumbs'
import { JsonLd } from '@/components/common/JsonLd'
import { buildBreadcrumbListJsonLd, buildItemListJsonLd } from '@/lib/json-ld'
import { VATHUIS_BASE_PATH, VATHUIS_CATALOG_PATH, vathuisProductPath } from '@/lib/routes'
import { VaThuisLiveListing } from '@/components/vathuis/VaThuisLiveListing'

export type VaThuisListingPageProps = {
  filterState: VathuisFilterState
  pageTitle?: string
  introText?: string
}

export async function VaThuisListingPage({
  filterState,
  pageTitle = 'VA Thuis – ons aanbod',
  introText,
}: VaThuisListingPageProps) {
  const sort = filterState.sort ?? (filterState.q ? 'relevance' : 'order')

  const [settings, categories, teachers, catalogResult] = await Promise.all([
    cmsClient.getGeneralSettings(),
    getCategoriesForFilter(),
    getTeachersForFilter(),
    commerceClient
      .getVathuisPaginated({
        ...filterState,
        sort,
        limit: VATHUIS_PAGE_SIZE,
        offset: 0,
      })
      .catch(() => null),
  ])

  const items = catalogResult?.items ?? []
  const count = catalogResult?.count ?? 0
  const stockThreshold = settings?.pdp?.lowStockThreshold ?? 5

  const breadcrumbCrumbs = [
    { label: 'Home', href: '/' },
    { label: 'VA Thuis', href: VATHUIS_BASE_PATH },
    { label: 'Ons aanbod', href: VATHUIS_CATALOG_PATH },
  ]

  const breadcrumbJsonLd = buildBreadcrumbListJsonLd(
    breadcrumbCrumbs.map((c) => ({ name: c.label, item: c.href }))
  )

  const itemListJsonLd = items.length
    ? buildItemListJsonLd({
        name: pageTitle,
        numberOfItems: count,
        items: items.slice(0, 24).map((event) => ({
          path: vathuisProductPath(event.handle),
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
          <Breadcrumbs crumbs={breadcrumbCrumbs} dark />
        </div>

        <div className={`${CONTAINER_CLASS} mt-6`}>
          <h1 className="font-sans text-2xl md:text-3xl font-bold text-white">{pageTitle}</h1>
          {introText ? (
            <p className="mt-3 text-base text-va-gray-300 max-w-3xl">{introText}</p>
          ) : null}
        </div>

        <div className={CONTAINER_CLASS}>
          <VaThuisLiveListing
            basePath={VATHUIS_CATALOG_PATH}
            filterState={filterState}
            initialItems={items}
            initialCount={count}
            facets={catalogResult?.facets}
            categories={categories}
            teachers={teachers}
            stockThreshold={stockThreshold}
            loadError={!catalogResult}
          />
        </div>
      </div>
    </>
  )
}

export { parseVathuisFilterState }
