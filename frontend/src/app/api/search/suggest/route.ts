import { NextResponse } from 'next/server'
import { cmsClient } from '@/lib/cms/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = (searchParams.get('q') ?? '').trim()
  if (q.length < 2) {
    return NextResponse.json({
      products: [],
      categories: [],
      places: [],
      pages: [],
    })
  }

  const result = await cmsClient.searchSuggestions(q)
  return NextResponse.json(result, {
    headers: {
      'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
    },
  })
}
