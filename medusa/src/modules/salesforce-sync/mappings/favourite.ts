import { sfRequest } from "../client/rest"
import { loadSObjectFieldDescribe, type SObjectFieldDescribe } from "../utils/salesforce-describe-fields"
import { SF_COURSE_PRODUCT_OBJECT } from "./course-product"
import { SF_PRODUCTGROUP_OBJECT } from "./productgroup"

export const SF_FAVOURITE_OBJECT = "Favourite__c"

export type SfFavouriteShape = {
  Id?: string
  [key: string]: unknown
}

export type FavouriteFieldLayout = {
  contactField: string | null
  accountField: string | null
  productgroupField: string | null
  productField: string | null
}

type DescribeField = SObjectFieldDescribe & {
  referenceTo?: string[]
}

let layoutCache: FavouriteFieldLayout | null | undefined

function pickReferenceField(
  fields: DescribeField[],
  referenceTo: string,
  nameCandidates: string[]
): string | null {
  for (const name of nameCandidates) {
    const f = fields.find((x) => x.name === name)
    if (f?.referenceTo?.includes(referenceTo)) return f.name
  }
  const match = fields.find(
    (f) =>
      f.type === "reference" &&
      Array.isArray(f.referenceTo) &&
      f.referenceTo.includes(referenceTo) &&
      f.name !== "CreatedById" &&
      f.name !== "LastModifiedById"
  )
  return match?.name ?? null
}

/** Resolve Favourite__c lookup API names from org describe (cached). */
export async function resolveFavouriteFieldLayout(): Promise<FavouriteFieldLayout | null> {
  if (layoutCache !== undefined) return layoutCache

  const base = await loadSObjectFieldDescribe(SF_FAVOURITE_OBJECT)
  if (!base?.length) {
    layoutCache = null
    return null
  }

  let referenceByName = new Map<string, string[]>()
  try {
    const { data } = await sfRequest<{
      fields?: Array<{ name: string; type?: string; referenceTo?: string[] }>
    }>("GET", `/sobjects/${encodeURIComponent(SF_FAVOURITE_OBJECT)}/describe`)
    referenceByName = new Map(
      (data.fields ?? []).map((f) => [f.name, Array.isArray(f.referenceTo) ? f.referenceTo : []])
    )
  } catch {
    layoutCache = null
    return null
  }

  const fields: DescribeField[] = base.map((f) => ({
    ...f,
    referenceTo: referenceByName.get(f.name),
  }))

  const layout: FavouriteFieldLayout = {
    contactField: pickReferenceField(fields, "Contact", [
      "Contact_Lookup__c",
      "Contact__c",
      "ContactCopy",
    ]),
    accountField: pickReferenceField(fields, "Account", ["Account__c", "Account_Lookup__c"]),
    productgroupField: pickReferenceField(fields, SF_PRODUCTGROUP_OBJECT, [
      "vaProductGroup__c",
      "vaProductgroup__c",
      "Productgroup__c",
      "Product_Group__c",
    ]),
    productField: pickReferenceField(fields, SF_COURSE_PRODUCT_OBJECT, [
      "vaProduct__c",
      "Product__c",
    ]),
  }

  if (!layout.contactField && !layout.accountField) {
    layoutCache = null
    return null
  }
  if (!layout.productgroupField && !layout.productField) {
    layoutCache = null
    return null
  }

  layoutCache = layout
  return layout
}

export function favouriteRowToSalesforce(
  layout: FavouriteFieldLayout,
  input: {
    contactId?: string | null
    accountId?: string | null
    productgroupId?: string | null
    productId?: string | null
  }
): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  if (layout.contactField && input.contactId) row[layout.contactField] = input.contactId
  if (layout.accountField && input.accountId) row[layout.accountField] = input.accountId
  if (layout.productgroupField && input.productgroupId) {
    row[layout.productgroupField] = input.productgroupId
  }
  if (layout.productField && input.productId) row[layout.productField] = input.productId
  return row
}

export function clearFavouriteFieldLayoutCache(): void {
  layoutCache = undefined
}
