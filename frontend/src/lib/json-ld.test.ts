import { describe, expect, it } from 'vitest'
import type { GeneralSettings } from '@/lib/cms/types'
import {
  ORG_NAME,
  buildBreadcrumbListJsonLd,
  buildFaqPageJsonLd,
  buildItemListJsonLd,
  buildOrganizationJsonLd,
  buildPdpEventOrCourseJsonLd,
  buildWebSiteJsonLd,
  getOrganizationId,
  resolveProductSchemaFields,
} from './json-ld'

describe('json-ld', () => {
  it('buildOrganizationJsonLd uses stable @id and footer fallbacks', () => {
    const settings = {
      header: {},
      organization: {
        legalName: 'Vrije Academie B.V.',
        email: 'info@vrijeacademie.nl',
      },
      footer: {
        contact: {
          address: 'Herengracht 368, 1016 CH Amsterdam',
          phone: 'Telefoon: 088 - 518 5000',
        },
        socialLinks: [{ platform: 'Facebook', url: 'https://facebook.com/va' }],
      },
    } as GeneralSettings

    const schema = buildOrganizationJsonLd(settings)

    expect(schema['@id']).toBe(getOrganizationId())
    expect(schema.name).toBe('Vrije Academie B.V.')
    expect(schema.email).toBe('info@vrijeacademie.nl')
    expect(schema.address).toBe('Herengracht 368, 1016 CH Amsterdam')
    expect(schema.telephone).toBe('088 - 518 5000')
    expect(schema.sameAs).toEqual(['https://facebook.com/va'])
  })

  it('buildWebSiteJsonLd includes SearchAction and publisher reference', () => {
    const schema = buildWebSiteJsonLd()
    expect(schema['@type']).toBe('WebSite')
    expect(schema.name).toBe(ORG_NAME)
    expect(schema.publisher).toEqual({ '@id': getOrganizationId() })
    expect(schema.potentialAction).toMatchObject({
      '@type': 'SearchAction',
      target: {
        urlTemplate: expect.stringContaining('/zoeken?q={search_term_string}'),
      },
    })
  })

  it('resolveProductSchemaFields prefers editorial seo over mirror and event data', () => {
    const fields = resolveProductSchemaFields(
      {
        seo: { metaTitle: 'Editorial title', metaDescription: 'Editorial desc' },
        seoTitle: 'Mirror title',
        seoDescription: 'Mirror desc',
      },
      { title: 'Event title', description: 'Event description' },
    )

    expect(fields).toEqual({
      name: 'Editorial title',
      description: 'Editorial desc',
      image: undefined,
    })
  })

  it('buildPdpEventOrCourseJsonLd builds Course with offers and instructor', () => {
    const schema = buildPdpEventOrCourseJsonLd('kunst-cursus', {
      title: 'Kunst cursus',
      description: 'Leer schilderen',
      record_type: 'collegereeks',
      price_from: 12500,
      min_available_quantity: 3,
      instructors: [{ id: '1', slug: 'jan', name: 'Jan Docent', photo_url: null }],
    })

    expect(schema['@type']).toBe('Course')
    expect(schema.name).toBe('Kunst cursus')
    expect(schema.provider).toEqual({ '@id': getOrganizationId() })
    expect(schema.instructor).toEqual({ '@type': 'Person', name: 'Jan Docent' })
    expect(schema.offers).toEqual({
      '@type': 'Offer',
      price: '125.00',
      priceCurrency: 'EUR',
      availability: 'https://schema.org/InStock',
    })
  })

  it('buildPdpEventOrCourseJsonLd builds Event with attendance mode and end date', () => {
    const schema = buildPdpEventOrCourseJsonLd('studiedag', {
      title: 'Studiedag',
      record_type: 'studiedag',
      earliest_start_at: '2026-09-01T10:00:00.000Z',
      delivery_types: ['online', 'offline'],
      price_from: 9900,
      min_available_quantity: 1,
      variants: [
        {
          id: 'v1',
          title: 'Amsterdam',
          prices: [{ amount: 9900, currency_code: 'eur' }],
          event_item: {
            id: 'ei1',
            delivery_type: 'offline',
            available_quantity: 1,
            start_at: '2026-09-01T10:00:00.000Z',
            end_at: '2026-09-01T16:00:00.000Z',
            city: 'Amsterdam',
            location_name: 'Vasari',
            is_free_trial: false,
          },
        },
      ],
    })

    expect(schema['@type']).toBe('Event')
    expect(schema.eventAttendanceMode).toBe('https://schema.org/MixedEventAttendanceMode')
    expect(schema.endDate).toBe('2026-09-01T16:00:00.000Z')
    expect(schema.organizer).toEqual({ '@id': getOrganizationId() })
  })

  it('buildBreadcrumbListJsonLd and buildItemListJsonLd keep list positions', () => {
    const breadcrumbs = buildBreadcrumbListJsonLd([
      { name: 'Home', item: '/' },
      { name: 'Ons aanbod', item: '/ons-aanbod' },
    ])
    expect(breadcrumbs.itemListElement).toHaveLength(2)
    expect((breadcrumbs.itemListElement as { position: number }[])[1].position).toBe(2)

    const itemList = buildItemListJsonLd({
      name: 'Ons aanbod',
      numberOfItems: 2,
      items: [
        { path: '/ons-aanbod/a', name: 'A', priceFromCents: 5000, inStock: true },
        { path: '/ons-aanbod/b', name: 'B' },
      ],
    })
    const first = (itemList.itemListElement as Record<string, unknown>[])[0]
    expect(first.offers).toMatchObject({ price: '50.00' })
  })

  it('buildFaqPageJsonLd returns null for empty items', () => {
    expect(buildFaqPageJsonLd([])).toBeNull()
    expect(
      buildFaqPageJsonLd([{ question: 'Q?', answer: 'A.' }])?.mainEntity,
    ).toHaveLength(1)
  })
})
