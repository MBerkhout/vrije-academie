import { Suspense } from 'react'
import { cmsClient } from '@/lib/cms/server'
import { CheckoutLoginForm } from '@/components/checkout/CheckoutLoginForm'

export const metadata = {
  title: 'Inloggen – Vrije Academie',
}

export default async function InloggenPage() {
  const settings = await cmsClient.getGeneralSettings()
  const checkout = settings?.checkout ?? {}

  return (
    <Suspense>
      <CheckoutLoginForm settings={checkout} />
    </Suspense>
  )
}
