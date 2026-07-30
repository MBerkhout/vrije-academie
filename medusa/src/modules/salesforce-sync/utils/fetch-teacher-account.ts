import type SalesforceSyncModuleService from "../service"
import { isUsablePhotoUrl } from "./photo-url"

/** Fields on Salesforce Person Account used for public docent profiles (when readable). */
export const TEACHER_ACCOUNT_FIELDS = [
  "Id",
  "Name",
  "Description",
  "PhotoUrl",
  "Website",
  "PersonEmail",
  "PersonTitle",
  "Email__c",
] as const

export type TeacherAccountProfile = {
  salesforceId: string
  name: string | null
  bio: string | null
  photoUrl: string | null
  role: string | null
  website: string | null
  email: string | null
}

export async function fetchTeacherAccountProfile(
  sync: InstanceType<typeof SalesforceSyncModuleService>,
  accountId: string
): Promise<TeacherAccountProfile | null> {
  const id = accountId.trim()
  if (!id) return null

  const escaped = id.replace(/'/g, "\\'")
  const soql = `SELECT ${TEACHER_ACCOUNT_FIELDS.join(", ")} FROM Account WHERE Id = '${escaped}' LIMIT 1`

  try {
    const result = await sync.query<Record<string, unknown>>(soql)
    const row = result.records[0]
    if (!row?.Id) return null

    const email =
      (typeof row.PersonEmail === "string" && row.PersonEmail.trim()) ||
      (typeof row.Email__c === "string" && row.Email__c.trim()) ||
      null

    return {
      salesforceId: String(row.Id),
      name: typeof row.Name === "string" ? row.Name.trim() || null : null,
      bio: typeof row.Description === "string" ? row.Description.trim() || null : null,
      photoUrl:
        typeof row.PhotoUrl === "string" && isUsablePhotoUrl(row.PhotoUrl.trim())
          ? row.PhotoUrl.trim()
          : null,
      role: typeof row.PersonTitle === "string" ? row.PersonTitle.trim() || null : null,
      website: typeof row.Website === "string" ? row.Website.trim() || null : null,
      email,
    }
  } catch {
    return null
  }
}
