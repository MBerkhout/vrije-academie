import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { resolveCityBySlug } from '@/lib/commerce/resolve-city-slug'
import { PlpListingPage } from '@/components/plp/PlpListingPage'
import { parseFilterState, serializeFilterState } from '../../_state/url'
import { plpCityHref } from '@/lib/routes'

export const dynamic = 'force-dynamic'

interface CityPlpPageProps {
  params: Promise<{ city: string }>
  searchParams: Promise<Record<string, string | string[]>>
}

export async function generateMetadata({ params }: CityPlpPageProps): Promise<Metadata> {
  const { city: citySlug } = await params
  const city = await resolveCityBySlug(citySlug)
  const label = city?.label ?? citySlug
  const siteName = 'Vrije Academie'

  return {
    title: `Ons aanbod in ${label} – ${siteName}`,
    description: `Bekijk het aanbod van ${siteName} in ${label}.`,
  }
}

export default async function CityPlpPage({ params, searchParams }: CityPlpPageProps) {
  const { city: citySlug } = await params
  const city = await resolveCityBySlug(citySlug)
  if (!city) notFound()

  const paramsResolved = await searchParams
  const basePath = plpCityHref(citySlug)
  const filterState = {
    ...parseFilterState(paramsResolved),
    cities: [citySlug],
  }
  const pageParam = Number((paramsResolved.page as string) ?? '1')
  if (!isNaN(pageParam) && pageParam > 1) {
    const query = serializeFilterState(filterState).toString()
    redirect(query ? `${basePath}?${query}` : basePath)
  }
  const pageTitle = `Ons aanbod in ${city.label}`

  return (
    <PlpListingPage
      pageTitle={pageTitle}
      basePath={basePath}
      filterState={filterState}
      scopedCrumb={{ label: city.label, href: basePath }}
    />
  )
}
