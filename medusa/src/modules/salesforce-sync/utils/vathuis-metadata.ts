import {
  fetchVathuisChaptersFromAudiencePlayer,
  fetchVathuisEpisodesFromAudiencePlayer,
  isVathuisRecordType,
  type VathuisChapter,
  type VathuisEpisode,
} from "../clients/audience-player"
import type { SfCourseProductShape } from "../mappings/course-product"
import type { SfProductgroupShape } from "../mappings/productgroup"

export type VathuisProductMetadata = {
  purchase_mode: "bundle_only"
  episode_count_label: string | null
  play_time: string | null
  bundle_variant_salesforce_id: string | null
  audience_player: {
    project_id: number
    product_id: number | null
    article_id: number | null
    preview_url: string | null
    iframe_url: string | null
  }
  chapters: VathuisChapter[]
  episodes: VathuisEpisode[]
}

export function resolveAudienceArticleId(child: SfCourseProductShape): number | null {
  const raw = child.Audience_Player_Article_Id__c
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) return raw
  return null
}

export async function buildVathuisMetadata(input: {
  group: SfProductgroupShape
  bundleChild: SfCourseProductShape
}): Promise<VathuisProductMetadata | null> {
  if (!isVathuisRecordType(input.group.Productgroup_Record_Type_Developer_Name__c)) {
    return null
  }

  const articleId = resolveAudienceArticleId(input.bundleChild)
  const projectId = Number(process.env.AUDIENCE_PLAYER_PROJECT_ID ?? 14)
  const embed = {
    projectId,
    previewUrl: input.group.Audience_Preview_Url__c?.trim() || null,
    iframeUrl: input.group.IFrame_URL_1__c?.trim() || null,
  }

  let chapters: VathuisChapter[] = []
  let episodes: VathuisEpisode[] = []

  if (articleId) {
    try {
      chapters = await fetchVathuisChaptersFromAudiencePlayer(articleId, { projectId, embed })
      episodes = chapters.flatMap((chapter) => chapter.episodes)
    } catch (err) {
      console.warn(
        `[salesforce-sync] Failed to fetch VAthuis chapters for article ${articleId}:`,
        err instanceof Error ? err.message : err
      )
      try {
        episodes = await fetchVathuisEpisodesFromAudiencePlayer(articleId, { projectId, embed })
      } catch (fallbackErr) {
        console.warn(
          `[salesforce-sync] Failed to fetch VAthuis episodes for article ${articleId}:`,
          fallbackErr instanceof Error ? fallbackErr.message : fallbackErr
        )
      }
    }
  }

  return {
    purchase_mode: "bundle_only",
    episode_count_label: input.group.Audience_Player_Episodes__c?.trim() || null,
    play_time: input.group.Audience_Player_Play_Time__c?.trim() || null,
    bundle_variant_salesforce_id: input.bundleChild.Id ?? null,
    audience_player: {
      project_id: projectId,
      product_id:
        typeof input.bundleChild.Audience_Player_Product_Id__c === "number"
          ? input.bundleChild.Audience_Player_Product_Id__c
          : null,
      article_id: articleId,
      preview_url: embed.previewUrl,
      iframe_url: embed.iframeUrl,
    },
    chapters,
    episodes,
  }
}
