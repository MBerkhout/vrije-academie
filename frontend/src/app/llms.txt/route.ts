import { getSiteOrigin } from '@/lib/json-ld'
import { isNoIndexSite } from '@/lib/cms/seo-metadata'

export const revalidate = 3600

/** `/llms.txt` — short Markdown overview for LLM crawlers (see llmstxt.org). */
export function GET() {
  if (isNoIndexSite()) {
    return new Response('', { status: 404 })
  }

  const origin = getSiteOrigin()
  const body = `# Vrije Academie

> Vrije Academie biedt colleges, lezingen, workshops, rondleidingen, wandelingen en reizen op het gebied van kunst, geschiedenis en cultuur, op locatie en online.

## Aanbod

- [Ons aanbod](${origin}/ons-aanbod): alle colleges, workshops, rondleidingen en reizen
- [Agenda](${origin}/agenda): komende activiteiten
- [VA Thuis](${origin}/va-thuis): online colleges en video's terugkijken
- [Cadeaubon](${origin}/cadeaubon)

## Overig

- [Sitemap](${origin}/sitemap.xml)
`

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
