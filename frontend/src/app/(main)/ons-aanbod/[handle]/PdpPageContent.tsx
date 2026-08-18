import { notFound } from 'next/navigation'
import { getCachedEvent, getCachedSimilarEvents } from '@/lib/commerce/server'
import type { EventCard } from '@/lib/commerce/types'
import { cmsClient } from '@/lib/cms/server'
import { getSanityProductExtras } from '@/lib/cms/sanity-refs'
import { CONTAINER_CLASS } from '@/lib/cms'

import { Breadcrumbs } from '@/components/common/Breadcrumbs'
import { JsonLd } from '@/components/common/JsonLd'
import { buildPdpEventOrCourseJsonLd } from '@/lib/json-ld'
import { PLP_BASE_PATH, plpCategoryHref, plpProductPath } from '@/lib/routes'
import { PromoBanner } from '@/components/common/PromoBanner'
import { PdpImageGallery } from '@/components/pdp/PdpImageGallery'
import { toPdpGalleryImages } from '@/components/pdp/pdp-gallery-images'
import { PdpHeader } from '@/components/pdp/PdpHeader'
import { PdpBody } from '@/components/pdp/PdpBody'
import { PdpBookingPanel } from '@/components/pdp/PdpBookingPanel'
import { PdpEpisodesTable } from '@/components/pdp/PdpEpisodesTable'
import { PdpLocationTabs } from '@/components/pdp/PdpLocationTabs'
import { PdpTrustBar } from '@/components/pdp/PdpTrustBar'
import { PdpSimilarCourses } from '@/components/pdp/PdpSimilarCourses'
import { PdpRelatedProducts } from '@/components/pdp/PdpRelatedProducts'
import { PdpRecentViewed } from '@/components/pdp/PdpRecentViewed'
import { PdpAnalytics } from '@/components/analytics/PdpAnalytics'

export async function PdpPageContent({
  handle,
  event: prefetchedEvent,
}: {
  handle: string
  event?: EventCard | null
}) {
  const [event, settings, similar] = await Promise.all([
    prefetchedEvent ?? getCachedEvent(handle),
    cmsClient.getGeneralSettings(),
    getCachedSimilarEvents(handle),
  ])

  if (!event) notFound()

  const extras = await getSanityProductExtras(event.id)

  const pdpLabels = settings?.pdp?.labels
  const stockThreshold = settings?.pdp?.lowStockThreshold ?? 5

  const primaryCategory = event.categories?.[0]
  const crumbs = [
    { label: 'Home', href: '/' },
    { label: 'Ons aanbod', href: PLP_BASE_PATH },
    ...(primaryCategory
      ? [{ label: primaryCategory.label, href: plpCategoryHref(primaryCategory.slug) }]
      : []),
    { label: event.title, href: plpProductPath(handle) },
  ]

  const structuredData = buildPdpEventOrCourseJsonLd(handle, event, {
    seo: extras
      ? {
          seo: extras.seo,
          seoTitle: extras.seoTitle,
          seoDescription: extras.seoDescription,
        }
      : undefined,
  })

  const bannerText = extras?.customUrgencyMessage ?? null

  const isBundleOnly = event.purchase_mode === 'bundle_only'
  const vathuisEpisodes = event.vathuis?.episodes ?? []

  return (
    <PdpAnalytics event={event}>
      <JsonLd data={structuredData} />

      <div className="pb-16">
        <div className={CONTAINER_CLASS}>
          <Breadcrumbs crumbs={crumbs} />
        </div>

        {bannerText && <PromoBanner title={bannerText} theme="yellow" squareCorners />}

        {(event.image_urls?.length ?? 0) > 0 && (
          <div className={`${CONTAINER_CLASS} mb-3`}>
            <PdpImageGallery
              images={toPdpGalleryImages(event.gallery_images ?? event.image_urls ?? [])}
              title={event.title}
            />
          </div>
        )}

        <div className={CONTAINER_CLASS}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2 flex flex-col">
              <PdpHeader
                title={event.title}
                onlineBadge={extras?.onlineBadge}
                recordType={event.record_type}
                categories={event.categories}
                shareLabel={pdpLabels?.share}
              />
              <PdpBody blocks={extras?.body} />
            </div>

            <div className="lg:col-span-1">
              <PdpBookingPanel
                event={event}
                settings={settings}
                customUrgencyMessage={extras?.customUrgencyMessage}
                onlineBadge={extras?.onlineBadge}
              />
            </div>
          </div>
        </div>

        {isBundleOnly && (event.vathuis?.chapters?.length || vathuisEpisodes.length) > 0 ? (
          <div className={CONTAINER_CLASS}>
            <PdpEpisodesTable
              productHandle={handle}
              chapters={event.vathuis?.chapters}
              episodes={vathuisEpisodes}
              chapterTitle={event.title}
              settings={settings}
            />
          </div>
        ) : !isBundleOnly ? (
          <div className={CONTAINER_CLASS}>
            <PdpLocationTabs
              event={event}
              variants={event.variants ?? []}
              settings={settings}
              externalRegistrationUrl={event.external_registration_url}
              instructors={event.instructors}
            />
          </div>
        ) : null}

        <div className={CONTAINER_CLASS}>
          <PdpTrustBar usps={settings?.pdp?.trustUsps} />
        </div>

        {similar.length >= 2 && (
          <div className={CONTAINER_CLASS}>
            <PdpSimilarCourses
              similar={similar}
              heading={pdpLabels?.similarHeading}
              stockThreshold={stockThreshold}
            />
          </div>
        )}

        {(extras?.relatedProducts?.length ?? 0) > 0 && (
          <div className={CONTAINER_CLASS}>
            <PdpRelatedProducts
              products={extras?.relatedProducts}
              heading={pdpLabels?.relatedHeading}
              stockThreshold={stockThreshold}
            />
          </div>
        )}

        <div className={CONTAINER_CLASS}>
          <PdpRecentViewed
            currentHandle={handle}
            stockThreshold={stockThreshold}
          />
        </div>
      </div>
    </PdpAnalytics>
  )
}
