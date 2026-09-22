'use client'

import { useEffect, useRef, useState } from 'react'

export type PdokAddressLookupState = 'idle' | 'loading' | 'found' | 'error'

const PDOK_DEBOUNCE_MS = 700

/**
 * Dutch postcode + house number → PDOK Locatieserver autocomplete (same as checkout).
 * Only runs when `countryCode` is NL and `manualAddress` is false.
 * Does not overwrite an already filled straat/plaats unless postcode or huisnummer change.
 */
export function usePdokAddressLookup(options: {
  postalCode: string
  houseNumber: string
  street: string
  city: string
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
    street,
    city,
    manualAddress,
    countryCode,
    onMatch,
    onClear,
    onAutofillValidity,
  } = options

  const matchRef = useRef(onMatch)
  const clearRef = useRef(onClear)
  const validityRef = useRef(onAutofillValidity)
  const streetRef = useRef(street)
  const cityRef = useRef(city)
  const lastQueryRef = useRef<string | null>(null)
  matchRef.current = onMatch
  clearRef.current = onClear
  validityRef.current = onAutofillValidity
  streetRef.current = street
  cityRef.current = city

  useEffect(() => {
    if (manualAddress) {
      setAddressLookup('idle')
      return
    }
    if (countryCode.toUpperCase() !== 'NL') {
      setAddressLookup('idle')
      lastQueryRef.current = null
      return
    }

    const pc = postalCode.replace(/\s/g, '').toUpperCase()
    const hn = houseNumber.trim()
    const query = `${pc}|${hn}`
    const valid = /^[0-9]{4}[a-zA-Z]{2}$/.test(pc) && Boolean(hn)
    if (!valid) {
      setAddressLookup('idle')
      lastQueryRef.current = null
      clearRef.current()
      return
    }

    const hasStreetCity = Boolean(streetRef.current.trim() && cityRef.current.trim())
    if (hasStreetCity && (lastQueryRef.current === null || lastQueryRef.current === query)) {
      lastQueryRef.current = query
      setAddressLookup('found')
      return
    }

    lastQueryRef.current = query
    setAddressLookup('idle')
    clearRef.current()

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
