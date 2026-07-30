import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework/subscribers"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import PeopleModuleService from "../modules/people/service"
import { isSanitySyncSuppressed } from "../modules/salesforce-sync/utils/suppress-sanity-sync"
import { mirrorDocent, deleteDoc } from "../modules/sanity-sync/service"

/**
 * Mirror a Docent to Sanity when created, updated, or deleted.
 */
async function syncDocentToSanity({
  event: { name, data },
  container,
}: SubscriberArgs<{ id: string }>) {
  if (!process.env.SANITY_PROJECT_ID || !process.env.SANITY_WRITE_TOKEN) return
  if (name !== "people.docent.deleted" && isSanitySyncSuppressed()) return

  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const people = container.resolve("people") as InstanceType<typeof PeopleModuleService>
  const docentId = data.id

  if (name === "people.docent.deleted") {
    await deleteDoc(`medusa-docent-${docentId}`)
    logger.info(`[sanity-sync] deleted docent ${docentId}`)
    return
  }

  try {
    const [docent] = await people.listDocents({ id: docentId })
    if (!docent) return
    await mirrorDocent({
      ...docent,
      subject_tags: Array.isArray(docent.subject_tags)
        ? (docent.subject_tags as unknown as string[])
        : null,
    })
    logger.info(`[sanity-sync] synced docent ${docentId}`)
  } catch (err) {
    logger.error(`[sanity-sync] failed to sync docent ${docentId}: ${(err as Error).message}`)
  }
}

export default syncDocentToSanity

export const config: SubscriberConfig = {
  event: ["people.docent.created", "people.docent.updated", "people.docent.deleted"],
}
