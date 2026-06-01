'use client'

import { useEffect, useRef, useState } from 'react'

export type PdokAddressLookupState = 'idle' | 'loading' | 'found' | 'error'

const PDOK_DEBOUNCE_MS = 700

/**
 * Dutch postcode + house number → PDOK Locatieserver autocomplete (same as checkout).
 * Only runs when `countryCode` is NL and `manualAddress` is false.
 */
export function usePdokAddressLookup(options: {
  postalCode: string
  houseNumber: string
  manualAddress: boolean
  countryCode: string
  onMatch: (street: string, city: string) => void
  /** Called when lookup resets before a new match (clears autocomplete street/city in parent) */
  onClear: () => void
  /** Optional: mark street/city as valid in parent validity state (checkout) */
  onAutofillValidity?: () => void
}): {
  addressLookup: PdokAddressLookupState
  setAddressLookup: React.Dispatch<React.SetStateAction<PdokAddressLookupState>>
} {
  const [addressLookup, setAddressLookup] = useState<PdokAddressLookupState>('idle')
  const {
    postalCode,
    houseNumber,
    manualAddress,
    countryCode,
    onMatch,
    onClear,
    onAutofillValidity,
  } = options

  const matchRef = useRef(onMatch)
  const clearRef = useRef(onClear)
  const validityRef = useRef(onAutofillValidity)
  matchRef.current = onMatch
  clearRef.current = onClear
  validityRef.current = onAutofillValidity

  useEffect(() => {
    if (manualAddress) {
      setAddressLookup('idle')
      return
    }
    if (countryCode.toUpperCase() !== 'NL') {
      setAddressLookup('idle')
      return
    }

    const pc = postalCode.replace(/\s/g, '').toUpperCase()
    const hn = houseNumber.trim()
    setAddressLookup('idle')
    clearRef.current()
    if (!/^[0-9]{4}[a-zA-Z]{2}$/.test(pc) || !hn) return

    const timer = setTimeout(async () => {
      setAddressLookup('loading')
      try {
        const res = await fetch(
          `https://api.pdok.nl/bzk/locatieserver/search/v3_1/free?q=${encodeURIComponent(`${pc} ${hn}`)}&fq=type:adres&rows=1`
        )
        const data = await res.json()
        const doc = data?.response?.docs?.[0]
        if (doc?.straatnaam && doc?.woonplaatsnaam) {
          matchRef.current(doc.straatnaam, doc.woonplaatsnaam)
          setAddressLookup('found')
          validityRef.current?.()
        } else {
          setAddressLookup('error')
        }
      } catch {
        setAddressLookup('error')
      }
    }, PDOK_DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [postalCode, houseNumber, manualAddress, countryCode])

  return { addressLookup, setAddressLookup }
}
