/**
 * Sanity Live Content API for real-time updates and Visual Editing.
 */

import { defineLive } from 'next-sanity/live'
import { sanityPreviewClient } from './sanity-preview-client'

const token = process.env.SANITY_API_READ_TOKEN || ''

export const { sanityFetch, SanityLive } = defineLive({
  client: sanityPreviewClient.withConfig({ apiVersion: '2024-01-01' }),
  serverToken: token || undefined,
  // browserToken intentionally omitted: never send the read token to browsers.
  // SanityLive is only rendered in draft mode (see layout.tsx).
})
