'use client'

import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui'

/** `onYellow`: inputs and button styled for `bg-va-yellow` panel */
export function FooterKeepInformedForm({
  action,
  method,
  firstNameField,
  lastNameField,
  emailField,
  variant = 'onDark',
}: {
  action: string
  method: 'get' | 'post'
  firstNameField: string
  lastNameField: string
  emailField: string
  variant?: 'onDark' | 'onYellow'
}) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const fn = firstName.trim()
    const ln = lastName.trim()
    const em = email.trim()
    if (!fn || !ln) {
      setError('Vul je voor- en achternaam in.')
      return
    }
    if (!em) {
      setError('Vul je e-mailadres in.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      setError('Vul een geldig e-mailadres in.')
      return
    }

    if (method === 'get') {
      try {
        const url = new URL(action)
        url.searchParams.set(firstNameField, fn)
        url.searchParams.set(lastNameField, ln)
        url.searchParams.set(emailField, em)
        window.location.href = url.toString()
      } catch {
        setError('Kon niet doorverwijzen. Controleer de formulier-URL in Sanity.')
      }
      return
    }

    const form = document.createElement('form')
    form.method = 'POST'
    form.action = action
    for (const [name, value] of [
      [firstNameField, fn],
      [lastNameField, ln],
      [emailField, em],
    ]) {
      const input = document.createElement('input')
      input.type = 'hidden'
      input.name = name
      input.value = value
      form.appendChild(input)
    }
    document.body.appendChild(form)
    form.submit()
    document.body.removeChild(form)
  }

  const inputClass =
    variant === 'onYellow'
      ? 'w-full rounded-none border border-va-black/20 bg-white px-3 py-2 text-sm font-sans text-va-black placeholder:text-va-gray outline-none focus-visible:ring-2 focus-visible:ring-va-black/35'
      : 'w-full rounded-none border border-white/25 bg-white/10 px-3 py-2 text-sm font-sans text-white placeholder:text-white/40 outline-none focus-visible:ring-2 focus-visible:ring-va-yellow'

  return (
    <form
      onSubmit={onSubmit}
      className={
        variant === 'onYellow'
          ? 'flex flex-col gap-3 w-full max-w-md mx-auto lg:mx-0'
          : 'flex flex-col gap-3 max-w-md'
      }
      noValidate
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label
            htmlFor="footer-keep-informed-first"
            className="sr-only"
          >
            Voornaam
          </label>
          <input
            id="footer-keep-informed-first"
            name={firstNameField}
            type="text"
            autoComplete="given-name"
            value={firstName}
            onChange={(ev) => setFirstName(ev.target.value)}
            placeholder="Voornaam"
            className={inputClass}
          />
        </div>
        <div>
          <label
            htmlFor="footer-keep-informed-last"
            className="sr-only"
          >
            Achternaam
          </label>
          <input
            id="footer-keep-informed-last"
            name={lastNameField}
            type="text"
            autoComplete="family-name"
            value={lastName}
            onChange={(ev) => setLastName(ev.target.value)}
            placeholder="Achternaam"
            className={inputClass}
          />
        </div>
      </div>
      <div>
        <label htmlFor="footer-keep-informed-email" className="sr-only">
          E-mailadres
        </label>
        <input
          id="footer-keep-informed-email"
          name={emailField}
          type="email"
          autoComplete="email"
          value={email}
          onChange={(ev) => setEmail(ev.target.value)}
          placeholder="E-mailadres"
          className={inputClass}
        />
      </div>
      {error ? (
        <p
          className={
            variant === 'onYellow'
              ? 'font-sans text-xs text-va-orange'
              : 'font-sans text-xs text-va-yellow'
          }
          role="alert"
        >
          {error}
        </p>
      ) : null}
      <Button
        type="submit"
        variant="secondary"
        size="md"
        className={
          variant === 'onYellow'
            ? 'w-full sm:w-auto rounded-none border border-va-black bg-va-black text-white hover:bg-va-black/90'
            : 'w-full sm:w-auto rounded-none border-va-yellow bg-va-yellow text-va-black hover:bg-va-yellow-600'
        }
      >
        Aanmelden
      </Button>
    </form>
  )
}
