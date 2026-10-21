'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui'
import { HubSpotFormEmbed } from '@/components/hubspot/HubSpotFormEmbed'
import type { HeroNewsletterPopupConfig } from '@/lib/hubspot/resolve-hero-newsletter-popup'
import { hubSpotWebInteractiveIframeSrc } from '@/lib/hubspot/hubspot-web-interactive'

export function HubSpotNewsletterPopup({
  config,
  triggerLabel = 'Inschrijven',
}: {
  config: HeroNewsletterPopupConfig
  triggerLabel?: string
}) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const portalId = process.env.NEXT_PUBLIC_HUBSPOT_PORTAL_ID?.trim()
  const region = process.env.NEXT_PUBLIC_HUBSPOT_REGION?.trim() || 'eu1'

  const [parentPageUrl, setParentPageUrl] = useState('')

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  const interactiveSrc = useMemo(() => {
    if (config.mode !== 'interactive' || !open || !portalId || !parentPageUrl) return null
    return hubSpotWebInteractiveIframeSrc(portalId, config.ctaId, parentPageUrl, region)
  }, [config, open, parentPageUrl, portalId, region])

  const openPopup = () => {
    setParentPageUrl(window.location.href)
    setOpen(true)
  }

  return (
    <>
      <Button type="button" variant="primary" onClick={openPopup}>
        {triggerLabel}
      </Button>
      {mounted && open
        ? createPortal(
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="presentation">
              <button
                type="button"
                className="absolute inset-0 bg-black/40"
                aria-label="Sluiten"
                onClick={() => setOpen(false)}
              />
              {config.mode === 'interactive' ? (
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-label="Nieuwsbrief"
                  className="relative z-[101] w-full max-w-4xl h-[min(90vh,640px)] bg-white shadow-xl overflow-hidden rounded-lg"
                >
                  {portalId && interactiveSrc ? (
                    <iframe
                      src={interactiveSrc}
                      title="Nieuwsbrief"
                      aria-label="Popup CTA"
                      allow="autoplay; fullscreen; clipboard-write"
                      className="h-full w-full border-0"
                    />
                  ) : (
                    <p className="p-6 font-sans text-sm text-va-gray text-center">
                      HubSpot pop-up is niet geconfigureerd (NEXT_PUBLIC_HUBSPOT_PORTAL_ID ontbreekt).
                    </p>
                  )}
                </div>
              ) : (
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-label="Nieuwsbrief"
                  className="relative z-[101] w-full max-w-lg max-h-[90vh] overflow-y-auto border border-va-lightgray bg-white p-6 shadow-xl rounded-lg"
                >
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <h2 className="font-sans text-lg font-bold text-va-black text-balance">
                      Schrijf je hier in voor onze nieuwsbrief!
                    </h2>
                    <button
                      type="button"
                      className="font-sans text-sm text-va-gray hover:text-va-black shrink-0"
                      onClick={() => setOpen(false)}
                    >
                      Sluiten
                    </button>
                  </div>
                  <HubSpotFormEmbed formId={config.formId} />
                </div>
              )}
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
