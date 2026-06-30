import Image from 'next/image'
import Link from 'next/link'
import { plpProductPath } from '@/lib/routes'
import type { RelatedProductCard } from '@/lib/cms/sanity-refs'
import { formatPriceEur } from '@/lib/locale-format'

interface PdpRelatedProductsProps {
  products?: RelatedProductCard[]
  heading?: string
  stockThreshold?: number
}

/** Editor-curated related products from Sanity. Hidden when empty. */
export function PdpRelatedProducts({ products, heading = 'Gerelateerd', stockThreshold = 5 }: PdpRelatedProductsProps) {
  if (!products?.length) return null

  return (
    <section className="py-10">
      <h2 className="font-sans text-2xl font-bold text-va-black mb-6">{heading}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {products.map((product) => {
          const href = product.handle ? plpProductPath(product.handle) : '#'
          return (
            <article key={product._id} className="group rounded-lg border border-va-lightgray overflow-hidden flex flex-col bg-white hover:shadow-md transition-shadow">
              <Link href={href} className="relative block aspect-[4/3] rounded-t-lg bg-va-lightgray overflow-hidden">
                {product.thumbnailUrl ? (
                  <Image
                    src={product.thumbnailUrl}
                    alt={product.title ?? ''}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 768px) 100vw, 25vw"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-4xl text-va-gray/40">VA</span>
                  </div>
                )}
              </Link>
              <div className="p-4 flex flex-col gap-1.5 flex-1">
                <Link href={href} className="hover:text-va-yellow transition-colors">
                  <h3 className="font-sans font-bold text-va-black text-base leading-snug line-clamp-2">
                    {product.title}
                  </h3>
                </Link>
                {product.priceFrom ? (
                  <span className="text-sm font-semibold text-va-black mt-auto pt-2">
                    Vanaf {formatPriceEur(product.priceFrom)}
                  </span>
                ) : null}
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
