import { MedusaError } from "@medusajs/framework/utils"

import { resolveAudiencePlayerConfig, type AudiencePlayerConfig } from "./config"
import type { AudiencePlayerPlaybackConfig } from "./types"

type UserAuthResult = {
  user_id: number
  user_email: string
  access_token: string
  expires_in: number
}

type PlayConfigResult = {
  duration: number | null
  pulse_token: string | null
}

type TokenCacheEntry = {
  accessToken: string
  userId: number
  expiresAtMs: number
}

const tokenCache = new Map<string, TokenCacheEntry>()

function cacheKey(email: string, config: AudiencePlayerConfig): string {
  return `${config.projectId}:${email.toLowerCase()}`
}

async function graphqlUser<T>(
  config: AudiencePlayerConfig,
  query: string
): Promise<T> {
  const url = `${config.apiBaseUrl}/graphql/${config.projectId}/user`
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  })

  if (!response.ok) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Audience Player API HTTP ${response.status}`
    )
  }

  const json = (await response.json()) as {
    data?: T
    errors?: { message?: string }[]
  }

  if (json.errors?.length) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      json.errors[0]?.message ?? "Audience Player GraphQL error"
    )
  }

  if (!json.data) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Audience Player GraphQL returned no data"
    )
  }

  return json.data
}

async function authenticateUser(
  config: AudiencePlayerConfig,
  email: string,
  autoRegister: boolean
): Promise<UserAuthResult> {
  const normalizedEmail = email.trim().toLowerCase()
  const cached = tokenCache.get(cacheKey(normalizedEmail, config))
  if (cached && cached.expiresAtMs > Date.now() + 60_000) {
    return {
      user_id: cached.userId,
      user_email: normalizedEmail,
      access_token: cached.accessToken,
      expires_in: Math.floor((cached.expiresAtMs - Date.now()) / 1000),
    }
  }

  const data = await graphqlUser<{ ClientUserAuthenticate: UserAuthResult }>(
    config,
    `mutation {
      ClientUserAuthenticate(
        project_id: ${config.projectId},
        client_id: ${JSON.stringify(config.clientId)},
        client_secret: ${JSON.stringify(config.clientSecret)},
        user_email: ${JSON.stringify(normalizedEmail)},
        auto_register: ${autoRegister}
      ) {
        access_token
        user_id
        user_email
        expires_in
      }
    }`
  )

  const auth = data.ClientUserAuthenticate
  if (!auth?.access_token) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Audience Player authentication failed"
    )
  }

  const ttlSeconds =
    typeof auth.expires_in === "number" && Number.isFinite(auth.expires_in)
      ? auth.expires_in
      : 3600

  tokenCache.set(cacheKey(normalizedEmail, config), {
    accessToken: auth.access_token,
    userId: auth.user_id,
    expiresAtMs: Date.now() + ttlSeconds * 1000,
  })

  return auth
}

async function fetchPlayConfig(
  config: AudiencePlayerConfig,
  userId: number,
  articleId: number,
  assetId: number
): Promise<PlayConfigResult> {
  const data = await graphqlUser<{ ClientUserArticleAssetPlay: PlayConfigResult }>(
    config,
    `mutation {
      ClientUserArticleAssetPlay(
        project_id: ${config.projectId},
        client_id: ${JSON.stringify(config.clientId)},
        client_secret: ${JSON.stringify(config.clientSecret)},
        user_id: ${userId},
        article_id: ${articleId},
        asset_id: ${assetId}
      ) {
        duration
        pulse_token
      }
    }`
  )

  return data.ClientUserArticleAssetPlay
}

export async function resolveAudiencePlayerPlayback(input: {
  email: string
  articleId: number
  assetId: number
  projectId?: number
  autoRegister?: boolean
}): Promise<AudiencePlayerPlaybackConfig> {
  const config = resolveAudiencePlayerConfig()
  if (!config) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Audience Player OAuth credentials are not configured"
    )
  }

  const projectId = input.projectId ?? config.projectId
  const auth = await authenticateUser(config, input.email, input.autoRegister ?? true)

  if (!auth.user_id) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Audience Player user id unavailable after authentication"
    )
  }

  const play = await fetchPlayConfig(config, auth.user_id, input.articleId, input.assetId)

  return {
    projectId,
    apiBaseUrl: config.apiBaseUrl,
    articleId: input.articleId,
    assetId: input.assetId,
    token: auth.access_token,
    durationSeconds:
      typeof play.duration === "number" && Number.isFinite(play.duration)
        ? Math.round(play.duration)
        : null,
  }
}

export async function resolvePreviewAudiencePlayerPlayback(input: {
  articleId: number
  assetId: number
  projectId?: number
}): Promise<AudiencePlayerPlaybackConfig> {
  const config = resolveAudiencePlayerConfig()
  if (!config) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Audience Player OAuth credentials are not configured"
    )
  }

  return resolveAudiencePlayerPlayback({
    email: config.previewEmail,
    articleId: input.articleId,
    assetId: input.assetId,
    projectId: input.projectId,
    autoRegister: true,
  })
}
