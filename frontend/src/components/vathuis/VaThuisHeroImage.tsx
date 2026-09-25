'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { keyOutFlatBackground } from './key-out-flat-background'

export function VaThuisHeroImage({ src }: { src: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [mode, setMode] = useState<'processing' | 'keyed' | 'original'>('processing')

  useEffect(() => {
    let cancelled = false
    setMode('processing')

    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      if (cancelled) return
      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d', { willReadFrequently: true })
      if (!canvas || !ctx) {
        setMode('original')
        return
      }

      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      ctx.drawImage(img, 0, 0)

      try {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const keyed = keyOutFlatBackground(imageData.data, canvas.width, canvas.height)
        if (!keyed) {
          setMode('original')
          return
        }
        ctx.putImageData(imageData, 0, 0)
        setMode('keyed')
      } catch {
        setMode('original')
      }
    }
    img.onerror = () => {
      if (!cancelled) setMode('original')
    }
    img.src = src

    return () => {
      cancelled = true
    }
  }, [src])

  if (mode === 'original') {
    return (
      <Image
        src={src}
        alt=""
        fill
        className="object-contain"
        sizes="(max-width: 1024px) 100vw, 50vw"
        priority
      />
    )
  }

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={`absolute inset-0 h-full w-full object-contain ${mode === 'keyed' ? '' : 'opacity-0'}`}
    />
  )
}
