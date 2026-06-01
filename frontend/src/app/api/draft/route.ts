import { defineEnableDraftMode } from 'next-sanity/draft-mode'
import { sanityPreviewClient } from '@/lib/cms/sanity-preview-client'

const token = process.env.SANITY_API_READ_TOKEN

const { GET: enableDraft } = defineEnableDraftMode({
  client: sanityPreviewClient.withConfig({
    token: token || 'placeholder-to-avoid-throw',
  }),
})

export async function GET(request: Request) {
  if (!token) {
    return Response.json(
      {
        error: 'Missing SANITY_API_READ_TOKEN',
        hint: 'Create a viewer token at https://www.sanity.io/manage and add it to your .env',
      },
      { status: 503 }
    )
  }
  return enableDraft(request)
}
