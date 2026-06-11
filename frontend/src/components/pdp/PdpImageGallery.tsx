'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import type { PdpGalleryImage } from '@/components/pdp/pdp-gallery-images'

export type { PdpGalleryImage } from '@/components/pdp/pdp-gallery-images'

interface PdpImageGalleryProps {
  images: PdpGalleryImage[]
  title: string
}

const TILE_CLASS =
  'relative aspect-[3/2] w-full overflow-hidden rounded-none bg-va-lightgray'

/** Compact artwork gallery for the PDP — side-by-side thumbnails with optional info captions. */
export function PdpImageGallery({ images, title }: PdpImageGalleryProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const galleryRef = useRef<HTMLDivElement>(null)

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

  if (images.length === 0) return null

  return (
    <div ref={galleryRef} className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 md:gap-5">
      {images.map((image, i) => {
        const hasCaption = Boolean(image.caption?.trim())
        const isOpen = openIndex === i

        return (
          <div key={`${image.url}-${i}`} className={TILE_CLASS}>
            <Image
              src={image.url}
              alt={`${title} ${i + 1}`}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 50vw, 25vw"
              priority={i === 0}
            />

            {hasCaption && (
              <div className="absolute bottom-1.5 right-1.5">
                <button
                  type="button"
                  aria-label={`Informatie bij afbeelding ${i + 1}`}
                  aria-expanded={isOpen}
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[11px] font-sans font-bold leading-none text-va-black shadow-sm transition-colors hover:bg-va-yellow"
                >
                  i
                </button>

                {isOpen && (
                  <div
                    role="tooltip"
                    className="absolute bottom-full right-0 z-10 mb-1.5 w-48 rounded-none border border-va-lightgray bg-white p-2 text-left text-xs leading-snug text-va-black shadow-md"
                  >
                    {image.caption}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
