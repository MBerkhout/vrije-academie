'use client'

import type { MouseEvent } from 'react'
import { useWishlist } from '@/lib/commerce/useWishlist'
import { defaultMessages } from '@/lib/i18n'
import { cn } from '@/lib/utils'

interface PlpEventCardWishlistButtonProps {
  handle: string
  className?: string
}

export function PlpEventCardWishlistButton({ handle, className }: PlpEventCardWishlistButtonProps) {
  const { isInWishlist, pendingHandle, toggle } = useWishlist()

  const saved = isInWishlist(handle)
  const busy = pendingHandle === handle
  const t = defaultMessages.pdp
  const ariaLabel = saved ? t.wishlistToggleRemoveAria : t.wishlistToggleAddAria

  const handleClick = (event: MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    void toggle(handle)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      aria-pressed={saved}
      aria-label={ariaLabel}
      className={cn(
        'absolute top-2 right-2 z-20 inline-flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(255,255,255,0.7)] text-va-black shadow-sm transition-colors hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
    >
      <svg
        className="h-4 w-4 shrink-0"
        fill={saved ? 'currentColor' : 'none'}
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
    </button>
  )
}
