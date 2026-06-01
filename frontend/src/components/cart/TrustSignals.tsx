interface TrustSignalsProps {
  secure?: string
  cancellation?: string
  support?: string
  cancellationDays?: number
}

export function TrustSignals({ secure, cancellation, support, cancellationDays = 14 }: TrustSignalsProps) {
  const signals = [
    secure ?? 'Veilig betalen via Mollie.',
    (cancellation ?? 'Annulering mogelijk tot {days} dagen voor aanvang.').replace('{days}', String(cancellationDays)),
    support ?? 'Vragen? Bel ons op 088-518 5000 (ma-vr 9:30-11:30).',
  ].filter(Boolean)

  return (
    <ul className="font-sans text-xs text-va-darkgray space-y-1.5 border border-va-lightgray-300 p-4">
      {signals.map((s, i) => (
        <li key={i} className="flex items-start gap-2">
          <svg className="w-3.5 h-3.5 mt-0.5 shrink-0 text-va-black" viewBox="0 0 14 14" fill="none" aria-hidden>
            <path d="M2 7l4 4 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {s}
        </li>
      ))}
    </ul>
  )
}
