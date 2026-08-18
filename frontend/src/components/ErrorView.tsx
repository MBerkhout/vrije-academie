import { CONTAINER_CLASS } from '@/lib/cms'
import { Button } from '@/components/ui'
import { defaultMessages, interpolate } from '@/lib/i18n/messages'

interface ErrorViewProps {
  onRetry?: () => void
  digest?: string
  /** Show a logo when the site header is not present (root / global error). */
  standalone?: boolean
}

export function ErrorView({ onRetry, digest, standalone = false }: ErrorViewProps) {
  const t = defaultMessages.serverError

  return (
    <section className="py-12 md:py-16 border-b border-va-lightgray/80">
      <div className={CONTAINER_CLASS}>
        {standalone ? (
          <div className="mb-10">
            <a
              href="/"
              className="inline-flex items-center outline-none focus-visible:ring-2 focus-visible:ring-va-yellow focus-visible:ring-offset-2"
            >
              <img
                src="/branding/logo.svg"
                alt=""
                width={233}
                height={167}
                className="h-10 w-auto"
              />
              <img
                src="/branding/logo_text.svg"
                alt="Vrije Academie"
                width={490}
                height={68}
                className="-ml-[14px] h-6 w-auto max-w-[min(140px,36vw)] sm:h-8 sm:max-w-none"
              />
            </a>
          </div>
        ) : null}

        <p className="font-sans text-sm font-semibold tracking-wide text-va-gold mb-3">
          500
        </p>
        <h1 className="font-sans text-3xl md:text-4xl font-bold text-va-black leading-tight mb-3">
          {t.title}
        </h1>
        <div className="h-1 w-[100px] bg-va-yellow mb-6" aria-hidden="true" />
        <p className="font-sans text-sm text-va-darkgray leading-relaxed max-w-2xl mb-10">
          {t.body}
        </p>
        <div className="flex flex-col sm:flex-row flex-wrap gap-3">
          {onRetry ? (
            <Button variant="primary" size="md" type="button" onClick={onRetry}>
              {t.ctaRetry}
            </Button>
          ) : null}
          <Button variant={onRetry ? 'outline' : 'primary'} href="/" size="md">
            {t.ctaHome}
          </Button>
          <Button variant="outline" href="/vragen" size="md">
            {t.ctaQuestions}
          </Button>
        </div>
        {digest ? (
          <p className="font-sans text-xs text-va-gray mt-8">
            {interpolate(t.digest, { digest })}
          </p>
        ) : null}
      </div>
    </section>
  )
}
