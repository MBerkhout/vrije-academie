import { defaultMessages } from '@/lib/i18n/messages'
import { noIndexMetadata } from '@/lib/cms/seo-metadata'
import { AccountVathuisCollection } from '@/components/account/AccountVathuisCollection'

export const metadata = noIndexMetadata('Mijn collectie – Vrije Academie')

export default function AccountCollectiePage() {
  const t = defaultMessages.accountPage
  return (
    <>
      <h1 className="font-sans text-2xl font-bold text-va-black mb-2">{t.pageCollectionTitle}</h1>
      <p className="font-sans text-sm text-va-darkgray max-w-xl mb-6">{t.collectionIntro}</p>
      <AccountVathuisCollection />
    </>
  )
}
