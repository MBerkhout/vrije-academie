import clsx from 'clsx'
import type { LineItemDetailBlock } from '@/lib/commerce/line-item-details'
import { GiftCardRecipientLine } from '@/components/cart/GiftCardRecipientLine'

const detailText = 'font-sans text-xs text-va-darkgray leading-snug'

export type CartLineItemDetailsVariant = 'cart' | 'payment' | 'summary'

interface CartLineItemDetailsProps {
  blocks: LineItemDetailBlock[]
  variant: CartLineItemDetailsVariant
  className?: string
}

/**
 * Renders `LineItemDetailBlock[]` from `buildCartLineItemDetailBlocks` for cart rows, payment overview, and order-summary lines.
 */
export function CartLineItemDetails({ blocks, variant, className }: CartLineItemDetailsProps) {
  if (!blocks.length) return null

  const wrapClass = clsx(
    variant === 'payment' && 'contents',
    className
  )

  return (
    <div className={wrapClass}>
      {blocks.map((block, i) => (
        <BlockFragment key={`${block.kind}-${i}`} block={block} variant={variant} />
      ))}
    </div>
  )
}

function BlockFragment({
  block,
  variant,
}: {
  block: LineItemDetailBlock
  variant: CartLineItemDetailsVariant
}) {
  switch (block.kind) {
    case 'session': {
      if (!block.lines.length) return null
      if (variant === 'cart') {
        return (
          <div className="mt-0.5 flex flex-col font-sans text-xs text-va-darkgray leading-snug">
            {block.lines.map((line, j) => (
              <span key={j}>{line}</span>
            ))}
          </div>
        )
      }
      if (variant === 'summary') {
        return (
          <div className="mt-0.5 space-y-0.5">
            {block.lines.map((line, j) => (
              <p key={j} className={detailText}>
                {line}
              </p>
            ))}
          </div>
        )
      }
      return (
        <>
          {block.lines.map((line, j) => (
            <p key={j} className={detailText}>
              {line}
            </p>
          ))}
        </>
      )
    }
    case 'instructors':
      return (
        <p className={clsx(detailText, variant === 'summary' && 'mt-0.5')}>
          {block.names.join(', ')}
        </p>
      )
    case 'quantity_label':
      return <p className={clsx(detailText, 'pt-0.5')}>{block.label}</p>
    case 'gift_recipient':
      return (
        <GiftCardRecipientLine
          meta={block.meta}
          className={clsx(variant === 'cart' && 'mt-1', variant === 'summary' && 'mt-0.5')}
        />
      )
    case 'notice':
      return (
        <p
          className={clsx(
            detailText,
            block.italic && 'italic',
            variant === 'cart' ? 'mt-1' : 'mt-0.5'
          )}
        >
          {block.text}
        </p>
      )
    default:
      return null
  }
}
