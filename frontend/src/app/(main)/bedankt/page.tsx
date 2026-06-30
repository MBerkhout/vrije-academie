import { Suspense } from 'react'
import { cmsClient } from '@/lib/cms/server'
import { ThankYouPageContent } from '@/components/thank-you/ThankYouPageContent'
import type { ThankYouContactInfo } from '@/components/thank-you/ThankYouPageContent'

export const metadata = {
  title: 'Bedankt voor je inschrijving – Vrije Academie',
}

function ThankYouFallback() {
  return (
    <div className="max-w-[1200px] mx-auto px-4 py-14 text-center font-sans text-sm text-va-darkgray animate-pulse">
      We laden je bestelling…
    </div>
  )
}

export default async function BedanktPage() {
  const settings = await cmsClient.getGeneralSettings()
  const rawContact = settings?.footer?.contact

  const contact: ThankYouContactInfo = {
    phone: rawContact?.phone ?? null,
    email: rawContact?.email ?? null,
  }

  return (
    <Suspense fallback={<ThankYouFallback />}>
      <ThankYouPageContent contact={contact} />
    </Suspense>
  )
}
