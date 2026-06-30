import Link from 'next/link'
import { CONTAINER_CLASS } from '@/lib/cms'
import { categoryDisplayTitle, type CategoryOption } from '@/lib/cms/sanity-refs'
import { VATHUIS_CATALOG_PATH } from '@/lib/routes'
import { SanityImage } from '@/components/cms/SanityImage'
import { cn } from '@/lib/utils'

const MAX_CATEGORIES_DEFAULT = 5

interface VaThuisCategoryGridProps {
  categories: CategoryOption[]
  /** Optional facet slugs with counts — only categories with products are shown when provided. */
  facetSlugs?: Set<string>
  maxItems?: number
  className?: string
}

export function VaThuisCategoryGrid({
  categories,
  facetSlugs,
  maxItems = MAX_CATEGORIES_DEFAULT,
  className,
}: VaThuisCategoryGridProps) {
  const items = categories
    .filter((cat) => !facetSlugs || facetSlugs.has(cat.slug))
    .slice(0, maxItems)

  if (!items.length) return null

  return (
    <section className={cn(CONTAINER_CLASS, 'pt-6 pb-2', className)}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 lg:gap-3">
        {items.map((category) => {
          const label = categoryDisplayTitle(category)
          const href = `${VATHUIS_CATALOG_PATH}?category=${encodeURIComponent(category.slug)}`
          const image = category.image

          return (
            <Link
              key={category.slug}
              href={href}
              className={cn(
                'group flex min-h-[90px] flex-row items-stretch rounded-lg',
                'border border-va-darkgray-700 bg-va-darkgray-900',
                'hover:border-va-yellow/50 hover:bg-va-darkgray-800',
                'transition-[box-shadow,border-color,background-color] duration-200',
                'outline-none focus-visible:ring-2 focus-visible:ring-va-yellow focus-visible:ring-offset-2 focus-visible:ring-offset-va-black',
              )}
              aria-label={`${label} — bekijk VA Thuis colleges`}
            >
              <div
                className={cn(
                  'flex min-w-0 flex-1 flex-col justify-center gap-1 px-2.5 py-2 sm:px-3 sm:py-2.5',
                  image && 'border-r-[3px] border-va-yellow',
                )}
              >
                <span className="min-w-0 font-sans text-sm font-semibold leading-snug text-white transition-colors group-hover:text-va-yellow sm:text-base">
                  {label}
                </span>
                <span className="inline-flex items-center gap-0.5 font-sans text-[10px] font-bold uppercase tracking-wide text-va-gray-400 transition-colors group-hover:text-white">
                  Bekijk
                  <svg
                    className="h-3 w-3 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </span>
              </div>
              {image ? (
                <div className="relative w-[75px] shrink-0 self-stretch overflow-hidden rounded-r-lg bg-va-darkgray-800">
                  <SanityImage
                    source={image}
                    fill
                    aspectRatio=""
                    className="h-full min-h-0"
                    sizes="75px"
                  />
                </div>
              ) : null}
            </Link>
          )
        })}
      </div>
    </section>
  )
}
