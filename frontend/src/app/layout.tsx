import type { Metadata } from 'next'
import { draftMode } from 'next/headers'
import { Merriweather, Source_Sans_3 } from 'next/font/google'
import { VisualEditing } from 'next-sanity/visual-editing'
import { SanityLive } from '@/lib/cms/live'
import { refreshOnPresentation } from '@/app/actions/refresh'
import { DisableDraftMode } from '@/components/DisableDraftMode'
import './globals.css'

const fontSans = Source_Sans_3({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
})

const fontSerif = Merriweather({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '700'],
  variable: '--font-serif',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Vrije Academie',
  description: 'Kunst, geschiedenis en filosofie',
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
      className={`${fontSans.variable} ${fontSerif.variable}`}
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
