'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui'
import {
  hubSpotCtaTriggerClass,
  refreshHubSpotCtas,
  whenHubSpotCtasReady,
} from '@/lib/hubspot/hubspot-cta'

export function HubSpotCtaTriggerButton({
  ctaId,
  children = 'Inschrijven',
}: {
  ctaId: string
  children?: React.ReactNode
}) {
  useEffect(() => {
    whenHubSpotCtasReady(refreshHubSpotCtas)
  }, [ctaId])

  return (
    <Button type="button" variant="primary" className={hubSpotCtaTriggerClass(ctaId)}>
      {children}
    </Button>
  )
}
