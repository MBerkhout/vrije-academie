import type { Metadata } from 'next'
import { draftMode } from 'next/headers'
import { Source_Sans_3 } from 'next/font/google'
import { VisualEditing } from 'next-sanity/visual-editing'
import { SanityLive } from '@/lib/cms/live'
import { SITE_ROBOTS } from '@/lib/cms/seo-metadata'
import { refreshOnPresentation } from '@/app/actions/refresh'
import { DisableDraftMode } from '@/components/DisableDraftMode'
import './globals.css'

const fontSans = Source_Sans_3({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Vrije Academie',
  description: 'Kunst, geschiedenis en filosofie',
  robots: SITE_ROBOTS,
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isEnabled: isDraftMode } = await draftMode()

  return (
    <html
      lang="nl"
      className={fontSans.variable}
    >
      <body>
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
