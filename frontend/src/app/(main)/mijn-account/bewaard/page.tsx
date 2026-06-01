import { WishlistList } from '@/components/account/WishlistList'
import { defaultMessages } from '@/lib/i18n/messages'

export const metadata = {
  title: 'Bewaard – Vrije Academie',
}

export default function AccountBewaardPage() {
  const t = defaultMessages.accountPage
  return (
    <>
      <h1 className="font-sans text-2xl font-bold text-va-black mb-6">{t.pageSavedTitle}</h1>
      <section aria-labelledby="bewaard-heading" className="space-y-4">
        <h2 id="bewaard-heading" className="font-sans text-lg font-bold text-va-black">
          {t.wishlistHeading}
        </h2>
        <WishlistList />
      </section>
    </>
  )
}
