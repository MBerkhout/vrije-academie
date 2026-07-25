'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

const galleryArrowClass = cn(
  'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
  'border border-va-lightgray-300 bg-white text-va-black',
  'shadow-[0_2px_10px_rgba(0,0,0,0.08)]',
  'transition-[border-color,box-shadow,transform] duration-200',
  'hover:border-va-black hover:shadow-[0_3px_12px_rgba(0,0,0,0.12)] active:scale-95',
  'disabled:opacity-35 disabled:pointer-events-none disabled:shadow-none',
  'disabled:border-va-lightgray-200 disabled:text-va-gray',
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-va-yellow',
)

const galleryArrowIconClass = 'h-[1.125rem] w-[1.125rem] shrink-0 stroke-[2.5]'

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  )
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}

interface CarouselNavButtonProps {
  direction: 'prev' | 'next'
  disabled: boolean
  onClick: () => void
  label: string
}

function CarouselNavButton({ direction, disabled, onClick, label }: CarouselNavButtonProps) {
  const Icon = direction === 'prev' ? ChevronLeftIcon : ChevronRightIcon
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={galleryArrowClass}
    >
      <Icon className={galleryArrowIconClass} />
    </button>
  )
}

interface ProductRowCarouselProps {
  children: ReactNode
  /** Accessible label for the carousel region. */
  ariaLabel: string
}

/**
 * Horizontal product carousel with snap scroll and prev/next controls.
 */
export function ProductRowCarousel({ children, ariaLabel }: ProductRowCarouselProps) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [canScrollPrev, setCanScrollPrev] = useState(false)
  const [canScrollNext, setCanScrollNext] = useState(false)

  const updateScrollState = useCallback(() => {
    const el = scrollerRef.current
    if (!el) return
    const { scrollLeft, scrollWidth, clientWidth } = el
    setCanScrollPrev(scrollLeft > 4)
    setCanScrollNext(scrollLeft + clientWidth < scrollWidth - 4)
  }, [])

  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    updateScrollState()
    el.addEventListener('scroll', updateScrollState, { passive: true })
    const ro = new ResizeObserver(updateScrollState)
    ro.observe(el)
    const raf = requestAnimationFrame(updateScrollState)
    return () => {
      cancelAnimationFrame(raf)
      el.removeEventListener('scroll', updateScrollState)
      ro.disconnect()
    }
  }, [updateScrollState, children])

  const scrollByPage = (direction: -1 | 1) => {
    const el = scrollerRef.current
    if (!el) return
    const firstSlide = el.querySelector<HTMLElement>('[data-carousel-slide]')
    const gap = 24
    const step = firstSlide ? firstSlide.offsetWidth + gap : el.clientWidth
    el.scrollBy({ left: direction * step, behavior: 'smooth' })
  }

  const showArrows = canScrollPrev || canScrollNext

  return (
    <div className="relative overflow-visible">
      <div className="flex items-stretch gap-4">
        {showArrows && (
          <div className="hidden sm:flex self-center">
            <CarouselNavButton
              direction="prev"
              disabled={!canScrollPrev}
              onClick={() => scrollByPage(-1)}
              label="Vorige producten"
            />
          </div>
        )}

        <div className="relative flex-1 min-w-0 overflow-visible">
          <div
            ref={scrollerRef}
            role="region"
            aria-label={ariaLabel}
            className={cn(
              'flex gap-6 overflow-x-auto scroll-smooth snap-x snap-mandatory items-stretch',
              'pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
            )}
          >
            {children}
          </div>

          {showArrows && (
            <>
              <div className="absolute inset-y-0 left-0 z-10 flex items-center -translate-x-1/4 sm:hidden">
                <CarouselNavButton
                  direction="prev"
                  disabled={!canScrollPrev}
                  onClick={() => scrollByPage(-1)}
                  label="Vorige producten"
                />
              </div>
              <div className="absolute inset-y-0 right-0 z-10 flex items-center translate-x-1/4 sm:hidden">
                <CarouselNavButton
                  direction="next"
                  disabled={!canScrollNext}
                  onClick={() => scrollByPage(1)}
                  label="Volgende producten"
                />
              </div>
            </>
          )}
        </div>

        {showArrows && (
          <div className="hidden sm:flex self-center">
            <CarouselNavButton
              direction="next"
              disabled={!canScrollNext}
              onClick={() => scrollByPage(1)}
              label="Volgende producten"
            />
          </div>
        )}
      </div>
    </div>
  )
}

/** Fixed slide widths (2-up below lg, 4-up from lg) keep card size stable when fewer than four items are shown. */
const PRODUCT_ROW_SLIDE_CLASS =
  'snap-start shrink-0 self-stretch flex flex-col w-[calc(50%-12px)] lg:w-[calc(25%-18px)] [&>*]:h-full'

export function ProductRowCarouselSlide({ children }: { children: ReactNode }) {
  return (
    <div data-carousel-slide className={PRODUCT_ROW_SLIDE_CLASS}>
      {children}
    </div>
  )
}
