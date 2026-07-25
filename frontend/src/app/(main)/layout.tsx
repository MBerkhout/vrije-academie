import { cmsClient } from '@/lib/cms/server'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { CustomerProvider } from '@/lib/commerce/CustomerProvider'
import { AnalyticsProvider } from '@/components/analytics/AnalyticsProvider'
import { JsonLd } from '@/components/common/JsonLd'
import { buildOrganizationJsonLd, buildWebSiteJsonLd } from '@/lib/json-ld'

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const settings = await cmsClient.getGeneralSettings()

  return (
    <CustomerProvider>
      <AnalyticsProvider>
        <JsonLd data={buildOrganizationJsonLd(settings)} />
        <JsonLd data={buildWebSiteJsonLd()} />
        <Header settings={settings} />
        <main className="min-h-screen">{children}</main>
        <Footer settings={settings} />
      </AnalyticsProvider>
    </CustomerProvider>
  )
}
