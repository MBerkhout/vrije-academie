import { productCtaBarFromEvent, textColorForHexBackground } from '@/lib/product-cta-bar'
import { cn } from '@/lib/utils'

interface ProductCardCtaBarProps {
  event: {
    badge?: string | null
    cta_color?: string | null
    cta_color_hover?: string | null
  }
  className?: string
  showChevron?: boolean
}

/** Salesforce CTA bar shown beneath a product card (PLP, homepage columns, …). */
export function ProductCardCtaBar({ event, className, showChevron = false }: ProductCardCtaBarProps) {
  const bar = productCtaBarFromEvent(event)
  if (!bar) return null

  const textColor = textColorForHexBackground(bar.color)

  return (
    <div
      className={cn(
        'border-t border-va-lightgray px-3 py-1.5 md:px-4',
        'font-sans text-[10px] font-bold uppercase tracking-wide transition-colors',
        'group-hover:[background-color:var(--product-cta-hover-bg)]',
        showChevron && 'flex items-center justify-between gap-1',
        className,
      )}
      style={{
        backgroundColor: bar.color,
        color: textColor,
        ['--product-cta-hover-bg' as string]: bar.colorHover,
      }}
    >
      <span>{bar.label}</span>
      {showChevron ? (
        <span aria-hidden className="text-sm leading-none">
          ›
        </span>
      ) : null}
    </div>
  )
}
