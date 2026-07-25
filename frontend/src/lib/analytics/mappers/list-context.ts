import type { ItemListContext } from '@/lib/analytics/types'
import { plpListIdFromPath } from '@/lib/analytics/page-types'

export function buildPlpListContext(options: {
  pathname: string
  categorySlug?: string | null
  categoryLabel?: string | null
  searchQuery?: string | null
}): ItemListContext {
  const { pathname, categorySlug, categoryLabel, searchQuery } = options
  if (searchQuery?.trim()) {
    return {
      item_list_id: 'zoekresultaten',
      item_list_name: `Zoeken: ${searchQuery.trim()}`,
    }
  }
  const listId = plpListIdFromPath(pathname, categorySlug)
  const listName = categoryLabel?.trim() || listId.replace(/^aanbod_/, '').replace(/_/g, ' ')
  return {
    item_list_id: listId,
    item_list_name: listName.charAt(0).toUpperCase() + listName.slice(1),
  }
}

export function buildAgendaListContext(): ItemListContext {
  return { item_list_id: 'agenda', item_list_name: 'Agenda' }
}

export function buildHomeCarouselListContext(blockKey: string, title?: string | null): ItemListContext {
  const id = blockKey.trim() || 'homepage_carousel'
  return {
    item_list_id: `home_${id}`,
    item_list_name: title?.trim() || 'Homepage aanbod',
  }
}

export function buildVathuisListContext(): ItemListContext {
  return { item_list_id: 'vathuis_aanbod', item_list_name: 'VA Thuis' }
}
