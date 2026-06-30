import Image from 'next/image'
import Link from 'next/link'
import { vathuisProductPath } from '@/lib/routes'
import type { EventCard } from '@/lib/commerce/types'
import { plpListingStockPresentation } from '@/lib/event-status-presentation'
import { formatPriceEur } from '@/lib/locale-format'
import { cn } from '@/lib/utils'
import { ProductCardCtaBar } from '@/components/plp/ProductCardCtaBar'
import { PlpEventCardWishlistButton } from '@/components/plp/PlpEventCardWishlistButton'

interface VaThuisEventCardProps {
  event: EventCard
  stockThreshold: number
  className?: string
  equalizeHeight?: boolean
}

function vathuisMetaLine(event: EventCard): string | null {
  const label = event.vathuis?.episode_count_label?.trim()
  const playTime = event.vathuis?.play_time?.trim()
  if (label && playTime) return `${label} · ${playTime}`
  return label || playTime || null
}

export function VaThuisEventCard({
  event,
  stockThreshold,
  className,
  equalizeHeight = false,
}: VaThuisEventCardProps) {
  const href = vathuisProductPath(event.handle)
  const meta = vathuisMetaLine(event)
  const { soldOut } = plpListingStockPresentation(
    event.min_available_quantity,
    stockThreshold
  )
  const priceFrom = event.price_from

  return (
    <article
      className={cn(
        'relative group rounded-lg border border-va-darkgray-700 overflow-hidden flex flex-col bg-va-darkgray-900 hover:border-va-darkgray-600 transition-colors',
        equalizeHeight && 'h-full',
        soldOut && 'opacity-70',
        className,
      )}
    >
      <div className="relative aspect-[4/3] bg-va-darkgray-800 overflow-hidden">
        {event.thumbnail ? (
          <Image
            src={event.thumbnail}
            alt=""
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-va-darkgray-800">
            <img
              src="/branding/logo.svg"
              alt=""
              width={233}
              height={167}
              className="h-12 w-auto opacity-40"
            />
          </div>
        )}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          aria-hidden
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-va-yellow text-va-black shadow-lg">
            <svg viewBox="0 0 24 24" className="h-5 w-5 ml-0.5" fill="currentColor" aria-hidden>
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </div>
        <PlpEventCardWishlistButton handle={event.handle} />
      </div>

      <div className="p-3 md:p-4 flex flex-col gap-1.5 flex-1">
        <h3
          className={cn(
            'font-sans font-bold text-white text-sm leading-snug line-clamp-3 md:text-base md:line-clamp-2',
            equalizeHeight && 'min-h-[3.75rem] md:min-h-[2.5rem]',
          )}
        >
          <Link
            href={href}
            className="transition-colors hover:text-va-yellow group-hover:text-va-yellow after:absolute after:inset-0 after:content-['']"
          >
            {event.title}
          </Link>
        </h3>

        {meta ? (
          <p className="text-xs text-va-gray-300">{meta}</p>
        ) : equalizeHeight ? (
          <div className="min-h-[1rem]" aria-hidden />
        ) : null}

        <div className="mt-auto pt-2 flex items-end justify-between gap-2">
          <div className="flex flex-col gap-0.5 min-w-0">
            {priceFrom ? (
              <span className="text-sm font-semibold text-white">
                {formatPriceEur(priceFrom)}
              </span>
            ) : null}
            {soldOut && (
              <span className="text-xs text-va-gray-400">Uitverkocht</span>
            )}
          </div>
          <span className="text-xs md:text-sm font-medium text-white/80 flex items-center gap-1 group-hover:text-va-yellow transition-colors shrink-0">
            <span className="md:hidden">Bekijk →</span>
            <span className="hidden md:inline">Bekijk meer →</span>
          </span>
        </div>
      </div>

      <ProductCardCtaBar event={event} className="border-t border-va-darkgray-700" />
    </article>
  )
}
