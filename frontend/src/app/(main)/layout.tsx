import { cmsClient } from '@/lib/cms/server'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { CustomerProvider } from '@/lib/commerce/CustomerProvider'

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const settings = await cmsClient.getGeneralSettings()

  return (
    <CustomerProvider>
      <Header settings={settings} />
      <main className="min-h-screen">{children}</main>
      <Footer settings={settings} />
    </CustomerProvider>
  )
}
