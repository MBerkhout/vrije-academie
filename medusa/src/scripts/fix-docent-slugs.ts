import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { isDocentSlugInSync, pickDocentSlug } from "../lib/docent-slug"
import type PeopleModuleService from "../modules/people/service"
import { mirrorDocent } from "../modules/sanity-sync/service"

/**
 * Makes docent slugs follow the docent name again.
 *   - legacy `-sf-xxxxxx` suffix is dropped (`arianne-deligianis-sf-mhuaar` -> `arianne-deligianis`)
 *   - slugs created from an earlier/incorrect name are regenerated
 *     (`camus` -> `annette-van-der-elst` for "Annette van der Elst")
 * On a clash the first docent keeps the clean slug, the rest get a short `-xxxxxx` id suffix.
 * Updated docents are re-mirrored to Sanity.
 *
 * Usage:
 *   npx medusa exec ./src/scripts/fix-docent-slugs.ts          # report only
 *   npx medusa exec ./src/scripts/fix-docent-slugs.ts -- --fix # apply
 */
export default async function fixDocentSlugs({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const people = container.resolve("people") as InstanceType<typeof PeopleModuleService>
  const apply = process.argv.includes("--fix")

  const docents = await people.listDocents({}, { take: null })
  const outOfSync = docents
    .filter((d) => !isDocentSlugInSync(d.slug, d.name))
    .sort((a, b) => a.slug.localeCompare(b.slug))
  const outOfSyncIds = new Set(outOfSync.map((d) => d.id))

  // Slugs that stay as they are are reserved; fixed docents claim theirs one by one.
  const taken = new Set(docents.filter((d) => !outOfSyncIds.has(d.id)).map((d) => d.slug))

  const changes: { id: string; from: string; to: string }[] = []
  for (const d of outOfSync) {
    const to = pickDocentSlug(d.name, d.id, (slug) => taken.has(slug))
    taken.add(to)
    if (to !== d.slug) changes.push({ id: d.id, from: d.slug, to })
  }

  for (const c of changes) logger.info(`[fix-docent-slugs] ${c.id}: ${c.from} -> ${c.to}`)
  logger.info(`[fix-docent-slugs] ${changes.length} docent slug(s) to update.`)

  if (!apply) {
    if (changes.length) logger.info("[fix-docent-slugs] Dry run — re-run with -- --fix to apply.")
    return
  }

  const sanityEnabled = Boolean(process.env.SANITY_PROJECT_ID && process.env.SANITY_WRITE_TOKEN)
  for (const c of changes) {
    await people.updateDocents({ id: c.id, slug: c.to })
    if (sanityEnabled) {
      try {
        const [docent] = await people.listDocents({ id: c.id })
        await mirrorDocent({
          ...docent,
          subject_tags: Array.isArray(docent.subject_tags)
            ? (docent.subject_tags as unknown as string[])
            : null,
        })
      } catch (err) {
        logger.error(`[fix-docent-slugs] Sanity mirror failed for ${c.id}: ${(err as Error).message}`)
      }
    }
  }
  logger.info("[fix-docent-slugs] Done.")
}
