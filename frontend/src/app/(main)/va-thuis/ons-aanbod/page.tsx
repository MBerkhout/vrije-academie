import type { Metadata } from 'next'
import { VaThuisListingPage, parseVathuisFilterState } from '@/components/vathuis/VaThuisListingPage'

export const dynamic = 'force-dynamic'

interface CatalogPageProps {
  searchParams: Promise<Record<string, string | string[]>>
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'VA Thuis – ons aanbod | Vrije Academie',
    description:
      'Bekijk alle on-demand colleges van VA Thuis. Kijk wanneer je wilt, waar je wilt.',
  }
}

export default async function VaThuisCatalogPage({ searchParams }: CatalogPageProps) {
  const params = await searchParams
  const filterState = parseVathuisFilterState(params)

  return <VaThuisListingPage filterState={filterState} />
}
