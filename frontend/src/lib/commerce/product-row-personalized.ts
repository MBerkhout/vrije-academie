/**
 * Resolve handles and heading for personalized product row blocks.
 */

import { MAX_RECENT_DISPLAY } from './recent-viewed'

export type PersonalizedProductRowMode = 'favorites' | 'recent' | 'none'

export interface PersonalizedProductRowBlockTitles {
  title?: string
  titleFavorites?: string
  titleRecent?: string
}

export function resolvePersonalizedProductRowHandles(
  wishlistHandles: string[],
  recentHandles: string[],
): { mode: PersonalizedProductRowMode; handles: string[] } {
  if (wishlistHandles.length > 0) {
    return {
      mode: 'favorites',
      handles: wishlistHandles.slice(0, MAX_RECENT_DISPLAY),
    }
  }
  if (recentHandles.length > 0) {
    return {
      mode: 'recent',
      handles: recentHandles.slice(0, MAX_RECENT_DISPLAY),
    }
  }
  return { mode: 'none', handles: [] }
}

export function personalizedProductRowHeading(
  block: PersonalizedProductRowBlockTitles,
  mode: Exclude<PersonalizedProductRowMode, 'none'>,
): string {
  if (mode === 'favorites') {
    return block.titleFavorites?.trim() || block.title?.trim() || ''
  }
  return block.titleRecent?.trim() || block.title?.trim() || ''
}
