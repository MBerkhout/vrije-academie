import { redirect } from 'next/navigation'
import { cmsClient } from '@/lib/cms/server'
import { CheckoutLoginForm } from '@/components/checkout/CheckoutLoginForm'

export const metadata = {
  title: 'Inloggen – Vrije Academie',
}

export default async function InloggenPage() {
  const settings = await cmsClient.getGeneralSettings()
  const checkout = settings?.checkout ?? {}

  return (
    <CheckoutLoginForm settings={checkout} />
  )
}
