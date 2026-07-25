export { pushEvent, pushRaw, initDataLayer } from '@/lib/analytics/data-layer'
export * from '@/lib/analytics/types'
export * from '@/lib/analytics/config'
export * from '@/lib/analytics/page-types'
export * from '@/lib/analytics/mappers/commerce-item'
export * from '@/lib/analytics/mappers/cart'
export * from '@/lib/analytics/mappers/user-data'
export * from '@/lib/analytics/mappers/list-context'
export * from '@/lib/analytics/mappers/money'

export { trackPageView } from '@/lib/analytics/events/site-wide'
export { trackConsentUpdate } from '@/lib/analytics/events/consent'
export {
  trackSearch,
  trackScroll,
  trackOutboundClick,
  trackSelectContent,
  trackNewsletterSignup,
  trackGenerateLead,
  trackLogin,
  trackSignUp,
  trackPasswordResetRequest,
  trackShare,
  trackLogout,
  trackFormError,
} from '@/lib/analytics/events/engagement'
export {
  trackAddToWishlist,
  trackViewPromotion,
  trackSelectPromotion,
  trackViewItemList,
  trackSelectItem,
  trackFilterChange,
  trackSortChange,
  trackViewItem,
  trackAddToCart,
  trackSelectCadeaubonBedrag,
  trackViewCart,
  trackRemoveFromCart,
  trackCartQuantityChange,
  trackApplyCoupon,
  trackBeginCheckout,
  trackAddPaymentInfo,
  trackCheckoutStepView,
  trackVideoStart,
  trackVideoProgress,
  trackVideoComplete,
  trackViewAccount,
  trackUpdateAccountInfo,
} from '@/lib/analytics/events/ecommerce'
