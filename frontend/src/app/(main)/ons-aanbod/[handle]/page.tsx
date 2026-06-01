import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { commerceClient } from '@/lib/commerce'
import { getCategoryBySlug } from '@/lib/cms/sanity-refs'
import { PlpListingPage } from '@/components/plp/PlpListingPage'
import { parseFilterState, serializeFilterState } from '../_state/url'
import { resolvePlpFilterHref, singleProductTypeRedirectTarget } from '../_state/redirects'
import { plpCategoryHref, plpProductTypeHref } from '@/lib/routes'
import { isPlpProductTypeSlug, productTypeLabelFromSlug } from '@/lib/plp-product-types'
import { PdpPageContent } from './PdpPageContent'

export const dynamic = 'force-dynamic'

interface HandlePageProps {
  params: Promise<{ handle: string }>
  searchParams: Promise<Record<string, string | string[]>>
}

export async function generateMetadata({ params }: HandlePageProps): Promise<Metadata> {
  const { handle } = await params
  const category = await getCategoryBySlug(handle)
  const siteName = 'Vrije Academie'

  if (category) {
    return {
      title: `Ons aanbod in ${category.label} – ${siteName}`,
      description: `Bekijk het aanbod van ${siteName} in ${category.label}.`,
    }
  }

  if (isPlpProductTypeSlug(handle)) {
    const label = productTypeLabelFromSlug(handle)
    return {
      title: `Ons aanbod in ${label} – ${siteName}`,
      description: `Bekijk ${label.toLowerCase()} van ${siteName}.`,
    }
  }

  const event = await commerceClient.getEvent(handle)
  if (!event) return {}

  const title = `${event.title} | Vrije Academie`
  const description = event.description?.slice(0, 160) ?? undefined
  const image = event.image_urls?.[0] ?? event.thumbnail ?? undefined

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: image ? [image] : [],
    },
  }
}

export default async function HandlePage({ params, searchParams }: HandlePageProps) {
  const { handle } = await params
  const category = await getCategoryBySlug(handle)

  if (category) {
    const paramsResolved = await searchParams
    const parsed = parseFilterState(paramsResolved)
    const pageParam = Number((paramsResolved.page as string) ?? '1')

    const urlCategories = parsed.categories ?? []
    const hasExtraCategoryQuery =
      urlCategories.length > 1 || urlCategories.some((slug) => slug !== handle)

    if (hasExtraCategoryQuery) {
      redirect(
        resolvePlpFilterHref(
          {
            ...parsed,
            categories: [...new Set([handle, ...urlCategories])],
          },
          {}
        )
      )
    }

    const filterState = {
      ...parsed,
      categories: [handle],
    }
    const basePath = plpCategoryHref(handle)
    if (!isNaN(pageParam) && pageParam > 1) {
      const query = serializeFilterState(filterState).toString()
      redirect(query ? `${basePath}?${query}` : basePath)
    }
    const pageTitle = `Ons aanbod in ${category.label}`

    return (
      <PlpListingPage
        pageTitle={pageTitle}
        basePath={basePath}
        filterState={filterState}
        scopedCrumb={{ label: category.label, href: basePath }}
      />
    )
  }

  if (isPlpProductTypeSlug(handle)) {
    const paramsResolved = await searchParams
    const parsed = parseFilterState(paramsResolved)
    const pageParam = Number((paramsResolved.page as string) ?? '1')

    const urlTypes = parsed.productTypes ?? []
    const hasExtraTypeQuery =
      urlTypes.length > 1 || urlTypes.some((slug) => slug.toLowerCase() !== handle)

    if (hasExtraTypeQuery) {
      redirect(
        resolvePlpFilterHref(
          {
            ...parsed,
            productTypes: [...new Set([handle, ...urlTypes.map((s) => s.toLowerCase())])],
          },
          {}
        )
      )
    }

    const filterState = {
      ...parsed,
      productTypes: [handle],
    }
    const basePath = plpProductTypeHref(handle)
    if (!isNaN(pageParam) && pageParam > 1) {
      const query = serializeFilterState(filterState).toString()
      redirect(query ? `${basePath}?${query}` : basePath)
    }
    const label = productTypeLabelFromSlug(handle)
    const pageTitle = `Ons aanbod in ${label}`

    return (
      <PlpListingPage
        pageTitle={pageTitle}
        basePath={basePath}
        filterState={filterState}
        scopedCrumb={{ label, href: basePath }}
      />
    )
  }

  return <PdpPageContent handle={handle} />
}
