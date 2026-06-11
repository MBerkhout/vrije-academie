'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

const arrowBtnClass =
  'shrink-0 rounded-md p-3 text-2xl font-semibold leading-none text-va-black hover:bg-va-lightgray-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-va-yellow min-w-[2.75rem] disabled:opacity-30 disabled:pointer-events-none'

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
    <div className="relative">
      <div className="flex items-stretch gap-2">
        {showArrows && (
          <button
            type="button"
            onClick={() => scrollByPage(-1)}
            disabled={!canScrollPrev}
            aria-label="Vorige producten"
            className={cn(arrowBtnClass, 'hidden sm:inline-flex self-center')}
          >
            {'<'}
          </button>
        )}

        <div
          ref={scrollerRef}
          role="region"
          aria-label={ariaLabel}
          className={cn(
            'flex-1 min-w-0 flex gap-6 overflow-x-auto scroll-smooth snap-x snap-mandatory items-stretch',
            'pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
          )}
        >
          {children}
        </div>

        {showArrows && (
          <button
            type="button"
            onClick={() => scrollByPage(1)}
            disabled={!canScrollNext}
            aria-label="Volgende producten"
            className={cn(arrowBtnClass, 'hidden sm:inline-flex self-center')}
          >
            {'>'}
          </button>
        )}
      </div>
    </div>
  )
}

export function ProductRowCarouselSlide({ children }: { children: ReactNode }) {
  return (
    <div
      data-carousel-slide
      className="snap-start shrink-0 self-stretch flex flex-col w-[calc(100%-0px)] sm:w-[calc(50%-12px)] xl:w-[calc(25%-18px)] [&>*]:h-full"
    >
      {children}
    </div>
  )
}
