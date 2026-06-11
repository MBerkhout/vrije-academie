import { PortableText } from '@portabletext/react'
import { cn } from '@/lib/utils'

interface PlpHeaderProps {
  title: string
  intro?: unknown[]
  className?: string
}

export function PlpHeader({ title, intro, className }: PlpHeaderProps) {
  return (
    <div className={cn('space-y-3', className)}>
      <h1 className="font-sans text-3xl md:text-4xl font-bold text-va-black">{title}</h1>
      {intro && Array.isArray(intro) && intro.length > 0 && (
        <div className="prose prose-sm max-w-2xl text-va-darkgray">
          <PortableText value={intro as any} />
        </div>
      )}
    </div>
  )
}
