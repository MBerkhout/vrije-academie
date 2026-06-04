/**
 * Sanity client configured for Visual Editing (stega encoding).
 * Used by defineLive and the draft mode route.
 */

import { createClient } from 'next-sanity'

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'
const studioUrl =
  process.env.NEXT_PUBLIC_SANITY_STUDIO_URL ||
  (projectId ? `https://${projectId}.sanity.studio/studio` : 'http://localhost:3333/studio')

if (!projectId) {
  throw new Error('Missing NEXT_PUBLIC_SANITY_PROJECT_ID')
}

export const sanityPreviewClient = createClient({
  projectId,
  dataset,
  apiVersion: '2024-01-01',
  useCdn: false,
  stega: {
    enabled: true,
    studioUrl,
  },
})
