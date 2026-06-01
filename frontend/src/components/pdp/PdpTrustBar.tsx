interface PdpTrustBarProps {
  usps?: string[]
}

/** Horizontal trust USP bar. Hidden when no USPs are configured. */
export function PdpTrustBar({ usps }: PdpTrustBarProps) {
  if (!usps?.length) return null

  return (
    <div className="py-8 border-t border-b border-va-lightgray">
      <ul className="flex flex-wrap justify-center gap-6 md:gap-12">
        {usps.map((usp) => (
          <li key={usp} className="text-sm font-medium text-va-black text-center">
            {usp}
          </li>
        ))}
      </ul>
    </div>
  )
}
