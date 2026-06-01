import clsx from 'clsx'
import Link from 'next/link'

interface ProceedCtaProps {
  label?: string
  fullWidth?: boolean
}

// Step 2 (Inloggen) will be implemented in a separate ticket.
const PROCEED_HREF = '/checkout/inloggen'

export function ProceedCta({ label, fullWidth = false }: ProceedCtaProps) {
  return (
    <Link
      href={PROCEED_HREF}
      className={clsx(
        'inline-flex items-center justify-center',
        'bg-va-yellow text-va-black font-sans font-semibold text-sm',
        'px-6 py-3 hover:bg-va-yellow/90 transition-colors',
        fullWidth && 'w-full'
      )}
    >
      {label ?? 'Doorgaan met afrekenen'}
    </Link>
  )
}
