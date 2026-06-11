'use client'

import { useState } from 'react'
import { BlockWrapper } from '@/components/cms/BlockWrapper'
import { cleanBlockValue, getTitleTag, getTitleSizeClass, type ReviewBlock as ReviewBlockType } from '@/lib/cms'
import { cn } from '@/lib/utils'

const arrowBtnClass =
  'shrink-0 self-center rounded-md p-3 md:p-3.5 text-2xl md:text-3xl font-semibold leading-none text-va-black hover:bg-va-lightgray-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-va-yellow min-w-[2.75rem] md:min-w-[3.25rem]'

export function ReviewBlock({ block }: { block: ReviewBlockType }) {
  const reviews = block.reviews ?? []
  const [index, setIndex] = useState(0)
  const review = reviews[index]
  const Tag = getTitleTag(block.titleSize)
  /** Default matches Sanity `initialValue`; clean for Draft Mode / Visual Editing stega on string fields. */
  const rawNav = cleanBlockValue(block.navigationStyle)
  const navigationStyle: 'arrows' | 'dots' | 'both' =
    rawNav === 'dots' || rawNav === 'both' || rawNav === 'arrows' ? rawNav : 'arrows'

  const showRating = block.ratingDisplay && block.ratingValue != null
  const multi = reviews.length > 1
  const showArrows = multi && (navigationStyle === 'arrows' || navigationStyle === 'both')
  const showDots = multi && (navigationStyle === 'dots' || navigationStyle === 'both')

  const reviewCard = review ? (
    <blockquote
      className={cn(
        'relative rounded-none border border-va-lightgray-300 border-b-[6px] border-b-va-yellow bg-va-yellow-50',
        'shadow-md',
        'px-6 py-6 md:px-8 md:py-8',
        'before:pointer-events-none before:absolute before:left-4 before:top-4 before:font-sans before:text-5xl before:leading-none before:text-va-yellow/35 before:content-["“"] md:before:left-6 md:before:top-5 md:before:text-6xl',
        'pt-10 md:pt-12'
      )}
    >
      <p className="font-sans text-va-darkgray mb-4 text-pretty relative z-[1]">&ldquo;{review.quote}&rdquo;</p>
      <footer className="flex flex-wrap items-center gap-3 gap-y-1 relative z-[1]">
        {review.starRating != null && (
          <span className="flex gap-0.5 text-va-yellow" aria-hidden>
            {Array.from({ length: review.starRating }).map((_, i) => (
              <span key={i}>★</span>
            ))}
          </span>
        )}
        <div>
          <cite className="font-sans font-semibold not-italic">{review.authorName}</cite>
          {review.authorSubtitle && <p className="text-sm text-va-gray">{review.authorSubtitle}</p>}
        </div>
      </footer>
    </blockquote>
  ) : null

  const dotsNav = showDots ? (
    <div className="flex justify-center gap-2 mt-4">
      {reviews.map((_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => setIndex(i)}
          aria-label={`Go to review ${i + 1}`}
          aria-current={i === index}
          className={cn('w-2 h-2 rounded-full', i === index ? 'bg-va-yellow' : 'bg-va-gray')}
        />
      ))}
    </div>
  ) : null

  const carouselInner =
    multi && showArrows ? (
      <div className="flex items-stretch gap-1 sm:gap-2 md:gap-3">
        <button
          type="button"
          onClick={() => setIndex((i) => (i - 1 + reviews.length) % reviews.length)}
          aria-label="Previous review"
          className={arrowBtnClass}
        >
          {'<'}
        </button>
        <div className="flex-1 min-w-0 flex flex-col">
          {reviewCard}
          {dotsNav}
        </div>
        <button
          type="button"
          onClick={() => setIndex((i) => (i + 1) % reviews.length)}
          aria-label="Next review"
          className={arrowBtnClass}
        >
          {'>'}
        </button>
      </div>
    ) : (
      <>
        {reviewCard}
        {dotsNav}
      </>
    )

  return (
    <BlockWrapper block={block}>
      <div className={cn('mx-auto', showRating ? 'max-w-3xl md:max-w-5xl' : 'max-w-3xl')}>
        {block.title && (
          <Tag className={cn(getTitleSizeClass(block.titleSize), 'font-sans font-bold text-va-black mb-6')}>
            {block.title}
          </Tag>
        )}
        <div className={cn(showRating && 'flex flex-col md:flex-row md:items-center md:gap-8 lg:gap-10')}>
          {showRating && (
            <div
              className={cn(
                'mb-6 md:mb-0 md:flex-shrink-0 md:max-w-[13rem]',
                'rounded-none border border-va-lightgray-300 border-b-[6px] border-b-va-yellow bg-va-white',
                'p-5 md:p-6 shadow-sm'
              )}
            >
              <p className="text-4xl md:text-5xl font-bold text-va-yellow leading-none tabular-nums">{block.ratingValue}</p>
              {block.ratingLabel && (
                <p className="mt-2 font-sans text-va-black text-sm md:text-base leading-snug">{block.ratingLabel}</p>
              )}
            </div>
          )}
          <div className={cn('min-w-0', showRating && 'flex-1')}>
            <div role="region" aria-label="Reviews carousel" className="relative">
              {carouselInner}
            </div>
          </div>
        </div>
      </div>
    </BlockWrapper>
  )
}
