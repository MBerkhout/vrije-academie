import { VaThuisPromoTiles } from '@/components/vathuis/VaThuisPromoTiles'
import type { VathuisPromoTilesBlock as VathuisPromoTilesBlockType } from '@/lib/cms'

export function VathuisPromoTilesBlock({ block }: { block: VathuisPromoTilesBlockType }) {
  const tiles = block.tiles ?? []
  if (!tiles.length) return null

  return <VaThuisPromoTiles tiles={tiles as Parameters<typeof VaThuisPromoTiles>[0]['tiles']} />
}
