import { NextResponse } from 'next/server'
import { commerceClient } from '@/lib/commerce'
import { cityFacetsToPlaceSuggestions } from '@/lib/commerce/places-search'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = (searchParams.get('q') ?? '').trim()
  try {
    const { facets } = await commerceClient.getEventsPaginated({ limit: 1 })
    const places = cityFacetsToPlaceSuggestions(facets.cities, q, q ? 10 : 12)

    return NextResponse.json({ places }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    })
  } catch {
    // Medusa unavailable: degrade to an empty suggestion list instead of a 500.
    return NextResponse.json({ places: [] }, {
      status: 503,
      headers: { 'Cache-Control': 'public, s-maxage=10', 'Retry-After': '10' },
    })
  }
}
