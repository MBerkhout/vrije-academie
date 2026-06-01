import clsx from 'clsx'
import type { GiftCardPurchaseLineMeta } from '@/lib/commerce/gift-card'
import { getGiftCardPurchaseMetaFromLineItem } from '@/lib/commerce/gift-card'

const baseClass =
  'font-sans text-xs text-va-darkgray leading-snug'

export interface GiftCardRecipientLineProps {
  meta: GiftCardPurchaseLineMeta | null
  className?: string
}

/** Single “Voor: naam · e-mail” line for digitale cadeaubon regels — gebruik overal dezelfde copy en styling. */
export function GiftCardRecipientLine({ meta, className }: GiftCardRecipientLineProps) {
  if (!meta) return null
  return (
    <p className={clsx(baseClass, className)}>
      Voor: {meta.recipient_name}
      {meta.recipient_email ? ` · ${meta.recipient_email}` : ''}
    </p>
  )
}

export interface GiftCardRecipientLineFromLineItemProps {
  item: { metadata?: Record<string, unknown> | null }
  className?: string
}

export function GiftCardRecipientLineFromLineItem({
  item,
  className,
}: GiftCardRecipientLineFromLineItemProps) {
  return (
    <GiftCardRecipientLine
      meta={getGiftCardPurchaseMetaFromLineItem(item)}
      className={className}
    />
  )
}
