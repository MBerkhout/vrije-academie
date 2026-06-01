import Image from 'next/image'
import Link from 'next/link'

interface BannerData {
  enabled: boolean
  title?: string
  subtitle?: string
  image?: { asset?: { url: string } }
  ctaLabel?: string
  ctaUrl?: string
}

export function PlpBanner({ banner }: { banner: BannerData }) {
  if (!banner.enabled) return null
  return (
    <div className="relative w-full bg-va-yellow overflow-hidden mt-4">
      {banner.image?.asset?.url && (
        <div className="absolute inset-0">
          <Image
            src={banner.image.asset.url}
            alt={banner.title ?? ''}
            fill
            className="object-cover opacity-20"
            sizes="100vw"
          />
        </div>
      )}
      <div className="relative max-w-[1240px] mx-auto px-4 md:px-8 py-12 flex flex-col gap-3">
        {banner.title && (
          <h2 className="font-serif text-2xl md:text-3xl text-va-black font-bold">
            {banner.title}
          </h2>
        )}
        {banner.subtitle && (
          <p className="text-va-black/80 max-w-xl">{banner.subtitle}</p>
        )}
        {banner.ctaLabel && banner.ctaUrl && (
          <Link
            href={banner.ctaUrl}
            className="mt-2 inline-flex items-center gap-2 bg-va-black text-white px-5 py-2.5 font-medium text-sm hover:bg-va-black/80 transition-colors w-fit"
          >
            {banner.ctaLabel}
          </Link>
        )}
      </div>
    </div>
  )
}
