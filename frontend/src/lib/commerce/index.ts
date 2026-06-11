/**
 * Commerce abstraction layer
 * Export commerce-agnostic interface and Medusa implementation
 */

export * from './types'
export {
  WISHLIST_METADATA_KEY,
  normalizeHandle,
  parseWishlistHandles,
  getWishlistHandlesLocal,
  mergeWishlistHandles,
} from './wishlist'
export {
  RECENT_VIEWED_METADATA_KEY,
  MAX_RECENT_DISPLAY,
  MAX_RECENT_STORED,
  getRecentViewedHandlesLocal,
  mergeRecentViewedHandles,
  parseRecentViewedHandles,
  handlesForRecentDisplay,
} from './recent-viewed'
export {
  resolvePersonalizedProductRowHandles,
  personalizedProductRowHeading,
  type PersonalizedProductRowMode,
  type PersonalizedProductRowBlockTitles,
} from './product-row-personalized'
export { medusaClient as commerceClient } from './medusa-client'
export { useWishlist } from './useWishlist'
