'use client'

import { useIsPresentationTool } from 'next-sanity/hooks'

export function DisableDraftMode() {
  const isPresentationTool = useIsPresentationTool()

  if (isPresentationTool) return null

  return (
    <a
      href="/api/draft/disable"
      className="fixed bottom-4 right-4 z-50 rounded-full bg-va-black px-4 py-2 text-sm text-white hover:bg-va-darkgray transition-colors"
    >
      Disable Draft Mode
    </a>
  )
}
