import Link from 'next/link'
import { cmsClient } from '@/lib/cms/server'
import { CheckoutStepperClient } from '@/components/checkout/CheckoutStepperClient'
import { CheckoutContentWithSummary } from '@/components/checkout/CheckoutContentWithSummary'

export default async function CheckoutLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const settings = await cmsClient.getGeneralSettings()
  const checkout = settings?.checkout
  const cart = settings?.cart
  const backHref = cart?.continueShoppingUrl?.trim() || '/winkelwagen'

  return (
    <div className="max-w-[1240px] mx-auto px-4 md:px-8 min-[1240px]:px-0 py-8">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 font-sans text-sm text-va-darkgray hover:text-va-black transition-colors mb-4"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
          <path d="M8 2L4 6l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Terug naar winkelwagen
      </Link>

      {/* Step-aware stepper (client) */}
      <div className="overflow-x-auto mb-8">
        <CheckoutStepperClient labels={cart?.stepLabels} />
      </div>

      <CheckoutContentWithSummary
        labels={checkout?.orderSummary}
        trust={{
          secure: cart?.trustSecure,
          cancellation: cart?.trustCancellation,
          support: cart?.trustSupport,
          cancellationDays: cart?.cancellationDays,
        }}
        helpContact={settings?.footer?.contact}
      >
        {children}
      </CheckoutContentWithSummary>
    </div>
  )
}
