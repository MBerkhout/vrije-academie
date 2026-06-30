import Image from 'next/image'
import { CONTAINER_CLASS } from '@/lib/cms'

interface VaThuisHeroProps {
  title: string
  intro?: string | null
  imageUrl?: string | null
}

export function VaThuisHero({ title, intro, imageUrl }: VaThuisHeroProps) {
  return (
    <section className={`${CONTAINER_CLASS} py-10 md:py-14`}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        <div>
          <h1 className="font-sans text-3xl md:text-4xl font-bold text-white leading-tight">
            {title}
          </h1>
          {intro ? (
            <p className="mt-4 text-base md:text-lg text-va-gray-300 max-w-xl">{intro}</p>
          ) : null}
        </div>
        <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-va-darkgray-900">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt=""
              fill
              className="object-contain p-4"
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-va-gray-500 text-sm">
              VA Thuis
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
