import { redirect } from 'next/navigation'
import Link from 'next/link'
import { cmsClient } from '@/lib/cms/server'
import { commerceClient } from '@/lib/commerce'
import type { Order } from '@/lib/commerce/types'
import { formatPriceEur } from '@/lib/locale-format'
import { PLP_BASE_PATH } from '@/lib/routes'

export const metadata = {
  title: 'Bestellingsbevestiging – Vrije Academie',
}

interface BevestigingPageProps {
  searchParams: Promise<{ order?: string; session_id?: string }>
}

export default async function BevestigingPage({ searchParams }: BevestigingPageProps) {
  const params = await searchParams
  const orderId = params.order
  const sessionId = params.session_id

  const settings = await cmsClient.getGeneralSettings()
  const conf = settings?.checkout?.confirmation

  let order: Order | null = null

  if (orderId) {
    order = await commerceClient.getOrder(orderId)
  } else if (sessionId) {
    // After Mollie redirect, we may not have an order ID yet; show success without details
  }

  if (!orderId && !sessionId) {
    redirect('/')
  }

  const heading = conf?.heading ?? 'Bedankt voor je inschrijving!'
  const subheading = conf?.subheading ?? 'Je ontvangt een bevestiging per e-mail.'
  const backLabel = conf?.backToOverviewLabel ?? 'Bekijk ons volledig aanbod'
  const backUrl = conf?.backToOverviewUrl ?? PLP_BASE_PATH

  return (
    <div className="max-w-xl mx-auto py-8 text-center space-y-8">
      {/* Success icon */}
      <div className="flex justify-center">
        <div className="w-16 h-16 rounded-full bg-va-yellow flex items-center justify-center">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden>
            <path
              d="M8 16l6 6 10-10"
              stroke="black"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {/* Heading */}
      <div className="space-y-2">
        <h1 className="font-sans text-2xl font-bold text-va-black">{heading}</h1>
        <p className="font-sans text-va-darkgray">{subheading}</p>
        {order && (
          <p className="font-sans text-sm text-va-darkgray">
            {conf?.orderNumberLabel ?? 'Bestelnummer'}: <strong>#{order.display_id ?? orderId}</strong>
          </p>
        )}
      </div>

      {/* Order details */}
      {order && order.items && order.items.length > 0 && (
        <div className="bg-va-lightgray-100 p-5 text-left space-y-4">
          <h2 className="font-sans text-sm font-semibold text-va-black">Jouw bestelling</h2>
          <ul className="space-y-2">
            {order.items.map((item) => (
              <li key={item.id} className="flex justify-between gap-2 font-sans text-sm text-va-darkgray">
                <span className="flex-1">{item.title} ×{item.quantity}</span>
                <span className="whitespace-nowrap">{formatPriceEur(item.total)}</span>
              </li>
            ))}
          </ul>
          <div className="border-t border-va-lightgray-300 pt-3 flex justify-between font-sans text-sm font-semibold text-va-black">
            <span>Totaal</span>
            <span>{formatPriceEur(order.total)}</span>
          </div>
        </div>
      )}

      {/* Back CTA */}
      <Link
        href={backUrl}
        className="inline-flex items-center justify-center bg-va-yellow text-va-black font-sans font-semibold text-sm px-8 py-3 hover:bg-va-yellow/90 transition-colors"
      >
        {backLabel}
      </Link>
    </div>
  )
}
