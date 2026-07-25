import { notFound } from 'next/navigation'
import Link from 'next/link'
import { commerceClient } from '@/lib/commerce'
import { cmsClient } from '@/lib/cms/server'
import { getSanityProductExtras } from '@/lib/cms/sanity-refs'
import { CONTAINER_CLASS } from '@/lib/cms'

import { Breadcrumbs } from '@/components/common/Breadcrumbs'
import { JsonLd } from '@/components/common/JsonLd'
import { buildPdpEventOrCourseJsonLd } from '@/lib/json-ld'
import { VATHUIS_BASE_PATH, VATHUIS_CATALOG_PATH, vathuisProductPath } from '@/lib/routes'
import { PromoBanner } from '@/components/common/PromoBanner'
import { PdpImageGallery } from '@/components/pdp/PdpImageGallery'
import { toPdpGalleryImages } from '@/components/pdp/pdp-gallery-images'
import { PdpBody } from '@/components/pdp/PdpBody'
import { PdpBookingPanel } from '@/components/pdp/PdpBookingPanel'
import { PdpEpisodesTable } from '@/components/pdp/PdpEpisodesTable'
import { VaThuisSimilarCourses } from '@/components/vathuis/VaThuisSimilarCourses'
import { PdpAnalytics } from '@/components/analytics/PdpAnalytics'
import { Badge } from '@/components/ui/Badge'

export async function VaThuisPdpPageContent({ handle }: { handle: string }) {
  const [event, settings, similar] = await Promise.all([
    commerceClient.getEvent(handle),
    cmsClient.getGeneralSettings(),
    commerceClient.getSimilarVathuis(handle).catch(() => []),
  ])

  if (!event || event.purchase_mode !== 'bundle_only') notFound()

  const extras = await getSanityProductExtras(event.id)

  const pdpLabels = settings?.pdp?.labels
  const stockThreshold = settings?.pdp?.lowStockThreshold ?? 5

  const primaryCategory = event.categories?.[0]
  const categoryCatalogHref = primaryCategory?.slug
    ? `${VATHUIS_CATALOG_PATH}?category=${encodeURIComponent(primaryCategory.slug)}`
    : VATHUIS_CATALOG_PATH

  const crumbs = [
    { label: 'Home', href: '/' },
    { label: 'VA Thuis', href: VATHUIS_BASE_PATH },
    ...(primaryCategory
      ? [{ label: primaryCategory.label, href: categoryCatalogHref }]
      : []),
    { label: event.title, href: vathuisProductPath(handle) },
  ]

  const structuredData = buildPdpEventOrCourseJsonLd(handle, event, {
    productPath: vathuisProductPath(handle),
    forceCourse: true,
    seo: extras
      ? {
          seo: extras.seo,
          seoTitle: extras.seoTitle,
          seoDescription: extras.seoDescription,
        }
      : undefined,
  })

  const bannerText = extras?.customUrgencyMessage ?? null
  const vathuisEpisodes = event.vathuis?.episodes ?? []

  return (
    <PdpAnalytics event={event} pageType="vathuis">
      <JsonLd data={structuredData} />

      <div className="pb-16">
        <div className={CONTAINER_CLASS}>
          <Breadcrumbs crumbs={crumbs} dark />
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
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  {event.categories?.map((cat) =>
                    cat.slug ? (
                      <Link
                        key={cat.slug}
                        href={`${VATHUIS_CATALOG_PATH}?category=${encodeURIComponent(cat.slug)}`}
                        className="inline-flex hover:opacity-80 transition-opacity"
                      >
                        <Badge variant="category" size="sm">
                          {cat.label}
                        </Badge>
                      </Link>
                    ) : (
                      <Badge key={cat.id ?? cat.label} variant="category" size="sm">
                        {cat.label}
                      </Badge>
                    )
                  )}
                  <Badge variant="yellow" size="sm">
                    VA Thuis – on demand
                  </Badge>
                </div>
                <h1 className="font-sans text-2xl md:text-3xl font-bold text-white">
                  {event.title}
                </h1>
                {event.vathuis?.episode_count_label || event.vathuis?.play_time ? (
                  <p className="text-sm text-va-gray-300">
                    {[event.vathuis?.episode_count_label, event.vathuis?.play_time]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                ) : null}
              </div>
              <div className="mt-6 text-white [&_.pdp-body_.text-va-darkgray]:text-white/90 [&_.pdp-body_.text-va-black]:text-white [&_.pdp-body_a]:text-va-yellow">
                <PdpBody blocks={extras?.body} tone="onDark" />
              </div>
            </div>

            <div className="lg:col-span-1">
              <PdpBookingPanel
                event={event}
                settings={settings}
                customUrgencyMessage={extras?.customUrgencyMessage}
                onlineBadge={extras?.onlineBadge}
                variant="dark"
              />
            </div>
          </div>
        </div>

        {(event.vathuis?.chapters?.length || vathuisEpisodes.length) > 0 ? (
          <div className={`${CONTAINER_CLASS} text-white`}>
            <PdpEpisodesTable
              productHandle={handle}
              chapters={event.vathuis?.chapters}
              episodes={vathuisEpisodes}
              chapterTitle={event.title}
              settings={settings}
              variant="dark"
            />
          </div>
        ) : null}

        {similar.length >= 2 && (
          <div className={CONTAINER_CLASS}>
            <VaThuisSimilarCourses
              similar={similar}
              heading={pdpLabels?.similarHeading ?? 'Gerelateerde colleges'}
              stockThreshold={stockThreshold}
            />
          </div>
        )}
      </div>
    </PdpAnalytics>
  )
}
