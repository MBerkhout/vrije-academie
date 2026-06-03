import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

import productDocentenLink from "../../../links/product-docenten"
import PeopleModuleService from "../../people/service"
import type { SfCourseProductShape } from "../mappings/course-product"
import type { SfProductgroupShape } from "../mappings/productgroup"
import SalesforceSyncModuleService from "../service"
import { fetchTeacherAccountProfile } from "./fetch-teacher-account"

const ENTITY_DOCENT = "docent"

type SfTeacherRelation = {
  Id?: string
  Name?: string
}

function extractImgSrcFromHtml(html: string | null | undefined): string | null {
  if (!html?.trim()) return null
  const match = html.match(/src=["']([^"']+)["']/i)
  const src = match?.[1]?.trim()
  if (!src || src === " " || src === "/img/msg_icons/confirm16.png") return null
  return src
}

function slugifyTeacher(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

/** Capitalized words only — keyword match uses /i, name capture does not (JS /i makes [A-Z] match lowercase). */
const TEACHER_NAME_AFTER_KEYWORD =
  /^([A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ]+(?:\s+[A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ]+)*)/

function teacherNameAfterKeyword(text: string, keyword: RegExp): string | null {
  const hit = text.match(keyword)
  if (!hit || hit.index == null) return null
  const after = text.slice(hit.index + hit[0].length)
  return after.match(TEACHER_NAME_AFTER_KEYWORD)?.[1]?.trim() ?? null
}

function fallbackTeacherNameFromGroup(group: SfProductgroupShape): string | null {
  const sources = [group.Samenvatting__c, group.Productgroup_Description__c]
  for (const html of sources) {
    if (!html?.trim()) continue
    const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
    const fromHistoricus = teacherNameAfterKeyword(text, /kunsthistoricus\s+/i)
    if (fromHistoricus) return fromHistoricus
    const neemtAt = text.search(/neemt\s+/i)
    if (neemtAt >= 0) {
      const fromNeemt = teacherNameAfterKeyword(text, /neemt\s+/i)
      if (fromNeemt && /\s+(?:u|je)\s+mee/i.test(text.slice(neemtAt))) {
        return fromNeemt
      }
    }
  }
  return null
}

export function resolveTeacherFromProductgroup(
  group: SfProductgroupShape,
  child?: SfCourseProductShape | null
): {
  salesforceId: string | null
  name: string | null
  bio: string | null
  photoUrl: string | null
} {
  const salesforceId =
    group.Highlighted_Teacher__c?.trim() || child?.Account_Teacher__c?.trim() || null
  const highlightedRelation = (group as Record<string, unknown>).Highlighted_Teacher__r as
    | SfTeacherRelation
    | undefined
  const accountTeacherRelation = (child as Record<string, unknown> | null | undefined)
    ?.Account_Teacher__r as SfTeacherRelation | undefined
  const name =
    highlightedRelation?.Name?.trim() ||
    accountTeacherRelation?.Name?.trim() ||
    child?.Main_Teacher_Name__c?.trim() ||
    fallbackTeacherNameFromGroup(group) ||
    null
  const bio = group.Highlighted_Teacher_Teaser__c?.trim() || null
  const photoUrl = extractImgSrcFromHtml(group.Highlighted_Teacher_Image__c)

  return { salesforceId, name, bio, photoUrl }
}

type ResolvedTeacher = {
  salesforceId: string | null
  name: string | null
  bio: string | null
  photoUrl: string | null
  role: string
}

async function resolveTeacherForDocent(
  sync: InstanceType<typeof SalesforceSyncModuleService>,
  group: SfProductgroupShape,
  child?: SfCourseProductShape | null
): Promise<ResolvedTeacher> {
  const base = resolveTeacherFromProductgroup(group, child)
  if (!base.salesforceId) {
    return { ...base, role: "Docent" }
  }

  const account = await fetchTeacherAccountProfile(sync, base.salesforceId)
  if (!account) {
    return { ...base, role: "Docent" }
  }

  return {
    salesforceId: base.salesforceId,
    name: account.name ?? base.name,
    bio: account.bio ?? base.bio,
    photoUrl: account.photoUrl ?? base.photoUrl,
    role: account.role?.trim() || "Docent",
  }
}

async function findDocentBySalesforceId(
  container: MedusaContainer,
  sync: InstanceType<typeof SalesforceSyncModuleService>,
  salesforceId: string
): Promise<{ id: string } | null> {
  const state = await sync.getStateBySalesforceId(ENTITY_DOCENT, salesforceId)
  if (!state?.medusa_id) return null

  const people = container.resolve("people") as InstanceType<typeof PeopleModuleService>
  try {
    const docent = await people.retrieveDocent(state.medusa_id)
    return docent?.id ? { id: docent.id } : null
  } catch {
    return null
  }
}

async function upsertDocentSyncState(
  sync: InstanceType<typeof SalesforceSyncModuleService>,
  medusaId: string,
  salesforceId: string
): Promise<void> {
  const row = await sync.getStateByMedusaId(ENTITY_DOCENT, medusaId)
  if (!row) {
    await sync.createSalesforceSyncStates([
      {
        entity_type: ENTITY_DOCENT,
        medusa_id: medusaId,
        salesforce_id: salesforceId,
        last_status: "success",
      },
    ])
    return
  }
  await sync.updateSalesforceSyncStates({
    id: row.id,
    salesforce_id: salesforceId,
    last_status: "success",
    last_error: null,
  })
}

/**
 * Resolve or create a Medusa Docent from Salesforce teacher fields and link to the product group.
 */
export async function linkDocentFromSalesforce(
  container: MedusaContainer,
  productId: string,
  group: SfProductgroupShape,
  child?: SfCourseProductShape | null
): Promise<string | null> {
  const sync = container.resolve("salesforceSync") as InstanceType<
    typeof SalesforceSyncModuleService
  >
  const teacher = await resolveTeacherForDocent(sync, group, child)
  if (!teacher.salesforceId || !teacher.name) return null

  const people = container.resolve("people") as InstanceType<typeof PeopleModuleService>
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  let docentId = (await findDocentBySalesforceId(container, sync, teacher.salesforceId))?.id

  if (!docentId) {
    const slugBase = slugifyTeacher(teacher.name) || "docent"
    const slug = `${slugBase}-sf-${teacher.salesforceId.slice(-6).toLowerCase()}`
    const [existingBySlug] = await people.listDocents({ slug }, { take: 1 })
    if (existingBySlug?.id) {
      docentId = existingBySlug.id
    } else {
      const created = await people.createDocents({
        slug,
        name: teacher.name,
        role: teacher.role,
        photo_url: teacher.photoUrl,
        bio: teacher.bio,
        subject_tags: null,
      })
      docentId = created?.id ?? null
    }
  } else {
    await people.updateDocents({
      id: docentId,
      name: teacher.name,
      role: teacher.role,
      photo_url: teacher.photoUrl,
      bio: teacher.bio,
    })
  }

  if (!docentId) return null

  await upsertDocentSyncState(sync, docentId, teacher.salesforceId)

  const { data: existingLinks } = await query.graph({
    entity: productDocentenLink.entryPoint,
    fields: ["docent_id"],
    filters: { product_id: productId },
  })

  const alreadyLinked = (existingLinks ?? []).some(
    (row: { docent_id?: string }) => row.docent_id === docentId
  )

  if (!alreadyLinked) {
    await link.create({
      [Modules.PRODUCT]: { product_id: productId },
      people: { docent_id: docentId },
    })
  }

  return docentId
}
