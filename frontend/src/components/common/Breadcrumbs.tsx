import Link from 'next/link'
import { JsonLd } from '@/components/common/JsonLd'
import { buildBreadcrumbListFromCrumbs } from '@/lib/json-ld'
import { cn } from '@/lib/utils'

interface Crumb {
  label: string
  href?: string
}

interface BreadcrumbsProps {
  crumbs: Crumb[]
  className?: string
  /** Light text on dark backgrounds (VA Thuis). */
  dark?: boolean
}

/** Generic breadcrumb trail. Also emits BreadcrumbList JSON-LD. */
export function Breadcrumbs({ crumbs, className, dark = false }: BreadcrumbsProps) {
  return (
    <>
      <JsonLd data={buildBreadcrumbListFromCrumbs(crumbs)} />
      <nav aria-label="Breadcrumb" className={cn('py-4 text-sm', className)}>
        <ol className="flex flex-wrap items-center gap-1.5">
          {crumbs.map((crumb, i) => {
            const isLast = i === crumbs.length - 1
            return (
              <li key={crumb.href ?? crumb.label} className="flex items-center gap-1.5">
                {i > 0 && (
                  <span className={cn(dark ? 'text-va-gray-500' : 'text-va-gray')} aria-hidden="true">›</span>
                )}
                {isLast ? (
                  <span
                    className={cn(
                      'font-medium',
                      dark ? 'text-white' : 'text-va-darkgray',
                    )}
                    aria-current="page"
                  >
                    {crumb.label}
                  </span>
                ) : (
                  <Link
                    href={crumb.href ?? '#'}
                    className={cn(
                      'transition-colors',
                      dark
                        ? 'text-va-gray-300 hover:text-va-yellow'
                        : 'text-va-gray hover:text-va-black',
                    )}
                  >
                    {crumb.label}
                  </Link>
                )}
              </li>
            )
          })}
        </ol>
      </nav>
    </>
  )
}
