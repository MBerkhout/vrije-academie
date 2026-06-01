import { cmsClient } from '@/lib/cms/server'
import { CheckoutPaymentForm } from '@/components/checkout/CheckoutPaymentForm'
import { CheckoutPaymentOrderOverview } from '@/components/checkout/CheckoutPaymentOrderOverview'

export const metadata = {
  title: 'Betaling – Vrije Academie',
}

export default async function BetalingPage() {
  const settings = await cmsClient.getGeneralSettings()
  const checkout = settings?.checkout ?? {}

  return (
    <div className="space-y-8">
      <CheckoutPaymentOrderOverview labels={checkout?.orderSummary} />
      <CheckoutPaymentForm settings={checkout} />
    </div>
  )
}
