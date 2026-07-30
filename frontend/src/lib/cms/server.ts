/**
 * Server-only CMS exports (defineLive, sanityFetch, cmsClient).
 * Import from '@/lib/cms/server' in React Server Components only.
 */

import 'server-only'
import { cache } from 'react'
import { sanityClient as baseCmsClient } from './sanity-client'

/** Dedupe settings fetches within a single RSC request (layout + metadata + PLP). */
export const cmsClient = {
  ...baseCmsClient,
  getGeneralSettings: cache(baseCmsClient.getGeneralSettings.bind(baseCmsClient)),
}
