import Link from 'next/link'
import type { GeneralSettings, MenuItem } from '@/lib/cms/types'
import { isExternalHref, resolveMenuItemHref } from '@/lib/menu-href'

function findTermsLink(items: MenuItem[]): MenuItem | undefined {
  return items.find((i) => /voorwaarden|terms of/i.test(i.label))
}

interface CheckoutShellFooterProps {
  settings: GeneralSettings | null
}

export function CheckoutShellFooter({ settings }: CheckoutShellFooterProps) {
  const items = settings?.footer?.topMenuSecondary?.items ?? []
  const terms = findTermsLink(items)
  const href = terms ? resolveMenuItemHref(terms) : '/algemene-voorwaarden'
  const label = terms?.label?.trim() || 'Algemene voorwaarden'

  return (
    <footer className="border-t border-va-lightgray-300 bg-va-lightgray-100 mt-auto">
      <div className="max-w-[1240px] mx-auto px-4 md:px-8 min-[1240px]:px-0 py-6">
        {isExternalHref(href) ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="font-sans text-sm text-va-darkgray hover:text-va-black underline underline-offset-2"
          >
            {label}
          </a>
        ) : (
          <Link
            href={href}
            className="font-sans text-sm text-va-darkgray hover:text-va-black underline underline-offset-2"
          >
            {label}
          </Link>
        )}
      </div>
    </footer>
  )
}
