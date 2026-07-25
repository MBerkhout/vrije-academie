import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { cmsClient } from '@/lib/cms/server'
import { VATHUIS_BASE_PATH } from '@/lib/routes'
import {
  buildVaThuisPageMetadata,
  VaThuisCmsPage,
} from '@/components/vathuis/VaThuisCmsPage'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const page = await cmsClient.getPage('va-thuis')
  return buildVaThuisPageMetadata(page, {
    fallbackTitle: 'VA Thuis – on-demand colleges | Vrije Academie',
    fallbackDescription:
      'Kijk wanneer je wilt, waar je wilt. Ontdek on-demand colleges van de Vrije Academie.',
    path: VATHUIS_BASE_PATH,
  })
}

export default async function VaThuisLandingPage() {
  const page = await cmsClient.getPage('va-thuis')

  if (!page?.isVaThuis) {
    notFound()
  }

  return <VaThuisCmsPage page={page} />
}
