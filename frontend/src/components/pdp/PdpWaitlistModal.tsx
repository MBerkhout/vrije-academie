'use client'

import { WaitlistModal } from '@/components/waitlist/WaitlistModal'
import type { EventCard } from '@/lib/commerce/types'

interface PdpWaitlistModalProps {
  open: boolean
  onClose: () => void
  event: EventCard
  variantId?: string | null
}

/** @deprecated Prefer `WaitlistModal` with handle/title props. */
export function PdpWaitlistModal({ open, onClose, event, variantId }: PdpWaitlistModalProps) {
  return (
    <WaitlistModal
      open={open}
      onClose={onClose}
      handle={event.handle}
      title={event.title}
      variantId={variantId}
    />
  )
}
