import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { cmsClient } from '@/lib/cms/server'
import { getPlpPage } from '@/lib/cms/sanity-refs'
import { buildSeoMetadata } from '@/lib/cms/seo-metadata'
import { PlpListingPage } from '@/components/plp/PlpListingPage'
import { PLP_BASE_PATH } from '@/lib/routes'
import { parseFilterState, serializeFilterState } from './_state/url'
import { singleCategoryRedirectTarget, singleProductTypeRedirectTarget } from './_state/redirects'
import { appendFileSync } from 'fs'

function agentDebugLog(payload: Record<string, unknown>) {
  // #region agent log
  try {
    appendFileSync(
      '/Users/mickberkhout/Development/Vrije Academie/site/.cursor/debug-1cde71.log',
      `${JSON.stringify({ sessionId: '1cde71', timestamp: Date.now(), ...payload })}\n`
    )
  } catch {
    /* ignore */
  }
  // #endregion
}

export const dynamic = 'force-dynamic'

interface PlpPageProps {
  searchParams: Promise<Record<string, string | string[]>>
}

export async function generateMetadata({ searchParams }: PlpPageProps): Promise<Metadata> {
  const params = await searchParams
  const filterState = parseFilterState(params)

  const metaStart = Date.now()
  const [plpData, settings] = await Promise.all([
    getPlpPage(),
    cmsClient.getGeneralSettings(),
  ])
  agentDebugLog({
    location: 'ons-aanbod/page.tsx:generateMetadata',
    message: 'metadata fetch',
    hypothesisId: 'E',
    data: { ms: Date.now() - metaStart, hasFilters: Boolean(filterState.categories?.length) },
  })

  const siteName = 'Vrije Academie'
  const baseTitle = settings?.plp?.pageTitle ?? 'Ons aanbod'

  return buildSeoMetadata(plpData?.seo, {
    fallbackTitle: `${baseTitle} – ${siteName}`,
    fallbackDescription: `Bekijk het volledige aanbod van ${siteName}.`,
    path: PLP_BASE_PATH,
  })
}

export default async function OnsAanbodPage({ searchParams }: PlpPageProps) {
  const params = await searchParams
  const filterState = parseFilterState(params)

  const redirectTarget =
    singleCategoryRedirectTarget(filterState, params) ??
    singleProductTypeRedirectTarget(filterState, params)
  if (redirectTarget) {
    redirect(redirectTarget)
  }

  const pageParam = Number((params.page as string) ?? '1')
  if (!isNaN(pageParam) && pageParam > 1) {
    const query = serializeFilterState(filterState).toString()
    redirect(query ? `${PLP_BASE_PATH}?${query}` : PLP_BASE_PATH)
  }

  return (
    <PlpListingPage
      basePath={PLP_BASE_PATH}
      filterState={filterState}
    />
  )
}
