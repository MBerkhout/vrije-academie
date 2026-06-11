import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface PromoBannerProps {
  title?: string
  subtitle?: string
  image?: { asset?: { url: string } }
  ctaLabel?: string
  ctaHref?: string
  /** 'yellow' | 'purple' | 'black' — defaults to 'yellow' */
  theme?: 'yellow' | 'purple' | 'black'
  className?: string
  /** PDP: square CTA (no border radius) */
  squareCorners?: boolean
}

const THEME_CLASSES: Record<string, string> = {
  yellow: 'bg-va-yellow text-va-black',
  purple: 'bg-va-purple text-white',
  black: 'bg-va-black text-white',
}

const CTA_CLASSES: Record<string, string> = {
  yellow: 'bg-va-black text-white hover:bg-va-black/80',
  purple: 'bg-white text-va-purple hover:bg-white/90',
  black: 'bg-va-yellow text-va-black hover:bg-va-yellow/90',
}

/** Reusable promo / urgency banner used on PLP and PDP. */
export function PromoBanner({
  title,
  subtitle,
  image,
  ctaLabel,
  ctaHref,
  theme = 'yellow',
  className,
  squareCorners = false,
}: PromoBannerProps) {
  if (!title && !subtitle) return null
  const themeClass = THEME_CLASSES[theme] ?? THEME_CLASSES.yellow
  const ctaClass = CTA_CLASSES[theme] ?? CTA_CLASSES.yellow

  return (
    <div className={cn('relative w-full overflow-hidden mt-4', themeClass, className)}>
      {image?.asset?.url && (
        <div className="absolute inset-0">
          <Image
            src={image.asset.url}
            alt={title ?? ''}
            fill
            className="object-cover opacity-20"
            sizes="100vw"
          />
        </div>
      )}
      <div className="relative max-w-[1240px] mx-auto px-4 md:px-8 py-8 md:py-12 flex flex-col gap-3">
        {title && (
          <h2 className="font-sans text-xl md:text-3xl font-bold">
            {title}
          </h2>
        )}
        {subtitle && (
          <p className="opacity-90 max-w-xl">{subtitle}</p>
        )}
        {ctaLabel && ctaHref && (
          <Link
            href={ctaHref}
            className={cn(
              'mt-2 inline-flex items-center gap-2 px-5 py-2.5 font-medium text-sm transition-colors w-fit',
              squareCorners ? 'rounded-none' : 'rounded',
              ctaClass,
            )}
          >
            {ctaLabel}
          </Link>
        )}
      </div>
    </div>
  )
}
