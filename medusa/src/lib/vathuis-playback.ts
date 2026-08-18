import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"

import {
  resolveAudiencePlayerPlayback,
} from "./audience-player/client"
import { resolveAudienceProjectId } from "./audience-player/config"
import type { AudiencePlayerPlaybackConfig } from "./audience-player/types"
import {
  findVathuisEpisode,
  parseEpisodeKey,
  type VathuisMetadataShape,
} from "./vathuis-episode-lookup"
import { buildPublicPreviewEmbedUrl, isPublicPreviewEmbedUrl } from "./audience-player/public-embed-url"
import type { VathuisEpisode } from "../modules/salesforce-sync/clients/audience-player"

export async function loadVathuisEpisodeByKey(
  container: MedusaContainer,
  productHandle: string,
  episodeKey: string
): Promise<{ vathuis: VathuisMetadataShape; episode: VathuisEpisode }> {
  const parsed = parseEpisodeKey(episodeKey)
  if (!parsed) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Invalid episode key")
  }

  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "metadata"],
    filters: { handle: productHandle },
  })
  const product = products?.[0] as Record<string, unknown> | undefined
  if (!product) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Product not found")
  }

  const vathuis = (product.metadata as Record<string, unknown> | null | undefined)
    ?.vathuis as VathuisMetadataShape | undefined
  if (!vathuis) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "VA Thuis metadata not found")
  }

  const episode = findVathuisEpisode(vathuis, parsed.chapterNumber, parsed.episodeNumber)
  if (!episode) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Episode not found")
  }

  return { vathuis, episode }
}

export function episodePlaybackIds(
  episode: VathuisEpisode,
  vathuis: VathuisMetadataShape
): { articleId: number; assetId: number; projectId: number } {
  const articleId = episode.audience_article_id
  const assetId = episode.audience_asset_id
  if (!Number.isFinite(articleId) || articleId <= 0) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Episode article id unavailable")
  }
  if (!Number.isFinite(assetId) || !assetId || assetId <= 0) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Episode asset id unavailable")
  }

  return {
    articleId,
    assetId,
    projectId: resolveAudienceProjectId(vathuis.audience_player?.project_id ?? null),
  }
}

export async function resolveVathuisEpisodePlayback(input: {
  email: string
  episode: VathuisEpisode
  vathuis: VathuisMetadataShape
}): Promise<AudiencePlayerPlaybackConfig> {
  const ids = episodePlaybackIds(input.episode, input.vathuis)
  return resolveAudiencePlayerPlayback({
    email: input.email,
    articleId: ids.articleId,
    assetId: ids.assetId,
    projectId: ids.projectId,
  })
}

export async function resolveVathuisPreviewEmbedUrl(input: {
  episode: VathuisEpisode
}): Promise<string> {
  if (!input.episode.preview_available) {
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Episode preview is not available")
  }

  if (input.episode.embed_url?.trim() && isPublicPreviewEmbedUrl(input.episode.embed_url)) {
    return input.episode.embed_url.trim()
  }

  const articleId = input.episode.audience_article_id
  const assetId = input.episode.audience_asset_id
  if (!Number.isFinite(articleId) || articleId <= 0) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Episode article id unavailable")
  }
  if (!Number.isFinite(assetId) || !assetId || assetId <= 0) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Episode asset id unavailable")
  }

  return buildPublicPreviewEmbedUrl(articleId, assetId)
}
