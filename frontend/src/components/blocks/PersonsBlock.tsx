'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { BlockWrapper } from '@/components/cms/BlockWrapper'
import { PortableText } from '@/components/cms/PortableText'
import { SanityImage } from '@/components/cms/SanityImage'
import { Button, Input } from '@/components/ui'
import { getTitleTag, getTitleSizeClass, type Person, type PersonsBlock as PersonsBlockType } from '@/lib/cms'
import { cn } from '@/lib/utils'

function normalizeSearch(s: string) {
  return s.trim().toLocaleLowerCase('nl-NL').replace(/\s+/g, ' ')
}

function personSearchHaystack(person: Person): string {
  const parts = [person.name, person.role, person.bio, person.personType].filter(Boolean) as string[]
  return normalizeSearch(parts.join(' '))
}

export function PersonsBlock({ block }: { block: PersonsBlockType }) {
  const raw = block.persons ?? []
  const maxItems = block.dynamicFilters?.maxItems
  const persons =
    block.dataSource === 'dynamic' && typeof maxItems === 'number' && maxItems > 0
      ? raw.slice(0, maxItems)
      : raw
  const [query, setQuery] = useState('')
  const searchOn = Boolean(block.searchOnPage)
  const qNorm = normalizeSearch(query)

  const filtered = useMemo(() => {
    if (!searchOn || !qNorm) return persons
    return persons.filter((p) => {
      if (typeof p !== 'object' || p === null || !('_id' in p)) return false
      return personSearchHaystack(p as Person).includes(qNorm)
    })
  }, [persons, searchOn, qNorm])

  const cols = block.columnsDesktop === '2' ? 'lg:grid-cols-2' : block.columnsDesktop === '4' ? 'lg:grid-cols-4' : 'lg:grid-cols-3'
  const Tag = getTitleTag(block.titleSize)
  const searchPlaceholder =
    block.searchPlaceholder?.trim() || 'Zoek op naam, functie of bio…'

  return (
    <BlockWrapper block={block}>
      <div className="space-y-6">
        {block.title && (
          <Tag className={cn(getTitleSizeClass(block.titleSize), 'font-sans font-bold text-va-black')}>{block.title}</Tag>
        )}
        {block.introText && block.introText.length > 0 && (
          <PortableText value={block.introText} />
        )}
        {searchOn && persons.length > 0 && (
          <Input
            type="search"
            name="persons-search"
            label="Zoeken"
            placeholder={searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
            aria-controls="persons-block-grid"
          />
        )}
        {persons.length === 0 && (
          <p className="text-va-gray text-center py-8">Geen personen gevonden.</p>
        )}
        {persons.length > 0 && filtered.length === 0 && searchOn && qNorm && (
          <p className="text-va-gray text-center py-8" role="status">
            Geen resultaten voor &quot;{query.trim()}&quot;.
          </p>
        )}
        {filtered.length > 0 && (
          <div
            id="persons-block-grid"
            className={cn('grid grid-cols-1 gap-3 md:grid-cols-2', cols)}
          >
            {filtered.map((p) => {
              const person = typeof p === 'object' && p !== null && '_id' in p ? p : null
              if (!person) return null
              const name = (person as { name?: string }).name ?? ''
              const role = (person as { role?: string }).role
              const photo = (person as { photo?: { asset?: unknown } }).photo
              const bio = (person as { bio?: string }).bio
              const profileUrl = (person as { profileUrl?: string }).profileUrl
              return (
                <article key={(person as { _id?: string })._id} className="border border-va-lightgray rounded p-4">
                  <div className="flex gap-4">
                    {photo ? (
                      <div className="h-[126px] w-[100px] flex-shrink-0 overflow-hidden rounded">
                        <SanityImage source={photo} width={100} height={126} aspectRatio="" />
                      </div>
                    ) : (
                      <div
                        className="flex h-[126px] w-[100px] flex-shrink-0 items-center justify-center rounded bg-va-lightgray"
                        aria-hidden
                      >
                        <span className="text-va-gray text-xl">?</span>
                      </div>
                    )}
                    <div>
                      <h3 className={cn(getTitleSizeClass('h3'), 'font-sans font-semibold text-va-black')}>{name}</h3>
                      {role && <p className="text-sm text-va-gray">{role}</p>}
                      {bio && <p className="text-sm text-va-darkgray mt-2">{bio}</p>}
                      {profileUrl && (
                        <Link href={profileUrl} className="text-va-orange underline text-sm mt-1 inline-block">
                          Profiel
                        </Link>
                      )}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
        {block.ctaEnabled && block.ctaLabel && block.ctaUrl && (
          <Button variant="primary" href={block.ctaUrl}>
            {block.ctaLabel}
          </Button>
        )}
      </div>
    </BlockWrapper>
  )
}
