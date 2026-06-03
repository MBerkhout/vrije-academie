import type { Metadata } from 'next'
import { PLP_BASE_PATH } from '@/lib/routes'
import { cmsClient } from '@/lib/cms/server'
import { CartStepper } from '@/components/cart/CartStepper'
import { CartView } from '@/components/cart/CartView'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Winkelwagen | Vrije Academie',
}

export default async function WinkelwagenPage() {
  const settings = await cmsClient.getGeneralSettings()
  const cart = settings?.cart

  return (
    <div className="max-w-[1240px] mx-auto px-4 md:px-8 min-[1240px]:px-0 py-8">
      {/* "Verder winkelen" replaces breadcrumbs at the top */}
      <Link
        href={cart?.continueShoppingUrl ?? PLP_BASE_PATH}
        className="inline-flex items-center gap-1 font-sans text-sm text-va-darkgray hover:text-va-black transition-colors"
      >
        <span aria-hidden>←</span>
        {cart?.continueShoppingLabel ?? 'Verder winkelen'}
      </Link>

      <div className="mt-4">
        <CartStepper step={1} labels={cart?.stepLabels} />
      </div>

      <CartView settings={cart} />
    </div>
  )
}
