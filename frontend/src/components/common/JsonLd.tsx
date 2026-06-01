import { stringifyJsonLd } from '@/lib/json-ld'

/** Server-safe `<script type="application/ld+json">` using shared escaping. */
export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: stringifyJsonLd(data) }}
    />
  )
}
