/**
 * Server-only CMS exports (defineLive, sanityFetch, cmsClient).
 * Import from '@/lib/cms/server' in React Server Components only.
 */

import 'server-only'
export { sanityClient as cmsClient } from './sanity-client'
