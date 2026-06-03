/**
 * Enrichment for cart line items from `GET /store/cart/extras` (session, product display, docenten).
 */
export interface CartItemExtras {
  line_item_id: string
  product_id: string | null
  product_handle: string | null
  product_title: string | null
  thumbnail: string | null
  event_item: {
    delivery_type: string | null
    start_at: string | null
    end_at: string | null
    city: string | null
  } | null
  /** VAthuis / online course: episode count + total duration (from Salesforce or episode metadata). */
  vathuis: {
    episode_count_label: string | null
    play_time: string | null
  } | null
  instructor_names: string[]
}
