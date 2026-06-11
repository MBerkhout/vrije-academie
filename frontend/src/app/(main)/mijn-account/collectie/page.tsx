import { defaultMessages } from '@/lib/i18n/messages'

export const metadata = {
  title: 'Mijn collectie – Vrije Academie',
}

export default function AccountCollectiePage() {
  const t = defaultMessages.accountPage
  return (
    <>
      <h1 className="font-sans text-2xl font-bold text-va-black mb-6">{t.pageCollectionTitle}</h1>
      <p className="font-sans text-sm text-va-darkgray max-w-xl">{t.collectionPlaceholder}</p>
    </>
  )
}
