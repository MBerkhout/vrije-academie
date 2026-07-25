'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import { plpCategoryHref, plpRecordTypeHref } from '@/lib/routes'

interface PdpHeaderProps {
  title: string
  onlineBadge?: { enabled: boolean; text?: string } | null
  recordType?: string | null
  categories?: { id?: string; slug?: string; label: string }[]
  shareLabel?: string
}

/** PDP H1 + badges + share button */
export function PdpHeader({ title, onlineBadge, recordType, categories, shareLabel = 'Delen' }: PdpHeaderProps) {
  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title, url: window.location.href }).catch(() => null)
    } else {
      await navigator.clipboard.writeText(window.location.href).catch(() => null)
    }
  }

  const recordTypeHref = recordType ? plpRecordTypeHref(recordType) : null

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {categories?.map((cat) => {
          const badge = (
            <Badge variant="category" size="sm">
              {cat.label}
            </Badge>
          )

          if (cat.slug) {
            return (
              <Link
                key={cat.slug}
                href={plpCategoryHref(cat.slug)}
                className="inline-flex hover:opacity-80 transition-opacity"
              >
                {badge}
              </Link>
            )
          }

          return (
            <span key={cat.label} className="inline-flex">
              {badge}
            </span>
          )
        })}
        {recordType && (
          recordTypeHref ? (
            <Link
              href={recordTypeHref}
              className="inline-flex hover:opacity-80 transition-opacity"
            >
              <Badge variant="record" size="sm">
                {recordType}
              </Badge>
            </Link>
          ) : (
            <span className="inline-flex">
              <Badge variant="record" size="sm">
                {recordType}
              </Badge>
            </span>
          )
        )}
        {onlineBadge?.enabled && (
          <Badge variant="online" size="sm">
            {onlineBadge.text ?? 'Nu ook online te volgen!'}
          </Badge>
        )}
      </div>

      <div className="flex items-start justify-between gap-4">
        <h1 className="font-sans text-2xl md:text-4xl font-bold text-va-black leading-tight">
          {title}
        </h1>
        <button
          onClick={handleShare}
          aria-label={shareLabel}
          className="shrink-0 mt-1 p-2 rounded-none border border-va-lightgray hover:bg-va-lightgray transition-colors text-va-gray hover:text-va-black"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
        </button>
      </div>
    </div>
  )
}
