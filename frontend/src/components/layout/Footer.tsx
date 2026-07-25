import Image from 'next/image'
import Link from 'next/link'
import type { GeneralSettings, Menu, MenuItem } from '@/lib/cms'
import { isExternalHref, resolveMenuItemHref } from '@/lib/menu-href'
import { cn } from '@/lib/utils'
import { FooterKeepInformedForm } from './FooterKeepInformedForm'

interface FooterProps {
  settings: GeneralSettings | null
}

const DEFAULT_CONTACT = {
  address: 'Herengracht 368, 1016 CH Amsterdam',
  phone: 'Telefoon: 088 - 518 5000 (tegen de gebruikelijke belkosten)',
  availability: 'Wij zijn op werkdagen telefonisch bereikbaar van 9:30-11:30 uur',
  emailIntro: 'Je kunt je vragen ook mailen naar',
  email: 'info@vrijeacademie.nl',
}

type BottomColumn =
  | {
      kind: 'cms'
      key: string
      title?: string
      menu?: Menu
    }
  | {
      kind: 'legal'
      key: 'legal'
      title: string
      items: MenuItem[]
    }

function buildBottomColumns(footer: GeneralSettings['footer']): BottomColumn[] {
  const raw = footer?.columns ?? []
  const legalTitle = footer?.legalColumnTitle?.trim() || 'Juridisch'
  const legalItems = footer?.topMenuSecondary?.items ?? []

  const nieuwsbriefIdx = raw.findIndex(
    (c) => c.title?.trim().toLowerCase() === 'nieuwsbrief'
  )

  const filtered = raw.filter(
    (c) =>
      c.title?.trim().toLowerCase() !== 'nieuwsbrief' &&
      (c.title?.trim() || (c.menu?.items?.length ?? 0) > 0)
  )

  const cmsCols: BottomColumn[] = filtered.map((c, i) => ({
    kind: 'cms',
    key: `col-${c.menu?._id ?? i}`,
    title: c.title,
    menu: c.menu,
  }))

  if (legalItems.length === 0) return cmsCols

  const legalCol: BottomColumn = {
    kind: 'legal',
    key: 'legal',
    title: legalTitle,
    items: legalItems,
  }

  if (nieuwsbriefIdx >= 0) {
    const insertAt = Math.min(nieuwsbriefIdx, cmsCols.length)
    return [...cmsCols.slice(0, insertAt), legalCol, ...cmsCols.slice(insertAt)]
  }

  return [...cmsCols, legalCol]
}

function formatCopyright(raw: string | undefined, year: number): string {
  if (raw?.trim()) {
    return raw.includes('{year}')
      ? raw.replace(/\{year\}/g, String(year))
      : raw
  }
  return `© ${year} Vrije Academie. Alle rechten voorbehouden.`
}

function FooterNavLink({
  item,
  className: classNameProp,
}: {
  item: MenuItem
  className?: string
}) {
  const href = resolveMenuItemHref(item)
  const className =
    classNameProp ??
    'block text-sm text-white/90 hover:text-white font-sans leading-snug transition-colors'
  if (isExternalHref(href)) {
    return (
      <a
        href={href}
        className={className}
        target="_blank"
        rel="noopener noreferrer"
      >
        {item.label}
      </a>
    )
  }
  if (href === '#') {
    return (
      <span className={`${className} cursor-default opacity-70`}>{item.label}</span>
    )
  }
  return (
    <Link href={href} className={className}>
      {item.label}
    </Link>
  )
}

function SocialIcon({ platform }: { platform: string }) {
  const p = platform.toLowerCase()
  const iconClass = 'h-4 w-4 fill-current'
  if (p.includes('facebook')) {
    return (
      <svg className={iconClass} viewBox="0 0 24 24" aria-hidden>
        <path d="M22 12a10 10 0 1 0-11.5 9.9v-7H7.9V12h2.6V9.8c0-2.6 1.6-4 3.9-4 1.1 0 2.2.2 2.2.2v2.4h-1.2c-1.2 0-1.6.7-1.6 1.5V12h2.7l-.4 2.9h-2.3v7A10 10 0 0 0 22 12" />
      </svg>
    )
  }
  if (p.includes('instagram')) {
    return (
      <svg className={iconClass} viewBox="0 0 24 24" aria-hidden>
        <path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7zm5 3.5A5.5 5.5 0 1 1 6.5 13 5.5 5.5 0 0 1 12 7.5zm0 2A3.5 3.5 0 1 0 15.5 13 3.5 3.5 0 0 0 12 9.5zM17.8 6.3a1.2 1.2 0 1 1-1.2 1.2 1.2 1.2 0 0 1 1.2-1.2z" />
      </svg>
    )
  }
  if (p.includes('linkedin')) {
    return (
      <svg className={iconClass} viewBox="0 0 24 24" aria-hidden>
        <path d="M4.98 3.5C4.98 4.88 3.86 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.5 8h4V24h-4V8zm7.5 0h3.8v2.2h.1c.5-1 1.8-2.2 3.8-2.2 4 0 4.8 2.6 4.8 6v8h-4v-7.1c0-1.7 0-3.7-2.3-3.7-2.3 0-2.6 1.8-2.6 3.6V24h-4V8z" />
      </svg>
    )
  }
  return (
    <span className="font-sans text-[10px] uppercase tracking-wide" aria-hidden>
      {platform.slice(0, 2)}
    </span>
  )
}

export function Footer({ settings }: FooterProps) {
  const year = new Date().getFullYear()
  const footer = settings?.footer
  const contact = { ...DEFAULT_CONTACT, ...footer?.contact }
  const topPrimary = footer?.topMenuPrimary?.items ?? []
  const bottomColumns = buildBottomColumns(footer)
  const socialLinks = footer?.socialLinks ?? []

  const kif = footer?.keepInformedForm
  const keepInformedAction = kif?.formAction?.trim()
  const keepInformedMethod = kif?.formMethod === 'post' ? 'post' : 'get'
  const keepInformedFirstField = kif?.firstNameField?.trim() || 'firstName'
  const keepInformedLastField = kif?.lastNameField?.trim() || 'lastName'
  const keepInformedEmailField = kif?.emailField?.trim() || 'email'

  const showTopLinkBlock = topPrimary.length > 0 || Boolean(keepInformedAction)

  return (
    <footer className="bg-va-footer text-white">
      <div className="max-w-[1240px] mx-auto px-4 md:px-8 min-[1304px]:px-0 py-10 md:py-12">
        <div className="flex flex-col gap-10 lg:flex-row lg:gap-12 lg:items-start">
          <div className="shrink-0 lg:w-[30%] max-w-lg">
            <Link
              href="/"
              className="inline-block mb-6 outline-none focus-visible:ring-2 focus-visible:ring-va-yellow"
            >
              <Image
                src="/branding/footer-logo.svg"
                alt="Vrije Academie"
                width={270}
                height={51}
                className="h-auto w-[240px] sm:w-[270px]"
              />
            </Link>
            <address className="not-italic font-sans text-sm text-white/90 space-y-2">
              {contact.address ? (
                <p className="leading-relaxed">{contact.address}</p>
              ) : null}
              {contact.phone ? <p>{contact.phone}</p> : null}
              {contact.availability ? (
                <p className="text-white/80">{contact.availability}</p>
              ) : null}
              {contact.email ? (
                <p>
                  {contact.emailIntro ? `${contact.emailIntro} ` : null}
                  <a
                    href={`mailto:${contact.email}`}
                    className="text-white underline decoration-white/40 underline-offset-2 hover:decoration-white"
                  >
                    {contact.email}
                  </a>
                </p>
              ) : null}
            </address>
            {socialLinks.length > 0 ? (
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <span className="font-sans text-sm text-white/90">Volg ons:</span>
                <ul className="flex flex-wrap gap-2">
                  {socialLinks.map((link, i) => (
                    <li key={i}>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-9 w-9 items-center justify-center border border-white/35 text-white transition-colors hover:bg-white/10"
                        aria-label={link.platform}
                      >
                        <SocialIcon platform={link.platform} />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          {showTopLinkBlock ? (
            <div className="flex-1 min-w-0 border-t border-white/15 pt-8 mt-2 lg:mt-0 lg:border-t-0 lg:pl-8 lg:pt-0">
              <div
                className={
                  keepInformedAction && topPrimary.length > 0
                    ? 'flex flex-col lg:flex-row lg:justify-between lg:items-center w-full min-w-0 gap-6 lg:gap-8'
                    : 'flex flex-col w-full min-w-0'
                }
              >
                {topPrimary.length > 0 ? (
                  <div
                    className={cn(
                      'flex flex-col items-start min-w-0 shrink-0',
                      keepInformedAction
                        ? 'justify-center lg:flex-row lg:items-stretch lg:py-10 lg:gap-8'
                        : 'py-2 lg:py-10 lg:flex-row lg:items-stretch lg:gap-8',
                    )}
                  >
                    <div
                      className="hidden lg:block w-0.5 shrink-0 bg-va-yellow self-stretch"
                      aria-hidden
                    />
                    <nav aria-label="Footer snelkoppelingen" className="w-full">
                      <ul className="space-y-2">
                        {topPrimary.map((item, i) => (
                          <li key={i}>
                            <FooterNavLink item={item} />
                          </li>
                        ))}
                      </ul>
                    </nav>
                  </div>
                ) : null}

                {keepInformedAction ? (
                  <div
                    className={cn(
                      'hidden lg:flex min-h-[220px] flex-col justify-center bg-va-yellow px-8 py-10 text-va-black shrink-0 lg:max-w-md xl:max-w-lg',
                      topPrimary.length === 0 && 'lg:ml-auto lg:border-l-2 lg:border-va-yellow',
                    )}
                  >
                    <h3 className="font-sans text-sm font-bold text-va-black mb-4">
                      Blijf op de hoogte
                    </h3>
                    <FooterKeepInformedForm
                      action={keepInformedAction}
                      method={keepInformedMethod}
                      firstNameField={keepInformedFirstField}
                      lastNameField={keepInformedLastField}
                      emailField={keepInformedEmailField}
                      variant="onYellow"
                    />
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        {bottomColumns.length > 0 ? (
          <>
            <div
              className="my-10 md:my-12 h-px w-full bg-white/15"
              aria-hidden
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-8 xl:gap-6">
              {bottomColumns.map((column) => (
                <div key={column.key}>
                  {column.kind === 'legal' ? (
                    <>
                      {column.title ? (
                        <h3 className="font-sans text-sm font-bold text-white mb-3">
                          {column.title}
                        </h3>
                      ) : null}
                      <ul className="space-y-2">
                        {column.items.map((item, itemIndex) => (
                          <li key={itemIndex}>
                            <FooterNavLink item={item} />
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <>
                      {column.title ? (
                        <h3 className="font-sans text-sm font-bold text-white mb-3">
                          {column.title}
                        </h3>
                      ) : null}
                      {column.menu?.items?.length ? (
                        <ul className="space-y-2">
                          {column.menu.items.map((item, itemIndex) => (
                            <li key={itemIndex}>
                              <FooterNavLink item={item} />
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </>
                  )}
                </div>
              ))}
            </div>
          </>
        ) : null}

        <div className="mt-10 pt-8 border-t border-white/15">
          <p className="font-sans text-xs text-white/55">
            {formatCopyright(footer?.copyright, year)}
          </p>
        </div>
      </div>
    </footer>
  )
}
