import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

import PeopleModuleService from "../../../modules/people/service"
import { ensureDocentFromSalesforceTeacher } from "../../../modules/salesforce-sync/utils/link-docent-from-salesforce"
import { fetchTeacherAccountProfile } from "../../../modules/salesforce-sync/utils/fetch-teacher-account"
import SalesforceSyncModuleService from "../../../modules/salesforce-sync/service"

export type ApplyDocentFromSfInput = {
  salesforceId: string
}

export type ApplyDocentFromSfOutput = {
  medusaId: string
  created: boolean
  updated: boolean
}

export const applyDocentFromSalesforceStep = createStep(
  { name: "apply-docent-from-salesforce", maxRetries: 3, retryInterval: 10 },
  async (input: ApplyDocentFromSfInput, { container }) => {
    const sync = container.resolve("salesforceSync") as InstanceType<
      typeof SalesforceSyncModuleService
    >
    const profile = await fetchTeacherAccountProfile(sync, input.salesforceId)
    if (!profile?.salesforceId || !profile.name) {
      throw new Error(`Could not load teacher Account ${input.salesforceId}`)
    }

    const existing = await sync.getStateBySalesforceId("docent", profile.salesforceId)
    const medusaId = await ensureDocentFromSalesforceTeacher(container, sync, {
      salesforceId: profile.salesforceId,
      name: profile.name,
      bio: profile.bio,
      photoUrl: profile.photoUrl,
      role: profile.role,
    })
    if (!medusaId) {
      throw new Error(`Could not upsert docent for Account ${input.salesforceId}`)
    }

    const people = container.resolve("people") as InstanceType<typeof PeopleModuleService>
    const docent = await people.retrieveDocent(medusaId)
    if (docent.is_active === false) {
      await people.updateDocents({ id: medusaId, is_active: true })
    }

    return new StepResponse({
      medusaId,
      created: !existing?.medusa_id,
      updated: !!existing?.medusa_id,
    } satisfies ApplyDocentFromSfOutput)
  }
)
