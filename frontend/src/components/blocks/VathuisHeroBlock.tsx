import { VaThuisHero } from '@/components/vathuis/VaThuisHero'
import type { VathuisHeroBlock as VathuisHeroBlockType } from '@/lib/cms'

export function VathuisHeroBlock({ block }: { block: VathuisHeroBlockType }) {
  const title = block.title?.trim() || 'De Vrije Academie bij jou thuis'

  return (
    <VaThuisHero
      title={title}
      intro={block.intro}
      imageUrl={block.image?.asset?.url}
    />
  )
}
