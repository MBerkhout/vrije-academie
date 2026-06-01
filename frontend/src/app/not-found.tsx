import { cmsClient } from '@/lib/cms/server'
import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'
import { NotFoundView } from '@/components/NotFoundView'

export default async function GlobalNotFound() {
  const settings = await cmsClient.getGeneralSettings()

  return (
    <>
      <Header settings={settings} />
      <main className="min-h-screen">
        <NotFoundView />
      </main>
      <Footer settings={settings} />
    </>
  )
}
