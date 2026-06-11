'use client'

import { PortableText as BasePortableText, type PortableTextBlock } from '@portabletext/react'
import Link from 'next/link'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'

function portableTextComponents(tone: 'default' | 'onDark') {
  const D = tone === 'onDark'
  const heading = D ? 'text-white' : 'text-va-black'
  const body = D ? 'text-white/90' : 'text-va-darkgray'
  const blockquoteText = D ? 'text-white/85' : 'text-va-darkgray'
  const linkClass = D ? 'text-va-yellow underline decoration-white/40' : 'text-va-orange underline'

  return {
    marks: {
      link: ({ value, children }: { value?: { href?: string }; children: React.ReactNode }) => {
        const href = value?.href
        if (!href) return <span>{children}</span>
        const isExternal = href.startsWith('http')
        if (isExternal) {
          return (
            <a href={href} target="_blank" rel="noopener noreferrer" className={linkClass}>
              {children}
            </a>
          )
        }
        return (
          <Link href={href} className={linkClass}>
            {children}
          </Link>
        )
      },
      inlineButton: ({ value }: { value?: { buttonType?: string; label?: string; url?: string } }) => {
        const { buttonType = 'primary', label, url } = value ?? {}
        if (!url || !label) return null
        const variant = buttonType === 'primary' ? 'primary' : buttonType === 'secondary' ? 'secondary' : 'ghost'
        return (
          <Button variant={variant} size="md" href={url} className="mx-1">
            {label}
          </Button>
        )
      },
    },
    block: {
      h1: ({ children }: { children?: React.ReactNode }) => (
        <h1 className={cn('font-sans text-3xl font-bold mb-4', heading)}>{children}</h1>
      ),
      h2: ({ children }: { children?: React.ReactNode }) => (
        <h2 className={cn('font-sans text-2xl font-bold mb-3', heading)}>{children}</h2>
      ),
      h3: ({ children }: { children?: React.ReactNode }) => (
        <h3 className={cn('font-sans text-xl font-semibold mb-2', heading)}>{children}</h3>
      ),
      h4: ({ children }: { children?: React.ReactNode }) => (
        <h4 className={cn('font-sans text-lg font-semibold mb-2', heading)}>{children}</h4>
      ),
      normal: ({ children }: { children?: React.ReactNode }) => (
        <p className={cn('font-sans mb-4', body)}>{children}</p>
      ),
      blockquote: ({ children }: { children?: React.ReactNode }) => (
        <blockquote
          className={cn('border-l-4 border-va-yellow pl-4 py-2 my-4 italic', blockquoteText)}
        >
          {children}
        </blockquote>
      ),
    },
    list: {
      bullet: ({ children }: { children?: React.ReactNode }) => (
        <ul className={cn('list-disc list-inside mb-4 space-y-1', D ? 'marker:text-va-yellow' : 'marker:text-va-orange')}>
          {children}
        </ul>
      ),
      number: ({ children }: { children?: React.ReactNode }) => (
        <ol className={cn('list-decimal list-inside mb-4 space-y-1', D ? 'text-white/90' : 'text-va-darkgray')}>
          {children}
        </ol>
      ),
    },
    listItem: {
      bullet: ({ children }: { children?: React.ReactNode }) => (
        <li className={cn('font-sans', body)}>{children}</li>
      ),
      number: ({ children }: { children?: React.ReactNode }) => (
        <li className={cn('font-sans', body)}>{children}</li>
      ),
    },
  }
}

interface PortableTextProps {
  value?: unknown
  /** Light text for dark/image backgrounds (e.g. hero overlays). */
  tone?: 'default' | 'onDark'
}

export function PortableText({ value, tone = 'default' }: PortableTextProps) {
  if (!value || !Array.isArray(value) || value.length === 0) return null
  return (
    <BasePortableText value={value as PortableTextBlock[]} components={portableTextComponents(tone)} />
  )
}
