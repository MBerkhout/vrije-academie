import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import type PeopleModuleService from "../modules/people/service"
import { mirrorDocent } from "../modules/sanity-sync/service"

/**
 * Removes the legacy `-sf-xxxxxx` suffix from docent slugs (`arianne-deligianis-sf-mhuaar` -> `arianne-deligianis`).
 * If several docents share the same base slug, the first keeps it and the rest get `-xxxxxx` (no `sf-`).
 * Updated docents are re-mirrored to Sanity.
 *
 * Usage:
 *   npx medusa exec ./src/scripts/fix-docent-slugs.ts          # report only
 *   npx medusa exec ./src/scripts/fix-docent-slugs.ts -- --fix # apply
 */
const LEGACY = /^(.*)-sf-([a-z0-9]{6})$/

export default async function fixDocentSlugs({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const people = container.resolve("people") as InstanceType<typeof PeopleModuleService>
  const apply = process.argv.includes("--fix")

  const docents = await people.listDocents({}, { take: null })
  const taken = new Set(docents.filter((d) => !LEGACY.test(d.slug)).map((d) => d.slug))

  const changes: { id: string; from: string; to: string }[] = []
  for (const d of docents.filter((d) => LEGACY.test(d.slug)).sort((a, b) => a.slug.localeCompare(b.slug))) {
    const [, base, suffix] = d.slug.match(LEGACY)!
    let to = base
    if (taken.has(to)) to = `${base}-${suffix}`
    if (taken.has(to)) continue
    taken.add(to)
    changes.push({ id: d.id, from: d.slug, to })
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
