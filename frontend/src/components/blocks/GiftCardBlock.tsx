'use client'

import { BlockWrapper } from '@/components/cms/BlockWrapper'
import { GiftCardPurchaseForm } from '@/components/gift-card/GiftCardPurchaseForm'
import { getTitleSizeClass, getTitleTag } from '@/lib/cms'
import type { Block, GiftCardBlockContent } from '@/lib/cms'
import { cn } from '@/lib/utils'

const DEFAULT_TITLE = 'Digitale cadeaubon'

function settingsFromBlock(block: Block): GiftCardBlockContent {
  const b = block as Record<string, unknown>
  return {
    pageTitle: b.pageTitle as GiftCardBlockContent['pageTitle'],
    pageTitleSize: b.pageTitleSize as GiftCardBlockContent['pageTitleSize'],
    intro: b.intro as GiftCardBlockContent['intro'],
    amountOptions: b.amountOptions as GiftCardBlockContent['amountOptions'],
    minAmountEuro: b.minAmountEuro as GiftCardBlockContent['minAmountEuro'],
    maxAmountEuro: b.maxAmountEuro as GiftCardBlockContent['maxAmountEuro'],
    section1Title: b.section1Title as GiftCardBlockContent['section1Title'],
    section2Title: b.section2Title as GiftCardBlockContent['section2Title'],
    customAmountLabel: b.customAmountLabel as GiftCardBlockContent['customAmountLabel'],
    recipientNameLabel: b.recipientNameLabel as GiftCardBlockContent['recipientNameLabel'],
    recipientEmailLabel: b.recipientEmailLabel as GiftCardBlockContent['recipientEmailLabel'],
    messageLabel: b.messageLabel as GiftCardBlockContent['messageLabel'],
    senderNameLabel: b.senderNameLabel as GiftCardBlockContent['senderNameLabel'],
    orderButtonLabel: b.orderButtonLabel as GiftCardBlockContent['orderButtonLabel'],
  }
}

export function GiftCardBlock({ block }: { block: Block }) {
  const settings = settingsFromBlock(block)
  const title = settings.pageTitle ?? DEFAULT_TITLE
  const size = settings.pageTitleSize ?? 'h1'
  const TitleTag = getTitleTag(size)

  return (
    <BlockWrapper block={block}>
      <div className="max-w-[1240px] mx-auto px-4 md:px-8 min-[1304px]:px-0 py-8">
        <TitleTag
          className={cn('font-sans font-bold text-va-black mb-8', getTitleSizeClass(size))}
        >
          {title}
        </TitleTag>
        <GiftCardPurchaseForm settings={settings} />
      </div>
    </BlockWrapper>
  )
}
