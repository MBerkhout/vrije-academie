import Image from 'next/image'
import Link from 'next/link'
import { CONTAINER_CLASS } from '@/lib/cms'

interface PromoTile {
  title: string
  description?: string | null
  href?: string | null
  image?: { asset?: { url: string } } | null
}

interface VaThuisPromoTilesProps {
  tiles: PromoTile[]
}

export function VaThuisPromoTiles({ tiles }: VaThuisPromoTilesProps) {
  if (!tiles.length) return null

  return (
    <section className={`${CONTAINER_CLASS} py-12`}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {tiles.map((tile) => {
          const href = tile.href?.trim() || '#'
          const imageUrl = tile.image?.asset?.url

          return (
            <Link
              key={tile.title}
              href={href}
              className="group flex gap-4 rounded-lg bg-va-darkgray-900 border border-va-darkgray-700 p-4 hover:border-va-yellow/50 transition-colors"
            >
              <div className="relative h-20 w-28 shrink-0 rounded overflow-hidden bg-va-darkgray-800">
                {imageUrl ? (
                  <Image src={imageUrl} alt="" fill className="object-cover" sizes="112px" />
                ) : null}
              </div>
              <div className="flex flex-1 flex-col justify-center min-w-0">
                <h3 className="font-sans font-bold text-white group-hover:text-va-yellow transition-colors">
                  {tile.title}
                </h3>
                {tile.description ? (
                  <p className="mt-1 text-sm text-va-gray-400 line-clamp-2">{tile.description}</p>
                ) : null}
              </div>
              <span className="self-center text-va-yellow text-xl shrink-0" aria-hidden>
                →
              </span>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
