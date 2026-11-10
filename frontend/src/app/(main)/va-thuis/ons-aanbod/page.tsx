import type { Metadata } from 'next'
import { getSiteOrigin } from '@/lib/json-ld'
import { VaThuisListingPage, parseVathuisFilterState } from '@/components/vathuis/VaThuisListingPage'

export const dynamic = 'force-dynamic'

interface CatalogPageProps {
  searchParams: Promise<Record<string, string | string[]>>
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    alternates: { canonical: `${getSiteOrigin()}/va-thuis/ons-aanbod` },
    title: 'VAthuis – ons aanbod | Vrije Academie',
    description:
      'Bekijk alle on-demand colleges van VAthuis. Kijk wanneer je wilt, waar je wilt.',
  }
}

export default async function VaThuisCatalogPage({ searchParams }: CatalogPageProps) {
  const params = await searchParams
  const filterState = parseVathuisFilterState(params)

  return <VaThuisListingPage filterState={filterState} />
}
