'use client'

import { useState, type MouseEvent, type ReactNode } from 'react'
import { WaitlistModal } from '@/components/waitlist/WaitlistModal'
import { defaultMessages } from '@/lib/i18n/messages'
import { cn } from '@/lib/utils'

interface WaitlistTriggerProps {
  handle: string
  title: string
  variantId?: string | null
  label?: string
  className?: string
  children?: ReactNode
}

export function WaitlistTrigger({
  handle,
  title,
  variantId,
  label,
  className,
  children,
}: WaitlistTriggerProps) {
  const [open, setOpen] = useState(false)
  const displayLabel = label ?? defaultMessages.plp.cardSoldOut

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setOpen(true)
  }

  return (
    <>
      <button type="button" onClick={handleClick} className={cn(className)}>
        {children ?? displayLabel}
      </button>
      <WaitlistModal
        open={open}
        onClose={() => setOpen(false)}
        handle={handle}
        title={title}
        variantId={variantId}
      />
    </>
  )
}
