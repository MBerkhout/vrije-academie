'use client'

import Image from 'next/image'
import { useCallback, useEffect, useRef, useState } from 'react'
import { formatPdpGalleryCaption, type PdpGalleryImage } from '@/components/pdp/pdp-gallery-images'
import { cn } from '@/lib/utils'

export type { PdpGalleryImage } from '@/components/pdp/pdp-gallery-images'

interface PdpImageGalleryProps {
  images: PdpGalleryImage[]
  title: string
}

const TILE_CLASS =
  'relative aspect-[3/2] w-full overflow-hidden rounded-none bg-va-lightgray'

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

function GalleryTile({
  image,
  index,
  title,
  openIndex,
}: {
  image: PdpGalleryImage
  index: number
  title: string
  openIndex: number | null
}) {
  const rawCaption = image.caption?.trim() ?? ''
  const hasCaption = Boolean(rawCaption)
  const isOpen = openIndex === index
  const captionId = `pdp-gallery-caption-${index}`
  const captionText = hasCaption ? formatPdpGalleryCaption(rawCaption) : ''

  return (
    <div className="group relative">
      <div className={TILE_CLASS}>
        <Image
          src={image.url}
          alt={captionText ? captionText.replace(/\n/g, ' — ') : `${title} ${index + 1}`}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 60vw, 25vw"
          priority={index === 0}
        />
      </div>

      {hasCaption && (
        <div
          id={captionId}
          aria-hidden
          className={cn(
            'bg-white p-2 text-left text-[14px] leading-snug text-va-black',
            'whitespace-pre-line line-clamp-4 shadow-[0_2px_10px_rgba(0,0,0,0.08)]',
            isOpen ? 'mt-2 max-sm:block' : 'max-sm:hidden',
            'sm:pointer-events-none sm:absolute sm:left-0 sm:right-0 sm:top-full sm:z-20 sm:mt-1.5 sm:opacity-0',
            'sm:transition-opacity sm:duration-200',
            'sm:group-hover:pointer-events-auto sm:group-hover:opacity-100',
            'sm:group-focus-within:pointer-events-auto sm:group-focus-within:opacity-100',
          )}
        >
          {captionText}
        </div>
      )}
    </div>
  )
}

/** Compact artwork gallery for the PDP — carousel on mobile, row of thumbnails from `sm` up. */
export function PdpImageGallery({ images, title }: PdpImageGalleryProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const galleryRef = useRef<HTMLDivElement>(null)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [canScrollPrev, setCanScrollPrev] = useState(false)
  const [canScrollNext, setCanScrollNext] = useState(false)
  const didDragRef = useRef(false)
  const snapTimerRef = useRef<number | null>(null)
  const pointerStartRef = useRef<{ x: number; y: number; scrollLeft: number; index: number } | null>(null)

  const getSlides = useCallback(() => {
    const el = scrollerRef.current
    if (!el) return []
    return Array.from(el.querySelectorAll<HTMLElement>('[data-gallery-slide]'))
  }, [])

  const getSlideScrollLeft = useCallback((slide: HTMLElement) => {
    const el = scrollerRef.current
    if (!el) return 0

    const scrollerRect = el.getBoundingClientRect()
    const slideRect = slide.getBoundingClientRect()
    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth)
    const left = el.scrollLeft + (slideRect.left - scrollerRect.left)
    return Math.max(0, Math.min(left, maxScroll))
  }, [])

  const findNearestSlideIndex = useCallback(() => {
    const el = scrollerRef.current
    const slides = getSlides()
    if (!el || slides.length === 0) return 0

    const { scrollLeft, scrollWidth, clientWidth } = el
    if (scrollLeft <= 4) return 0
    if (scrollLeft + clientWidth >= scrollWidth - 4) return slides.length - 1

    const scrollerRect = el.getBoundingClientRect()
    let best = 0
    let minDist = Infinity
    for (let i = 0; i < slides.length; i++) {
      const dist = Math.abs(slides[i].getBoundingClientRect().left - scrollerRect.left)
      if (dist < minDist) {
        minDist = dist
        best = i
      }
    }
    return best
  }, [getSlides])

  const updateScrollState = useCallback(() => {
    const el = scrollerRef.current
    if (!el) return
    const { scrollLeft, scrollWidth, clientWidth } = el
    const atStart = scrollLeft <= 4
    const atEnd = scrollLeft + clientWidth >= scrollWidth - 4
    setCanScrollPrev(!atStart)
    setCanScrollNext(!atEnd)
    setActiveIndex(findNearestSlideIndex())
  }, [findNearestSlideIndex])

  const scrollToIndex = useCallback(
    (index: number) => {
      const el = scrollerRef.current
      const slides = getSlides()
      const clamped = Math.max(0, Math.min(slides.length - 1, index))
      const target = slides[clamped]
      if (!el || !target) return

      const left = getSlideScrollLeft(target)
      if (Math.abs(el.scrollLeft - left) < 2) return

      const previousSnap = el.style.scrollSnapType
      el.style.scrollSnapType = 'none'
      el.scrollTo({ left, behavior: 'smooth' })

      const restoreSnap = () => {
        el.style.scrollSnapType = previousSnap
      }
      if ('onscrollend' in el) {
        el.addEventListener('scrollend', restoreSnap, { once: true })
      } else {
        window.setTimeout(restoreSnap, 350)
      }
    },
    [getSlides, getSlideScrollLeft],
  )

  const snapToNearestSlide = useCallback(() => {
    scrollToIndex(findNearestSlideIndex())
  }, [findNearestSlideIndex, scrollToIndex])

  const scheduleSnapAfterScroll = useCallback(() => {
    if (snapTimerRef.current != null) {
      window.clearTimeout(snapTimerRef.current)
    }
    snapTimerRef.current = window.setTimeout(() => {
      snapToNearestSlide()
    }, 80)
  }, [snapToNearestSlide])

  useEffect(() => {
    if (openIndex === null) return

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      if (!galleryRef.current?.contains(event.target as Node)) {
        setOpenIndex(null)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
    }
  }, [openIndex])

  useEffect(() => {
    setOpenIndex(null)
  }, [activeIndex])

  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return

    const onScroll = () => {
      updateScrollState()
      scheduleSnapAfterScroll()
    }

    updateScrollState()
    el.addEventListener('scroll', onScroll, { passive: true })

    const onScrollEnd = () => {
      snapToNearestSlide()
    }
    if ('onscrollend' in el) {
      el.addEventListener('scrollend', onScrollEnd)
    }

    const ro = new ResizeObserver(updateScrollState)
    ro.observe(el)

    return () => {
      el.removeEventListener('scroll', onScroll)
      if ('onscrollend' in el) {
        el.removeEventListener('scrollend', onScrollEnd)
      }
      ro.disconnect()
      if (snapTimerRef.current != null) {
        window.clearTimeout(snapTimerRef.current)
      }
    }
  }, [updateScrollState, scheduleSnapAfterScroll, snapToNearestSlide, images.length])

  const scrollByPage = useCallback(
    (direction: -1 | 1) => {
      scrollToIndex(activeIndex + direction)
    },
    [activeIndex, scrollToIndex],
  )

  const handleScrollerPointerDown = (clientX: number, clientY: number) => {
    const el = scrollerRef.current
    didDragRef.current = false
    pointerStartRef.current = el
      ? { x: clientX, y: clientY, scrollLeft: el.scrollLeft, index: findNearestSlideIndex() }
      : null
  }

  const handleScrollerPointerMove = (clientX: number, clientY: number) => {
    const start = pointerStartRef.current
    if (!start) return
    if (Math.hypot(clientX - start.x, clientY - start.y) > 8) {
      didDragRef.current = true
    }
  }

  const handleScrollerPointerUp = (clientX: number) => {
    const el = scrollerRef.current
    const start = pointerStartRef.current
    pointerStartRef.current = null

    if (el && start && didDragRef.current) {
      const deltaX = clientX - start.x
      const scrollDelta = el.scrollLeft - start.scrollLeft
      const dragThreshold = 36

      if (scrollDelta > dragThreshold || deltaX < -dragThreshold) {
        scrollToIndex(start.index + 1)
        window.requestAnimationFrame(() => {
          didDragRef.current = false
        })
        return
      }
      if (scrollDelta < -dragThreshold || deltaX > dragThreshold) {
        scrollToIndex(start.index - 1)
        window.requestAnimationFrame(() => {
          didDragRef.current = false
        })
        return
      }
    }

    scheduleSnapAfterScroll()

    window.requestAnimationFrame(() => {
      didDragRef.current = false
    })
  }

  if (images.length === 0) return null

  const showMobileControls = images.length > 1

  return (
    <div ref={galleryRef}>
      {/* Mobile: left-aligned peek carousel */}
      <div className="sm:hidden">
        <div
          ref={scrollerRef}
          role="region"
          aria-label={`Afbeeldingen bij ${title}`}
          className={cn(
            'flex touch-pan-x gap-3 overflow-x-auto scroll-smooth snap-x snap-mandatory snap-start',
            'cursor-grab active:cursor-grabbing',
            'pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
          )}
          onPointerDown={(e) => handleScrollerPointerDown(e.clientX, e.clientY)}
          onPointerMove={(e) => handleScrollerPointerMove(e.clientX, e.clientY)}
          onPointerUp={(e) => handleScrollerPointerUp(e.clientX)}
          onPointerCancel={(e) => handleScrollerPointerUp(e.clientX)}
        >
          {images.map((image, i) => {
            const isActive = i === activeIndex
            const hasCaption = Boolean(image.caption?.trim())
            const isCaptionOpen = openIndex === i
            return (
            <div
              key={`${image.url}-${i}`}
              data-gallery-slide
              data-gallery-index={i}
              role="button"
              tabIndex={0}
              aria-label={
                isActive && hasCaption
                  ? isCaptionOpen
                    ? `Verberg bijschrift bij afbeelding ${i + 1}`
                    : `Toon bijschrift bij afbeelding ${i + 1}`
                  : `Ga naar afbeelding ${i + 1}`
              }
              aria-current={isActive ? 'true' : undefined}
              aria-expanded={isActive && hasCaption ? isCaptionOpen : undefined}
              onClick={(e) => {
                e.stopPropagation()
                if (didDragRef.current) return
                if (!isActive) {
                  scrollToIndex(i)
                  return
                }
                if (hasCaption) {
                  setOpenIndex(isCaptionOpen ? null : i)
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  if (!isActive) {
                    scrollToIndex(i)
                    return
                  }
                  if (hasCaption) {
                    setOpenIndex(isCaptionOpen ? null : i)
                  }
                }
              }}
              className={cn(
                'w-[calc(60%-6px)] shrink-0 snap-start',
                !isActive && 'cursor-pointer',
              )}
            >
              <GalleryTile
                image={image}
                index={i}
                title={title}
                openIndex={openIndex}
              />
            </div>
            )
          })}
        </div>

        {showMobileControls && (
          <div className="mt-3 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => scrollByPage(-1)}
              disabled={!canScrollPrev}
              aria-label="Vorige afbeelding"
              className={galleryArrowClass}
            >
              <ChevronLeftIcon className={galleryArrowIconClass} />
            </button>

            <div className="flex items-center justify-center gap-2" role="tablist" aria-label="Galerij pagina">
              {images.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  aria-label={`Ga naar afbeelding ${i + 1}`}
                  aria-selected={i === activeIndex}
                  onClick={() => scrollToIndex(i)}
                  className={cn(
                    'h-2 w-2 rounded-full transition-colors',
                    i === activeIndex ? 'bg-va-yellow' : 'bg-va-gray/45 hover:bg-va-gray/70',
                  )}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={() => scrollByPage(1)}
              disabled={!canScrollNext}
              aria-label="Volgende afbeelding"
              className={galleryArrowClass}
            >
              <ChevronRightIcon className={galleryArrowIconClass} />
            </button>
          </div>
        )}
      </div>

      {/* Tablet/desktop: side-by-side row */}
      <div className="hidden sm:grid sm:grid-cols-4 sm:gap-4 sm:overflow-visible md:gap-5">
        {images.map((image, i) => (
          <GalleryTile
            key={`${image.url}-${i}`}
            image={image}
            index={i}
            title={title}
            openIndex={openIndex}
          />
        ))}
      </div>
    </div>
  )
}
