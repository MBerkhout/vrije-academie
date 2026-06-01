'use client'

import { usePathname } from 'next/navigation'
import { CheckoutOrderSummaryClient } from '@/components/checkout/CheckoutOrderSummaryClient'
import type { GeneralSettings } from '@/lib/cms/types'
import type { CheckoutHelpContact } from '@/components/checkout/CheckoutOrderSummary'

type OrderSummaryLabels = NonNullable<NonNullable<GeneralSettings['checkout']>['orderSummary']>

interface CheckoutContentWithSummaryProps {
  children: React.ReactNode
  labels?: OrderSummaryLabels
  trust?: {
    secure?: string
    cancellation?: string
    support?: string
    cancellationDays?: number
  }
  helpContact?: CheckoutHelpContact
}

export function CheckoutContentWithSummary({
  children,
  labels,
  trust,
  helpContact,
}: CheckoutContentWithSummaryProps) {
  const pathname = usePathname()
  const isPaymentStep = pathname === '/checkout/betaling'

  return (
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-3 lg:gap-8 lg:items-start">
      <div className="lg:col-span-2">{children}</div>
      <div className="lg:sticky lg:top-24">
        <CheckoutOrderSummaryClient
          labels={labels}
          trust={trust}
          helpContact={helpContact}
          variant={isPaymentStep ? 'helpTrustOnly' : 'default'}
        />
      </div>
    </div>
  )
}
