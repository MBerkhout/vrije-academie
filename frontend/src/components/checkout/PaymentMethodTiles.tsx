'use client'

import Image from 'next/image'
import clsx from 'clsx'
import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/Badge'
import type { PaymentProvider } from '@/lib/commerce/types'

const POPULAR_ID = 'pp_mollie-ideal_mollie'
const APPLE_PAY_ID = 'pp_mollie-apple-pay_mollie'
const SYSTEM_DEFAULT_ID = 'pp_system_default'

const PROVIDER_LABELS: Record<string, string> = {
  'pp_mollie-ideal_mollie': 'iDEAL',
  'pp_mollie-card_mollie': 'Creditcard',
  'pp_mollie-bancontact_mollie': 'Bancontact',
  'pp_mollie-paypal_mollie': 'PayPal',
  'pp_mollie-apple-pay_mollie': 'Apple Pay',
  'pp_mollie-giftcard_mollie': 'Cadeaukaart',
  'pp_mollie-hosted-checkout_mollie': 'Mollie Checkout',
}

const PROVIDER_ICONS: Record<string, string> = {
  'pp_mollie-ideal_mollie': 'https://www.mollie.com/external/icons/payment-methods/ideal.svg',
  'pp_mollie-card_mollie': 'https://www.mollie.com/external/icons/payment-methods/creditcard.svg',
  'pp_mollie-bancontact_mollie': 'https://www.mollie.com/external/icons/payment-methods/bancontact.svg',
  'pp_mollie-paypal_mollie': 'https://www.mollie.com/external/icons/payment-methods/paypal.svg',
  'pp_mollie-apple-pay_mollie': 'https://www.mollie.com/external/icons/payment-methods/applepay.svg',
  'pp_mollie-giftcard_mollie': 'https://www.mollie.com/external/icons/payment-methods/giftcard.svg',
  'pp_mollie-hosted-checkout_mollie': 'https://www.mollie.com/external/icons/payment-methods/mollie.svg',
}

interface PaymentMethodTilesProps {
  providers: PaymentProvider[]
  selected: string | null
  onSelect: (id: string) => void
  /** Optional label overrides from Sanity siteSettings */
  labelOverrides?: Record<string, string>
}

export function PaymentMethodTiles({ providers, selected, onSelect, labelOverrides }: PaymentMethodTilesProps) {
  const [applePaySupported, setApplePaySupported] = useState(false)

  useEffect(() => {
    setApplePaySupported(
      typeof window !== 'undefined' &&
        'ApplePaySession' in window &&
        (window as any).ApplePaySession?.canMakePayments?.() === true
    )
  }, [])

  const visible = providers
    .filter((p) => {
      if (p.id === SYSTEM_DEFAULT_ID) return false
      if (p.id === APPLE_PAY_ID && !applePaySupported) return false
      return true
    })
    .sort((a, b) => {
      // iDEAL first (default + most popular)
      if (a.id === POPULAR_ID) return -1
      if (b.id === POPULAR_ID) return 1
      return 0
    })

  if (visible.length === 0) {
    return (
      <p className="font-sans text-sm text-va-darkgray">
        Geen betaalmethoden beschikbaar. Controleer de regioconfiguratie in Medusa Admin.
      </p>
    )
  }

  return (
    <div className="flex flex-col divide-y divide-va-lightgray-300 border border-va-lightgray-300" role="radiogroup">
      {visible.map((provider) => {
        const label =
          (labelOverrides ?? {})[provider.id] ??
          PROVIDER_LABELS[provider.id] ??
          provider.id
        const iconUrl = PROVIDER_ICONS[provider.id]
        const isSelected = selected === provider.id
        const isPopular = provider.id === POPULAR_ID

        return (
          <button
            key={provider.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onSelect(provider.id)}
            className={clsx(
              'flex items-center gap-4 px-4 py-3 transition-colors cursor-pointer text-left',
              isSelected ? 'bg-va-yellow/10' : 'bg-white hover:bg-va-lightgray-100'
            )}
          >
            {/* Radio circle */}
            <span
              className={clsx(
                'flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center',
                isSelected ? 'border-va-black' : 'border-va-lightgray-300'
              )}
            >
              {isSelected && <span className="w-2 h-2 rounded-full bg-va-black" />}
            </span>

            {/* Icon */}
            {iconUrl ? (
              <span className="flex-shrink-0 relative w-9 h-6">
                <Image
                  src={iconUrl}
                  alt=""
                  fill
                  className="object-contain"
                  sizes="36px"
                  unoptimized
                />
              </span>
            ) : (
              <span className="flex-shrink-0 w-9 h-6" />
            )}

            {/* Label */}
            <span className="flex-1 font-sans text-sm font-medium text-va-black">{label}</span>

            {isPopular && (
              <Badge variant="popular" className="flex-shrink-0 font-sans">
                Meest gekozen
              </Badge>
            )}
          </button>
        )
      })}
    </div>
  )
}
