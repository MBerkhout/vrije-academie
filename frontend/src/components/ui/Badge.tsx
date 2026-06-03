import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Shared badge styles for the storefront.
 *
 * - **Legacy** (`purple`, `yellow`, `gray`): compact uppercase labels (e.g. dev library, marketing tags).
 * - **Content** (`category`, `record`, `online`, `freeTrial`, `popular`): PDP, PLP, checkout — sentence case / contextual.
 */
export type BadgeVariant =
  | 'purple'
  | 'yellow'
  | 'gray'
  | 'category'
  | 'record'
  | 'online'
  | 'freeTrial'
  | 'popular'

export type BadgeSize = 'compact' | 'sm' | 'md' | 'micro'

const LEGACY_VARIANTS = new Set<BadgeVariant>(['purple', 'yellow', 'gray'])

const variantColor: Record<BadgeVariant, string> = {
  purple: 'bg-va-purple text-white',
  yellow: 'bg-va-yellow text-va-black',
  gray: 'bg-va-lightgray text-va-darkgray',
  category: 'bg-va-lightgray text-va-darkgray',
  record: 'bg-va-yellow text-va-black capitalize',
  online: 'bg-green-100 text-green-800',
  freeTrial: 'bg-va-yellow/20 text-va-black',
  popular: 'bg-va-yellow text-va-black uppercase tracking-wide',
}

const sizeClasses: Record<BadgeSize, string> = {
  micro: 'text-[10px] px-2 py-0.5 font-semibold',
  compact: 'text-xs px-2 py-0.5 font-medium',
  sm: 'text-xs px-2.5 h-6 font-medium leading-none',
  md: 'text-sm px-3 h-8 font-medium leading-none',
}

export interface BadgeProps {
  children: ReactNode
  variant?: BadgeVariant
  /** Defaults: `compact` for legacy variants, `sm` for content variants, `micro` for `popular`. */
  size?: BadgeSize
  className?: string
}

function defaultSize(variant: BadgeVariant): BadgeSize {
  if (variant === 'popular') return 'micro'
  if (LEGACY_VARIANTS.has(variant)) return 'compact'
  return 'sm'
}

export function Badge({
  children,
  variant = 'purple',
  size,
  className,
}: BadgeProps) {
  const resolvedSize = size ?? defaultSize(variant)
  const isLegacy = LEGACY_VARIANTS.has(variant)
  const isFreeTrial = variant === 'freeTrial'

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center',
        variantColor[variant],
        sizeClasses[resolvedSize],
        isLegacy && 'rounded-sm uppercase tracking-wide font-semibold',
        !isLegacy && 'rounded-none',
        isFreeTrial && 'gap-1.5 w-fit',
        className
      )}
    >
      {children}
    </span>
  )
}
