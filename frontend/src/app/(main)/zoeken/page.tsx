import Link from 'next/link'
import Image from 'next/image'
import { stegaClean } from 'next-sanity'
import { cmsClient } from '@/lib/cms/server'
import { isExternalHref } from '@/lib/menu-href'
import type { SiteSearchHit } from '@/lib/cms/types'

type Props = { searchParams: Promise<{ q?: string }> }

const SECTION_ORDER: { key: SiteSearchHit['kind']; label: string }[] = [
  { key: 'product', label: 'Producten' },
  { key: 'category', label: 'Categorieën' },
  { key: 'place', label: 'Plaatsen' },
  { key: 'page', label: "Pagina's" },
  { key: 'docent', label: 'Docenten' },
  { key: 'person', label: 'Team' },
]

function SearchHitRow({ hit }: { hit: SiteSearchHit }) {
  const title = stegaClean(hit.title)
  const subtitle = hit.subtitle ? stegaClean(hit.subtitle) : undefined
  const excerpt = hit.excerpt ? stegaClean(hit.excerpt) : undefined
  const className =
    'flex gap-4 rounded-none border border-va-lightgray-300 bg-white px-4 py-3 transition-colors hover:border-va-gray-400'

  const inner = (
    <>
      {hit.kind === 'product' && hit.thumbnailUrl ? (
        <div className="relative h-16 w-16 shrink-0 overflow-hidden bg-va-lightgray-200">
          <Image src={hit.thumbnailUrl} alt="" fill className="object-cover" sizes="64px" />
        </div>
      ) : (
        <div className="flex h-16 w-16 shrink-0 items-center justify-center bg-va-lightgray-200 text-xs font-semibold uppercase text-va-gray">
          {hit.kind === 'place' ? 'PL' : hit.kind === 'category' ? 'CA' : hit.kind === 'page' ? 'PG' : 'AC'}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <span className="font-sans text-base font-semibold text-va-black">{title}</span>
        {subtitle ? (
          <span className="mt-0.5 block font-sans text-xs uppercase tracking-wide text-va-gray">
            {subtitle}
          </span>
        ) : null}
        {excerpt ? (
          <span className="mt-2 block font-serif text-sm text-va-darkgray line-clamp-2">{excerpt}</span>
        ) : null}
      </div>
    </>
  )

  if (isExternalHref(hit.href)) {
    return (
      <a href={hit.href} className={className} rel="noopener noreferrer" target="_blank">
        {inner}
      </a>
    )
  }

  return (
    <Link href={hit.href} className={className}>
      {inner}
    </Link>
  )
}

function groupHits(hits: SiteSearchHit[]): Map<SiteSearchHit['kind'], SiteSearchHit[]> {
  const map = new Map<SiteSearchHit['kind'], SiteSearchHit[]>()
  for (const hit of hits) {
    const list = map.get(hit.kind) ?? []
    list.push(hit)
    map.set(hit.kind, list)
  }
  return map
}

export default async function SearchPage({ searchParams }: Props) {
  const { q } = await searchParams
  const query = (q ?? '').trim()
  const hits = query ? await cmsClient.searchSiteContent(query) : []
  const grouped = groupHits(hits)

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 font-serif text-va-darkgray">
      <h1 className="mb-4 font-sans text-2xl text-va-black">Zoeken</h1>
      {query ? (
        <>
          <p className="mb-8 text-sm">
            Resultaten voor{' '}
            <span className="font-sans text-va-black">{query}</span>
            {hits.length > 0 ? (
              <span className="text-va-gray"> — {hits.length} gevonden</span>
            ) : null}
          </p>
          {hits.length > 0 ? (
            <div className="space-y-10">
              {SECTION_ORDER.map(({ key, label }) => {
                const sectionHits = grouped.get(key)
                if (!sectionHits?.length) return null
                return (
                  <section key={key}>
                    <h2 className="mb-3 font-sans text-sm font-semibold uppercase tracking-wide text-va-gray">
                      {label}
                    </h2>
                    <ul className="flex flex-col gap-3">
                      {sectionHits.map((hit, i) => (
                        <li key={`${hit.kind}-${hit.href}-${i}`}>
                          <SearchHitRow hit={hit} />
                        </li>
                      ))}
                    </ul>
                  </section>
                )
              })}
            </div>
          ) : (
            <p className="font-sans text-sm text-va-darkgray">
              Geen resultaten in de inhoud. Probeer andere woorden, of gebruik het aanbod op{' '}
              <Link href="/ons-aanbod" className="underline decoration-va-yellow underline-offset-2">
                Ons aanbod
              </Link>
              .
            </p>
          )}
        </>
      ) : (
        <p className="text-sm">Voer een zoekterm in via het zoekveld in de header.</p>
      )}
    </div>
  )
}
