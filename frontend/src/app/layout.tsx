import '@/lib/suppress-i18next-support-notice'
import type { Metadata } from 'next'
import { draftMode } from 'next/headers'
import { VisualEditing } from 'next-sanity/visual-editing'
import { SanityLive } from '@/lib/cms/live'
import { buildSiteMetadata } from '@/lib/cms/seo-metadata'
import { refreshOnPresentation } from '@/app/actions/refresh'
import { DisableDraftMode } from '@/components/DisableDraftMode'
import { GtmScripts } from '@/components/analytics/GtmScripts'
import './globals.css'

export const metadata: Metadata = buildSiteMetadata({
  title: 'Vrije Academie',
  description: 'Kunst, geschiedenis en filosofie',
})

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isEnabled: isDraftMode } = await draftMode()

  return (
    <html lang="nl">
      <body>
        <GtmScripts />
        {children}
        {isDraftMode && (
          <>
            <SanityLive revalidateSyncTags={refreshOnPresentation} />
            <VisualEditing />
            <DisableDraftMode />
          </>
        )}
      </body>
    </html>
  )
}
