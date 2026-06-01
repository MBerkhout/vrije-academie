import { Suspense } from 'react'
import { AccountGegevensForm } from '@/components/account/AccountGegevensForm'
import { defaultMessages } from '@/lib/i18n/messages'

export const metadata = {
  title: 'Persoonlijke gegevens – Vrije Academie',
}

function GegevensFallback() {
  const common = defaultMessages.common
  return (
    <p className="font-serif text-va-darkgray" aria-busy="true">
      {common.loadingEllipsis}
    </p>
  )
}

export default function AccountGegevensPage() {
  const t = defaultMessages.accountPage
  return (
    <>
      <h1 className="font-sans text-2xl font-bold text-va-black mb-6">{t.pageDetailsTitle}</h1>
      <Suspense fallback={<GegevensFallback />}>
        <AccountGegevensForm />
      </Suspense>
    </>
  )
}
