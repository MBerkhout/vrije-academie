import { notFound } from 'next/navigation'
import { commerceClient } from '@/lib/commerce'
import { cmsClient } from '@/lib/cms/server'
import { getSanityProductExtras } from '@/lib/cms/sanity-refs'
import { CONTAINER_CLASS } from '@/lib/cms'

import { Breadcrumbs } from '@/components/common/Breadcrumbs'
import { JsonLd } from '@/components/common/JsonLd'
import { absolutizeUrl, buildOrganizationEntity, getSiteOrigin } from '@/lib/json-ld'
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

export async function PdpPageContent({ handle }: { handle: string }) {
  const [event, settings, similar] = await Promise.all([
    commerceClient.getEvent(handle),
    cmsClient.getGeneralSettings(),
    commerceClient.getSimilarEvents(handle).catch(() => []),
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

  const isCourse = event.record_type === 'collegereeks' || !event.record_type
  const siteOrigin = getSiteOrigin()
  const org = buildOrganizationEntity()
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': isCourse ? 'Course' : 'Event',
    name: event.title,
    description: event.description ?? undefined,
    image: event.image_urls?.[0] ?? event.thumbnail ?? undefined,
    url: absolutizeUrl(plpProductPath(handle)),
    ...(isCourse
      ? {
          provider: org,
        }
      : {
          organizer: org,
          startDate: event.earliest_start_at ?? undefined,
          location: event.cities?.[0]
            ? { '@type': 'Place', name: event.cities[0] }
            : { '@type': 'VirtualLocation', url: siteOrigin },
          offers: event.price_from
            ? {
                '@type': 'Offer',
                price: (event.price_from / 100).toFixed(2),
                priceCurrency: 'EUR',
                availability:
                  event.min_available_quantity === 0
                    ? 'https://schema.org/SoldOut'
                    : 'https://schema.org/InStock',
              }
            : undefined,
        }),
  }

  const bannerText = extras?.customUrgencyMessage ?? null

  const isBundleOnly = event.purchase_mode === 'bundle_only'
  const vathuisEpisodes = event.vathuis?.episodes ?? []

  return (
    <>
      <JsonLd data={structuredData} />

      <div className="pb-16">
        <div className={CONTAINER_CLASS}>
          <Breadcrumbs crumbs={crumbs} />
        </div>

        {bannerText && <PromoBanner title={bannerText} theme="yellow" squareCorners />}

        {(event.image_urls?.length ?? 0) > 0 && (
          <div className={`${CONTAINER_CLASS} mb-3`}>
            <PdpImageGallery
              images={toPdpGalleryImages(event.image_urls ?? [])}
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
              chapters={event.vathuis?.chapters}
              episodes={vathuisEpisodes}
              chapterTitle={event.title}
              settings={settings}
            />
          </div>
        ) : (event.variants?.length ?? 0) > 0 ? (
          <div className={CONTAINER_CLASS}>
            <PdpLocationTabs
              variants={event.variants ?? []}
              settings={settings}
              externalRegistrationUrl={event.external_registration_url}
              instructors={event.instructors?.map((i) => ({
                id: i.id,
                name: i.name,
                photo_url: i.photo_url ?? undefined,
              }))}
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
    </>
  )
}
