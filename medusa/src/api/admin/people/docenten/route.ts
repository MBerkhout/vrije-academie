import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { z } from "zod"

import PeopleModuleService from "../../../../modules/people/service"

const PostBodySchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  role: z.string().nullable().optional(),
  photo_url: z.string().url().nullable().optional(),
  bio: z.string().nullable().optional(),
  subject_tags: z.array(z.string()).nullable().optional(),
})

/** Admin: List or create docenten. */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const people = req.scope.resolve("people") as InstanceType<typeof PeopleModuleService>
  const docenten = await people.listDocents({}, { order: { name: "ASC" } })
  res.json({ docenten })
}

export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const body = PostBodySchema.parse(req.body)
  const people = req.scope.resolve("people") as InstanceType<typeof PeopleModuleService>
  const docent = await people.createDocents(body as any)
  if (!docent?.id) {
    throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, "Failed to create docent")
  }
  res.status(201).json({ docent })
}
