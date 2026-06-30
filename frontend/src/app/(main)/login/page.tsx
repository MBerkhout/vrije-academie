import { Suspense } from 'react'
import { cmsClient } from '@/lib/cms/server'
import { Breadcrumbs } from '@/components/common/Breadcrumbs'
import { LoginForm } from '@/components/auth/LoginForm'

export const metadata = {
  title: 'Inloggen – Vrije Academie',
}

export default async function LoginPage() {
  const settings = await cmsClient.getGeneralSettings()
  const account = settings?.account ?? {}

  const imageUrl = account.loginImage?.asset?.url
  const quote = account.loginQuote ?? 'Kennis verandert je blik op de wereld.'

  return (
    <div className="flex flex-col lg:flex-row lg:min-h-screen">
      {/* ── Left panel: editorial image + typographic quote backdrop ── */}
      <div className="hidden lg:flex relative w-[55%] flex-shrink-0 overflow-hidden self-stretch">
        {/* Background: image or deep VA-black fallback */}
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`${imageUrl}?w=1200&h=1600&fit=crop&auto=format`}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            aria-hidden="true"
          />
        ) : (
          <div className="absolute inset-0 bg-[#111]" />
        )}

        {/* Gradient overlay: subtle top darkening + strong bottom for quote legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/20" />

        {/* Large typographic backdrop — the option-2 element over the option-1 image */}
        <div className="absolute inset-0 flex flex-col justify-end px-10 pb-12 xl:px-14 xl:pb-16">
          {/* Decorative opening mark in VA yellow */}
          <span
            className="block font-serif text-va-yellow leading-none select-none pointer-events-none"
            style={{ fontSize: 'clamp(5rem, 8vw, 10rem)', lineHeight: 0.7, marginBottom: '0.2em' }}
            aria-hidden="true"
          >
            &ldquo;
          </span>

          {/* Quote text — large enough to feel like a design element, sharp enough to read */}
          <p
            className="font-serif italic text-white/90 leading-[1.1] select-none pointer-events-none"
            style={{ fontSize: 'clamp(2rem, 3.4vw, 4rem)' }}
          >
            {quote}
          </p>
        </div>
      </div>

      {/* ── Right panel: form ── */}
      <div className="flex flex-1 flex-col self-stretch">
        {/* Centered form area */}
        <div className="flex flex-1 items-center justify-center px-6 py-10 lg:py-14">
          <div className="w-full max-w-sm">
            <Breadcrumbs
              crumbs={[
                { label: 'Home', href: '/' },
                { label: account.loginHeading ?? 'Inloggen' },
              ]}
              className="mb-6"
            />
            <Suspense>
              <LoginForm settings={account} />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  )
}
