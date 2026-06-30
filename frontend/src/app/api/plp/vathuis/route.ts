import { NextResponse } from 'next/server'
import { commerceClient } from '@/lib/commerce'
import { parseVathuisFilterState, VATHUIS_PAGE_SIZE } from '@/app/(main)/va-thuis/_state/url'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const filterState = parseVathuisFilterState(searchParams)
  const offset = Math.max(0, Number(searchParams.get('offset') ?? '0'))
  const limit = Math.min(48, Math.max(1, Number(searchParams.get('limit') ?? VATHUIS_PAGE_SIZE)))
  const sort = filterState.sort ?? (filterState.q ? 'relevance' : 'order')

  try {
    const result = await commerceClient.getVathuisPaginated({
      ...filterState,
      sort,
      limit,
      offset,
    })
    return NextResponse.json({
      items: result.items,
      count: result.count,
      facets: result.facets,
    })
  } catch {
    return NextResponse.json({ error: 'Failed to load VA Thuis catalog' }, { status: 500 })
  }
}
