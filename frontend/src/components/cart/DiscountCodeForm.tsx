'use client'

import { useState } from 'react'
import type { AppliedDiscountEntry } from '@/lib/commerce/gift-card'

interface DiscountCodeFormProps {
  applied: AppliedDiscountEntry[]
  instructions?: string
  giftCodeNote?: string
  labels?: {
    placeholder?: string
    apply?: string
  }
  onApplyCode: (code: string) => Promise<{ ok: boolean; error?: string }>
  onRemove: (entry: AppliedDiscountEntry) => Promise<void>
}

export function DiscountCodeForm({
  applied,
  instructions,
  giftCodeNote,
  labels,
  onApplyCode,
  onRemove,
}: DiscountCodeFormProps) {
  function promoCanBeRemoved(entry: AppliedDiscountEntry): boolean {
    return entry.kind === 'gift' || entry.is_automatic !== true
  }

  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [removingCode, setRemovingCode] = useState<string | null>(null)

  async function handleApply() {
    const code = input.trim().toUpperCase()
    if (!code) {
      setError('Vul een kortingscode in.')
      return
    }
    if (applied.some((a) => a.code.toUpperCase() === code)) {
      setError('Deze code is al toegevoegd.')
      return
    }
    setError(null)
    setLoading(true)
    const result = await onApplyCode(code)
    setLoading(false)
    if (result.ok) {
      setInput('')
    } else {
      setError(result.error ?? 'Deze code is niet geldig of al gebruikt.')
    }
  }

  async function handleRemoveEntry(entry: AppliedDiscountEntry, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    const key = `${entry.kind}:${entry.code}`
    setRemovingCode(key)
    try {
      await onRemove(entry)
    } finally {
      setRemovingCode(null)
    }
  }

  return (
    <div className="border border-va-lightgray-300 p-4 space-y-3">
      <h2 className="font-sans font-semibold text-sm text-va-black">Kortingscode</h2>

      {instructions && (
        <p className="font-sans text-xs text-va-darkgray">{instructions}</p>
      )}

      {giftCodeNote && (
        <p className="font-sans text-xs text-va-darkgray italic">{giftCodeNote}</p>
      )}

      {applied.length > 0 && (
        <ul className="space-y-1">
          {applied.map((entry) => (
            <li key={`${entry.kind}-${entry.code}`} className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm text-va-black bg-va-lightgray-200 px-2 py-0.5">
                {entry.code}
              </span>
              {entry.kind === 'gift' && (
                <span className="font-sans text-xs text-va-darkgray">cadeaubon</span>
              )}
              {entry.kind === 'promo' && entry.is_automatic === true && (
                <span className="font-sans text-xs text-va-darkgray">automatisch toegevoegd</span>
              )}
              {promoCanBeRemoved(entry) && (
                <button
                  type="button"
                  onClick={(e) => void handleRemoveEntry(entry, e)}
                  disabled={removingCode === `${entry.kind}:${entry.code}`}
                  className="inline-flex items-center gap-1 font-sans text-xs text-va-darkgray hover:text-va-black transition-colors disabled:opacity-50 cursor-pointer"
                  aria-label={`Verwijder code ${entry.code}`}
                >
                  <span aria-hidden>×</span>
                  <span className="underline underline-offset-2">Verwijderen</span>
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value)
            setError(null)
          }}
          onKeyDown={(e) => e.key === 'Enter' && handleApply()}
          placeholder={labels?.placeholder ?? 'Voer je code in...'}
          className="flex-1 min-w-0 border border-va-gray-300 px-3 py-2 font-sans text-sm outline-none focus-visible:ring-2 focus-visible:ring-va-yellow"
          disabled={loading}
        />
        <button
          type="button"
          onClick={handleApply}
          disabled={loading}
          className="shrink-0 bg-va-black text-va-white font-sans text-sm px-4 py-2 hover:bg-va-darkgray transition-colors disabled:opacity-60"
        >
          {loading ? '...' : (labels?.apply ?? 'Toevoegen')}
        </button>
      </div>

      {error && (
        <p className="font-sans text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
