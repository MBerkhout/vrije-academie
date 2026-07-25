/** GA4 / GTM dataLayer event payloads for Vrije Academie. */

export type ConsentState = 'granted' | 'denied'

export type PageType =
  | 'home'
  | 'aanbod_overzicht'
  | 'activiteit_detail'
  | 'mand'
  | 'inschrijven'
  | 'bevestiging'
  | 'account'
  | 'vathuis'
  | 'cadeaubon'
  | 'overig'

export type UserData = {
  email?: string
  phone_number?: string
  first_name?: string
  last_name?: string
  postal_code?: string
  country?: string
}

export type CommerceItem = {
  item_id: string
  item_name: string
  item_category?: string
  item_category2?: string
  item_variant?: string
  price?: number
  quantity?: number
  index?: number
}

export type ItemListContext = {
  item_list_id: string
  item_list_name: string
}

export type PageViewEvent = {
  event: 'page_view'
  page_location: string
  page_title: string
  page_referrer: string
  page_type: PageType
}

export type ConsentUpdateEvent = {
  event: 'consent_update'
  ad_storage: ConsentState
  analytics_storage: ConsentState
  ad_user_data: ConsentState
  ad_personalization: ConsentState
}

export type SearchEvent = {
  event: 'search'
  search_term: string
  results_count: number
}

export type ScrollEvent = {
  event: 'scroll'
  percent_scrolled: number
  page_type: PageType
}

export type OutboundClickEvent = {
  event: 'click'
  link_url: string
  link_domain: string
  link_text: string
  outbound: true
}

export type SelectContentEvent = {
  event: 'select_content'
  content_type: string
  content_id: string
}

export type NewsletterSignupEvent = {
  event: 'newsletter_signup'
  form_location: string
  user_data: Pick<UserData, 'email'>
}

export type GenerateLeadEvent = {
  event: 'generate_lead'
  lead_type: string
  onderwerp?: string
  user_data: Pick<UserData, 'email'>
}

export type LoginEvent = {
  event: 'login'
  method: string
  user_data: Pick<UserData, 'email'>
}

export type SignUpEvent = {
  event: 'sign_up'
  method: string
  user_data: Pick<UserData, 'email'>
}

export type PasswordResetRequestEvent = {
  event: 'password_reset_request'
  user_data: Pick<UserData, 'email'>
}

export type ShareEvent = {
  event: 'share'
  method: string
  content_type: string
  item_id: string
}

export type EcommerceEventBase = {
  currency: 'EUR'
  value: number
  items: CommerceItem[]
}

export type AddToWishlistEvent = EcommerceEventBase & {
  event: 'add_to_wishlist'
}

export type ViewPromotionEvent = {
  event: 'view_promotion'
  promotion_id: string
  promotion_name: string
  creative_slot: string
}

export type SelectPromotionEvent = {
  event: 'select_promotion'
  promotion_id: string
  promotion_name: string
  creative_slot: string
}

export type ViewItemListEvent = ItemListContext & {
  event: 'view_item_list'
  items: CommerceItem[]
  load_type?: 'infinite_scroll'
  batch_id?: string
}

export type SelectItemEvent = ItemListContext & {
  event: 'select_item'
  items: CommerceItem[]
}

export type FilterChangeEvent = {
  event: 'filter_change'
  scope: 'aanbod_overzicht' | 'activiteit_detail'
  filter_name: string
  filter_value: string
  results_count: number
  item_id?: string
}

export type SortChangeEvent = {
  event: 'sort_change'
  item_list_id: string
  sort_option: string
}

export type ViewItemEvent = EcommerceEventBase & {
  event: 'view_item'
}

export type AddToCartEvent = EcommerceEventBase & {
  event: 'add_to_cart'
}

export type VideoStartEvent = {
  event: 'video_start'
  item_id: string
  item_name: string
  video_provider: string
}

export type VideoProgressEvent = {
  event: 'video_progress'
  item_id: string
  video_percent: number
}

export type VideoCompleteEvent = {
  event: 'video_complete'
  item_id: string
}

export type SelectCadeaubonBedragEvent = {
  event: 'select_cadeaubon_bedrag'
  bedrag: number
}

export type ViewCartEvent = EcommerceEventBase & {
  event: 'view_cart'
}

export type RemoveFromCartEvent = EcommerceEventBase & {
  event: 'remove_from_cart'
}

export type CartQuantityChangeEvent = {
  event: 'cart_quantity_change'
  item_id: string
  quantity_old: number
  quantity_new: number
}

export type ApplyCouponEvent = {
  event: 'apply_coupon'
  coupon: string
  currency: 'EUR'
  value: number
}

export type BeginCheckoutEvent = EcommerceEventBase & {
  event: 'begin_checkout'
  coupon?: string
  user_data?: UserData
}

export type AddPaymentInfoEvent = {
  event: 'add_payment_info'
  currency: 'EUR'
  value: number
  payment_type: string
  user_data?: UserData
}

export type CheckoutStepViewEvent = {
  event: 'checkout_step_view'
  step: number
  step_name: string
}

export type FormErrorEvent = {
  event: 'form_error'
  form_name: string
  field_name: string
  error_code: string
}

export type ViewAccountEvent = {
  event: 'view_account'
  account_section: string
}

export type UpdateAccountInfoEvent = {
  event: 'update_account_info'
  updated_fields: string[]
  user_data: Pick<UserData, 'email'>
}

export type LogoutEvent = {
  event: 'logout'
}

export type AnalyticsEvent =
  | PageViewEvent
  | ConsentUpdateEvent
  | SearchEvent
  | ScrollEvent
  | OutboundClickEvent
  | SelectContentEvent
  | NewsletterSignupEvent
  | GenerateLeadEvent
  | LoginEvent
  | SignUpEvent
  | PasswordResetRequestEvent
  | ShareEvent
  | AddToWishlistEvent
  | ViewPromotionEvent
  | SelectPromotionEvent
  | ViewItemListEvent
  | SelectItemEvent
  | FilterChangeEvent
  | SortChangeEvent
  | ViewItemEvent
  | AddToCartEvent
  | VideoStartEvent
  | VideoProgressEvent
  | VideoCompleteEvent
  | SelectCadeaubonBedragEvent
  | ViewCartEvent
  | RemoveFromCartEvent
  | CartQuantityChangeEvent
  | ApplyCouponEvent
  | BeginCheckoutEvent
  | AddPaymentInfoEvent
  | CheckoutStepViewEvent
  | FormErrorEvent
  | ViewAccountEvent
  | UpdateAccountInfoEvent
  | LogoutEvent
