import { cn } from '@/lib/utils'

export type DeliveryTypeVariant = 'offline' | 'online' | 'both'

interface DeliveryTypeIconProps {
  /** When true, shows a blue camera icon; otherwise a red map pin. */
  isOnline?: boolean
  /** Explicit variant; takes precedence over `isOnline` when set. */
  variant?: DeliveryTypeVariant
  className?: string
  'aria-label'?: string
}

function MapPinIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn('w-3.5 h-3.5 shrink-0 text-red-600', className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  )
}

function CameraIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn('w-3.5 h-3.5 shrink-0 text-blue-600', className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
      />
    </svg>
  )
}

const DELIVERY_TYPE_LABELS: Record<DeliveryTypeVariant, string> = {
  offline: 'Op locatie',
  online: 'Online',
  both: 'Op locatie en online',
}

export function DeliveryTypeIcon({
  isOnline,
  variant,
  className,
  'aria-label': ariaLabel,
}: DeliveryTypeIconProps) {
  const resolvedVariant: DeliveryTypeVariant | null =
    variant ?? (isOnline === undefined ? null : isOnline ? 'online' : 'offline')

  if (!resolvedVariant) return null

  const iconClassName = cn('w-3.5 h-3.5 shrink-0', className)
  const label = ariaLabel ?? DELIVERY_TYPE_LABELS[resolvedVariant]

  if (resolvedVariant === 'both') {
    return (
      <span
        className="inline-flex items-center gap-0.5 shrink-0"
        role="img"
        aria-label={label}
      >
        <MapPinIcon className={className} />
        <span className="text-va-gray text-[10px] font-light leading-none" aria-hidden="true">
          /
        </span>
        <CameraIcon className={className} />
      </span>
    )
  }

  if (resolvedVariant === 'online') {
    return (
      <svg
        className={cn(iconClassName, 'text-blue-600')}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        role="img"
        aria-label={label}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
        />
      </svg>
    )
  }

  return (
    <svg
      className={cn(iconClassName, 'text-red-600')}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      role="img"
      aria-label={label}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  )
}
