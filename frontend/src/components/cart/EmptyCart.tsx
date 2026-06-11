import Link from 'next/link'
import { PLP_BASE_PATH } from '@/lib/routes'

interface EmptyCartProps {
  heading?: string
  subtext?: string
  ctaLabel?: string
  ctaUrl?: string
}

export function EmptyCart({ heading, subtext, ctaLabel, ctaUrl }: EmptyCartProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
      {/* Placeholder illustration */}
      <svg className="w-16 h-16 text-va-lightgray-300" viewBox="0 0 64 64" fill="none" aria-hidden>
        <rect x="4" y="18" width="56" height="38" rx="3" stroke="currentColor" strokeWidth="3" />
        <path d="M4 26h56" stroke="currentColor" strokeWidth="3" />
        <path d="M22 8l-6 10M42 8l6 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <h2 className="font-sans font-bold text-xl text-va-black">
        {heading ?? 'Je winkelwagen is leeg.'}
      </h2>
      {subtext && (
        <p className="font-sans text-va-darkgray max-w-sm">
          {subtext}
        </p>
      )}
      <Link
        href={ctaUrl ?? PLP_BASE_PATH}
        className="mt-2 inline-flex items-center justify-center bg-va-yellow text-va-black font-sans font-semibold text-sm px-6 py-3 hover:bg-va-yellow/90 transition-colors"
      >
        {ctaLabel ?? 'Bekijk ons aanbod'}
      </Link>
    </div>
  )
}
