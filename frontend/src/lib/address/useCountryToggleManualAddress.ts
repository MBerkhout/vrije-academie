'use client'

import { useEffect, useRef } from 'react'

/**
 * Non-NL countries use manual straat/plaats (no PDOK). When the user switches back from
 * another country to NL, re-enable postcode lookup (manual off). The first run is skipped
 * so initial customer prefill is not overwritten.
 */
export function useCountryToggleManualAddress(
  country: string,
  setManualAddress: (value: boolean) => void,
): void {
  const prevCountryRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    const prev = prevCountryRef.current
    prevCountryRef.current = country

    if (country !== 'NL') {
      setManualAddress(true)
    } else if (prev !== undefined && prev !== 'NL') {
      setManualAddress(false)
    }
  }, [country, setManualAddress])
}
