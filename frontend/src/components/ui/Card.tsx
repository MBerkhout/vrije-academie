import Image from 'next/image'
import Link from 'next/link'
import { urlFor } from '@/lib/cms'
import { cn } from '@/lib/utils'

interface CardProps {
  title: string
  image?: Parameters<typeof urlFor>[0]
  description?: string
  link?: string
  linkText?: string
  as?: 'div' | 'article'
  className?: string
}

export function Card({
  title,
  image,
  description,
  link,
  linkText = 'Bekijk meer',
  as: Component = 'div',
  className,
}: CardProps) {
  const cardContent = (
    <>
      {image && (
        <div className="w-full h-40 relative overflow-hidden">
          <Image
            src={urlFor(image).url()}
            alt={title}
            fill
            className="object-cover"
          />
        </div>
      )}
      <div className="p-4">
        <h3 className="font-sans text-sm font-semibold text-va-black leading-snug mb-2">
          {title}
        </h3>
        {description && (
          <p className="font-serif text-xs text-va-darkgray mb-2">
            {description}
          </p>
        )}
        {link && (
          <span className="text-xs font-semibold text-va-gold hover:text-va-gold-700 hover:underline">
            {linkText} →
          </span>
        )}
      </div>
    </>
  )

  const cardClasses = cn(
    'bg-va-white border border-va-lightgray rounded-sm overflow-hidden hover:shadow-sm transition-shadow',
    className
  )

  if (link) {
    return (
      <Link href={link} className={cardClasses}>
        {cardContent}
      </Link>
    )
  }

  return (
    <Component className={cardClasses}>{cardContent}</Component>
  )
}
