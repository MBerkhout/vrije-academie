import Link from 'next/link'
import { cn } from '@/lib/utils'
import { PLP_BASE_PATH } from '@/lib/routes'

interface PlpEmptyStateProps {
  heading?: string
  subtext?: string
  hasFilters?: boolean
  className?: string
  basePath?: string
}

export function PlpEmptyState({
  heading = 'Geen activiteiten gevonden.',
  subtext = 'Probeer een andere zoekopdracht of pas je filters aan.',
  hasFilters = false,
  className,
  basePath = PLP_BASE_PATH,
}: PlpEmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-20 text-center gap-4', className)}>
      <div className="text-5xl text-va-lightgray" aria-hidden="true">🔍</div>
      <h2 className="font-sans text-xl font-bold text-va-black">{heading}</h2>
      <p className="text-sm text-va-gray max-w-sm">{subtext}</p>
      <div className="flex gap-3 mt-2">
        {hasFilters && (
          <Link
            href={basePath}
            className="text-sm font-medium text-va-black border border-va-lightgray px-4 py-2 hover:bg-va-lightgray transition-colors"
          >
            Wis filters
          </Link>
        )}
        <Link
          href={basePath}
          className="text-sm font-medium bg-va-yellow text-va-black px-4 py-2 hover:bg-va-yellow/80 transition-colors"
        >
          Bekijk alles
        </Link>
      </div>
    </div>
  )
}
