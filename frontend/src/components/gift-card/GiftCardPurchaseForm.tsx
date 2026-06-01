'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { commerceClient } from '@/lib/commerce'
import { dispatchCartUpdated, getOrCreateCartId } from '@/lib/commerce/cart'
import type { GiftCardBlockContent } from '@/lib/cms/types'
import { PortableText } from '@/components/cms/PortableText'
import { ValidatedInput, ValidatedTextarea } from '@/components/auth/ValidatedInput'
import {
  giftCardEffectiveEuro,
  initialGiftCardFormValidity,
  validateGiftCardCustomAmount,
  validateGiftCardField,
  type GiftCardFieldName,
  type GiftCardFormValidity,
} from '@/lib/auth/gift-card-field-validation'
import { defaultMessages, interpolate } from '@/lib/i18n'

type GiftCardSettings = GiftCardBlockContent

const DEFAULT_AMOUNTS = [15, 25, 50, 75, 100, 150]

type GiftValidityKey = keyof GiftCardFormValidity

export function GiftCardPurchaseForm({ settings }: { settings?: GiftCardSettings }) {
  const router = useRouter()
  const tiles = useMemo(
    () =>
      (settings?.amountOptions?.length ? settings.amountOptions : DEFAULT_AMOUNTS).filter(
        (n) => typeof n === 'number' && n > 0
      ),
    [settings?.amountOptions]
  )
  const minEuro = settings?.minAmountEuro ?? 5
  const maxEuro = settings?.maxAmountEuro ?? 500

  const [selectedEuro, setSelectedEuro] = useState<number | null>(tiles[0] ?? 25)
  const [customEuro, setCustomEuro] = useState('')
  const [recipientName, setRecipientName] = useState('')
  const [recipientEmail, setRecipientEmail] = useState('')
  const [message, setMessage] = useState('')
  const [senderName, setSenderName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [validity, setValidity] = useState<GiftCardFormValidity>(initialGiftCardFormValidity)

  const effectiveEuro = useMemo(
    () => giftCardEffectiveEuro(customEuro, selectedEuro),
    [customEuro, selectedEuro]
  )

  function resetValidity(name: GiftValidityKey) {
    setValidity((prev) => (prev[name].state === 'idle' ? prev : { ...prev, [name]: { state: 'idle' } }))
  }

  function blurField(name: GiftCardFieldName) {
    const value =
      name === 'recipientName'
        ? recipientName
        : name === 'recipientEmail'
          ? recipientEmail
          : name === 'senderName'
            ? senderName
            : message
    setValidity((prev) => ({ ...prev, [name]: validateGiftCardField(name, value) }))
  }

  function blurCustomAmount() {
    setValidity((prev) => ({
      ...prev,
      customAmount: validateGiftCardCustomAmount(customEuro, minEuro, maxEuro),
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const euros = effectiveEuro
    const next: GiftCardFormValidity = {
      recipientName: validateGiftCardField('recipientName', recipientName),
      recipientEmail: validateGiftCardField('recipientEmail', recipientEmail),
      senderName: validateGiftCardField('senderName', senderName),
      message: validateGiftCardField('message', message),
      customAmount: validateGiftCardCustomAmount(customEuro, minEuro, maxEuro),
    }
    setValidity(next)

    if (euros == null || euros < minEuro || euros > maxEuro) {
      const msg = defaultMessages.auth.validation
      setError(
        customEuro.trim()
          ? interpolate(msg.giftCardAmountInvalid, { min: minEuro, max: maxEuro })
          : msg.giftCardAmountMissing
      )
      return
    }
    if (next.recipientName.state === 'invalid' || next.recipientEmail.state === 'invalid') {
      return
    }

    setLoading(true)
    try {
      const cartId = await getOrCreateCartId()
      await commerceClient.addGiftCardToCart({
        cartId,
        amountCents: euros * 100,
        recipient_name: recipientName.trim(),
        recipient_email: recipientEmail.trim().toLowerCase(),
        message: message.trim() || undefined,
        sender_name: senderName.trim() || undefined,
      })
      if (typeof window !== 'undefined') {
        dispatchCartUpdated()
      }
      router.push('/winkelwagen')
    } catch (err: any) {
      setError(err?.message ?? 'Kon de cadeaubon niet toevoegen. Probeer het later opnieuw.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="max-w-lg mx-auto space-y-10">
      {settings?.intro?.length ? (
        <div className="font-sans text-sm text-va-darkgray prose prose-sm max-w-none">
          <PortableText value={settings.intro} />
        </div>
      ) : null}

      <section className="space-y-4">
        <h2 className="font-sans text-base font-bold text-va-black">
          {settings?.section1Title ?? '1. Kies een waarde'}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {tiles.map((euro) => {
            const active = customEuro.trim() === '' && selectedEuro === euro
            return (
              <button
                key={euro}
                type="button"
                onClick={() => {
                  setCustomEuro('')
                  setSelectedEuro(euro)
                  resetValidity('customAmount')
                }}
                className={`border-2 py-3 px-2 font-sans text-sm font-medium transition-colors ${
                  active
                    ? 'border-va-black bg-va-lightgray-100'
                    : 'border-va-lightgray-300 bg-va-white hover:border-va-gray-300'
                }`}
              >
                € {euro}
              </button>
            )
          })}
        </div>
        <ValidatedInput
          name="customAmount"
          type="number"
          inputMode="numeric"
          min={minEuro}
          max={maxEuro}
          step={1}
          label={settings?.customAmountLabel ?? 'Of vul zelf een waarde in'}
          value={customEuro}
          onChange={(v) => {
            setCustomEuro(v)
            resetValidity('customAmount')
          }}
          onBlur={blurCustomAmount}
          validity={validity.customAmount}
          disabled={loading}
        />
      </section>

      <section className="space-y-4">
        <h2 className="font-sans text-base font-bold text-va-black">
          {settings?.section2Title ?? '2. Gegevens voor de digitale cadeaubon'}
        </h2>
        <div className="space-y-3">
          <ValidatedInput
            name="recipientName"
            label={settings?.recipientNameLabel ?? 'Naam ontvanger'}
            required
            autoComplete="name"
            value={recipientName}
            onChange={(v) => {
              setRecipientName(v)
              resetValidity('recipientName')
            }}
            onBlur={() => blurField('recipientName')}
            validity={validity.recipientName}
            disabled={loading}
          />
          <ValidatedInput
            name="recipientEmail"
            label={settings?.recipientEmailLabel ?? 'Emailadres ontvanger'}
            type="email"
            required
            autoComplete="email"
            value={recipientEmail}
            onChange={(v) => {
              setRecipientEmail(v)
              resetValidity('recipientEmail')
            }}
            onBlur={() => blurField('recipientEmail')}
            validity={validity.recipientEmail}
            disabled={loading}
          />
          <ValidatedInput
            name="senderName"
            label={settings?.senderNameLabel ?? 'Je naam (optioneel)'}
            autoComplete="name"
            value={senderName}
            onChange={(v) => {
              setSenderName(v)
              resetValidity('senderName')
            }}
            onBlur={() => blurField('senderName')}
            validity={validity.senderName}
            disabled={loading}
          />
          <ValidatedTextarea
            name="message"
            label={settings?.messageLabel ?? 'Bericht'}
            value={message}
            onChange={(v) => {
              setMessage(v)
              resetValidity('message')
            }}
            onBlur={() => blurField('message')}
            validity={validity.message}
            disabled={loading}
          />
        </div>
      </section>

      {error && (
        <p className="font-sans text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-va-yellow text-va-black font-sans font-bold text-sm uppercase tracking-wide py-4 hover:bg-va-yellow/90 transition-colors disabled:opacity-60"
      >
        {loading ? 'Bezig…' : settings?.orderButtonLabel ?? 'BESTEL'}
      </button>
    </form>
  )
}
