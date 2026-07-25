import { PortableText } from '@portabletext/react'
import { cn } from '@/lib/utils'

interface PlpHeaderProps {
  title: string
  intro?: unknown[]
  introText?: string
  className?: string
}

export function PlpHeader({ title, intro, introText, className }: PlpHeaderProps) {
  return (
    <div className={cn('space-y-2 md:space-y-3', className)}>
      <h1 className="font-sans text-2xl md:text-4xl font-bold text-va-black">{title}</h1>
      {introText ? (
        <p className="max-w-2xl font-sans text-sm text-va-darkgray">{introText}</p>
      ) : null}
      {!introText && intro && Array.isArray(intro) && intro.length > 0 && (
        <div className="prose prose-sm max-w-2xl text-va-darkgray">
          <PortableText value={intro as any} />
        </div>
      )}
    </div>
  )
}
