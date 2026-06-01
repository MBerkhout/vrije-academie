import Link from 'next/link'
import { cn } from '@/lib/utils'

interface Crumb {
  label: string
  href: string
}

interface PlpBreadcrumbsProps {
  crumbs: Crumb[]
  className?: string
}

export function PlpBreadcrumbs({ crumbs, className }: PlpBreadcrumbsProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn('py-4 text-sm', className)}
    >
      <ol className="flex flex-wrap items-center gap-1.5">
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1
          return (
            <li key={crumb.href} className="flex items-center gap-1.5">
              {i > 0 && (
                <span className="text-va-gray" aria-hidden="true">›</span>
              )}
              {isLast ? (
                <span className="text-va-darkgray font-medium" aria-current="page">
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="text-va-gray hover:text-va-black transition-colors"
                >
                  {crumb.label}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
