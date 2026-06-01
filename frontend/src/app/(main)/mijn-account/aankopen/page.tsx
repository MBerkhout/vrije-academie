import { AccountOrdersList } from '@/components/account/AccountOrdersList'
import { defaultMessages } from '@/lib/i18n/messages'

export const metadata = {
  title: 'Mijn aankopen – Vrije Academie',
}

export default function AccountAankopenPage() {
  const t = defaultMessages.accountPage
  return (
    <>
      <h1 className="font-sans text-2xl font-bold text-va-black mb-6">{t.pagePurchasesTitle}</h1>
      <AccountOrdersList />
    </>
  )
}
