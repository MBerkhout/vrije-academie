import type { FieldMap } from "./types"

/** Default: Contact + custom external id. Adjust field API names in your org. */
export type SfContactShape = {
  Id?: string
  Medusa_Customer_Id__c?: string
  FirstName?: string
  LastName?: string
  Email?: string
  Phone?: string
}

export type MedusaCustomerShape = {
  id: string
  first_name?: string | null
  last_name?: string | null
  email?: string | null
  phone?: string | null
}

export const customerMapping: FieldMap<MedusaCustomerShape, SfContactShape> = {
  externalIdField: "Medusa_Customer_Id__c",
  salesforceFieldsForPull: [
    "Id",
    "Medusa_Customer_Id__c",
    "FirstName",
    "LastName",
    "Email",
    "Phone",
  ],
  toSalesforce: (c) => ({
    Medusa_Customer_Id__c: c.id,
    FirstName: c.first_name?.trim() || "Unknown",
    LastName: c.last_name?.trim() || "-",
    Email: c.email ?? undefined,
    Phone: c.phone ?? undefined,
  }),
  fromSalesforce: (sf) => ({
    first_name: sf.FirstName ?? undefined,
    last_name: sf.LastName ?? undefined,
    email: sf.Email ?? undefined,
    phone: sf.Phone ?? undefined,
  }),
}
