import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { z } from "zod"

import PeopleModuleService from "../../../../../modules/people/service"

const PatchBodySchema = z.object({
  slug: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  role: z.string().nullable().optional(),
  photo_url: z.string().url().nullable().optional(),
  bio: z.string().nullable().optional(),
  subject_tags: z.array(z.string()).nullable().optional(),
})

/** Admin: Get, update, or delete a single docent. */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const people = req.scope.resolve("people") as InstanceType<typeof PeopleModuleService>
  const [docent] = await people.listDocents({ id: req.params.id })
  if (!docent) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, `Docent ${req.params.id} not found`)
  }
  res.json({ docent })
}

export async function PATCH(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const body = PatchBodySchema.parse(req.body)
  const people = req.scope.resolve("people") as InstanceType<typeof PeopleModuleService>
  const updated = await people.updateDocents({ id: req.params.id, ...body } as any)
  res.json({ docent: updated })
}

export async function DELETE(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const people = req.scope.resolve("people") as InstanceType<typeof PeopleModuleService>
  await people.deleteDocents(req.params.id)
  res.status(200).json({ id: req.params.id, deleted: true })
}
