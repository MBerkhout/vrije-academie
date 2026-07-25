import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { commerceClient } from '@/lib/commerce'
import { cmsClient } from '@/lib/cms/server'
import { buildProductPdpMetadata } from '@/lib/cms/seo-metadata'
import { getProductSeoByHandle } from '@/lib/cms/sanity-refs'
import { vathuisProductPath } from '@/lib/routes'
import { VaThuisPdpPageContent } from '@/components/vathuis/VaThuisPdpPageContent'
import {
  buildVaThuisPageMetadata,
  VaThuisCmsPage,
} from '@/components/vathuis/VaThuisCmsPage'

export const dynamic = 'force-dynamic'

interface VaThuisSlugPageProps {
  params: Promise<{ slug: string[] }>
}

async function resolveCmsPage(slugParts: string[]) {
  const cmsSlug = `va-thuis/${slugParts.join('/')}`
  const page = await cmsClient.getPage(cmsSlug)
  if (!page?.isVaThuis) return null
  return page
}

export async function generateMetadata({ params }: VaThuisSlugPageProps): Promise<Metadata> {
  const { slug: slugParts } = await params

  const cmsPage = await resolveCmsPage(slugParts)
  if (cmsPage) {
    const cmsSlug = `va-thuis/${slugParts.join('/')}`
    return buildVaThuisPageMetadata(cmsPage, {
      path: `/${cmsSlug}`,
    })
  }

  if (slugParts.length !== 1) return {}

  const handle = slugParts[0]
  const [event, productSeo] = await Promise.all([
    commerceClient.getEvent(handle),
    getProductSeoByHandle(handle),
  ])
  if (!event || event.purchase_mode !== 'bundle_only') return {}

  return buildProductPdpMetadata(
    productSeo,
    event,
    'VA Thuis – Vrije Academie',
    vathuisProductPath(handle),
  )
}

export default async function VaThuisSlugPage({ params }: VaThuisSlugPageProps) {
  const { slug: slugParts } = await params

  const cmsPage = await resolveCmsPage(slugParts)
  if (cmsPage) {
    return <VaThuisCmsPage page={cmsPage} />
  }

  if (slugParts.length !== 1) {
    notFound()
  }

  const handle = slugParts[0]
  const event = await commerceClient.getEvent(handle)
  if (!event || event.purchase_mode !== 'bundle_only') {
    notFound()
  }

  return <VaThuisPdpPageContent handle={handle} />
}
