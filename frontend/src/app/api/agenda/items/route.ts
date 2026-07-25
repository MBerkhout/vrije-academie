import { NextResponse } from 'next/server'
import { commerceClient } from '@/lib/commerce'
import { parseFilterState, PAGE_SIZE } from '@/app/(main)/agenda/_state/url'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const filterState = parseFilterState(searchParams)
  const offset = Math.max(0, Number(searchParams.get('offset') ?? '0'))
  const limit = Math.min(48, Math.max(1, Number(searchParams.get('limit') ?? PAGE_SIZE)))
  const sort = filterState.sort ?? (filterState.q ? 'relevance' : 'start_date')

  try {
    const result = await commerceClient.getAgendaPaginated({
      ...filterState,
      sort,
      limit,
      offset,
    })
    return NextResponse.json({
      items: result.items,
      count: result.count,
    })
  } catch {
    return NextResponse.json({ error: 'Failed to load agenda items' }, { status: 500 })
  }
}
