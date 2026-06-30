import { medusaCountryToSalesforce, salesforceCountryToMedusa } from "../utils/country-code"
import type { FieldMap } from "./types"

export const SF_CONTACT_OBJECT = "Contact"
export const SF_PERSON_ACCOUNT_OBJECT = "Account"

/** Contact fields pulled from Salesforce (Person Account contact row). */
export type SfContactShape = {
  Id?: string
  AccountId?: string
  FirstName?: string
  LastName?: string
  Email?: string
  Phone?: string
  MobilePhone?: string
  Salutation?: string
  Salutation__c?: string
  Initials__c?: string
  Birthdate?: string
  IBAN__c?: string
  MailingStreet?: string
  MailingCity?: string
  MailingPostalCode?: string
  MailingCountry?: string
  Newsletter__c?: boolean
  Magazine__c?: boolean
  Editorial__c?: boolean
  OptIn__c?: boolean
  HasOptedOutOfEmail?: boolean
  Active__c?: boolean
}

export type MedusaCustomerAddressShape = {
  address_1?: string | null
  postal_code?: string | null
  city?: string | null
  country_code?: string | null
  first_name?: string | null
  last_name?: string | null
  phone?: string | null
}

export type MedusaCustomerShape = {
  id: string
  first_name?: string | null
  last_name?: string | null
  email?: string | null
  phone?: string | null
  metadata?: Record<string, unknown> | null
  address?: MedusaCustomerAddressShape | null
}

export type SfPersonAccountPushShape = {
  RecordTypeId?: string
  FirstName?: string
  LastName?: string
  PersonEmail?: string
  PersonMobilePhone?: string
  Phone?: string
  PersonMailingStreet?: string
  PersonMailingCity?: string
  PersonMailingPostalCode?: string
  PersonMailingCountry?: string
  BillingStreet?: string
  BillingCity?: string
  BillingPostalCode?: string
  BillingCountry?: string
  ShippingStreet?: string
  ShippingCity?: string
  ShippingPostalCode?: string
  ShippingCountry?: string
  /** Custom: "Shipping Address equals Billing Address" on Person Account. */
  Same_account_address__c?: boolean
  PersonBirthdate?: string
  Salutation?: string
  Salutation__c?: string
  Initials__c?: string
  Newsletter__c?: boolean
  Magazine__c?: boolean
  Editorial__c?: boolean
  OptIn__c?: boolean
}

/** Account address fields used as pull fallback (Post / Billing / Shipping). */
export type SfAccountAddressShape = {
  PersonMailingStreet?: string
  PersonMailingCity?: string
  PersonMailingPostalCode?: string
  PersonMailingCountry?: string
  BillingStreet?: string
  BillingCity?: string
  BillingPostalCode?: string
  BillingCountry?: string
  ShippingStreet?: string
  ShippingCity?: string
  ShippingPostalCode?: string
  ShippingCountry?: string
}

/** @deprecated Use SfAccountAddressShape */
export type SfAccountMailingShape = SfAccountAddressShape

export type SfContactPushShape = {
  FirstName?: string
  LastName?: string
  Email?: string
  Phone?: string
  MobilePhone?: string
  MailingStreet?: string
  MailingCity?: string
  MailingPostalCode?: string
  MailingCountry?: string
  Birthdate?: string
  Salutation?: string
  Salutation__c?: string
  Initials__c?: string
  Active__c?: boolean
}

export const CUSTOMER_METADATA_KEYS = {
  salutation: "sf_salutation",
  initials: "sf_initials",
  birthdate: "sf_birthdate",
  iban: "sf_iban",
  newsletter: "sf_newsletter",
  magazine: "sf_magazine",
  editorial: "sf_editorial",
  optIn: "sf_opt_in",
  hasOptedOutOfEmail: "sf_has_opted_out_of_email",
} as const

export const customerContactFieldsForPull = [
  "Id",
  "AccountId",
  "FirstName",
  "LastName",
  "Email",
  "Phone",
  "MobilePhone",
  "Salutation",
  "Salutation__c",
  "Initials__c",
  "Birthdate",
  "IBAN__c",
  "MailingStreet",
  "MailingCity",
  "MailingPostalCode",
  "MailingCountry",
  "Newsletter__c",
  "Magazine__c",
  "Editorial__c",
  "OptIn__c",
  "HasOptedOutOfEmail",
  "Active__c",
] as const

function coalesceEmail(sf: SfContactShape): string | undefined {
  return sf.Email?.trim() || undefined
}

function coalescePhone(sf: SfContactShape): string | undefined {
  return sf.MobilePhone?.trim() || sf.Phone?.trim() || undefined
}

function firstTrimmed(...values: Array<string | null | undefined>): string | undefined {
  for (const value of values) {
    const trimmed = value?.trim()
    if (trimmed) return trimmed
  }
  return undefined
}

function birthdateFromMedusaMetadata(
  metadata: Record<string, unknown> | null | undefined
): string | undefined {
  const raw = metadata?.[CUSTOMER_METADATA_KEYS.birthdate]
  if (typeof raw !== "string") return undefined
  const normalized = raw.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return undefined
  return normalized
}

function applyBirthdateFromMedusa(
  fields: { PersonBirthdate?: string; Birthdate?: string },
  metadata: Record<string, unknown> | null | undefined,
  target: "account" | "contact"
): void {
  const birthdate = birthdateFromMedusaMetadata(metadata)
  if (!birthdate) return
  if (target === "account") fields.PersonBirthdate = birthdate
  else fields.Birthdate = birthdate
}

function applyMedusaAddressToAccountFields(
  fields: SfPersonAccountPushShape,
  addr: MedusaCustomerAddressShape | null | undefined
): void {
  const street = addr?.address_1?.trim()
  const city = addr?.city?.trim()
  const postal = addr?.postal_code?.trim()
  const country = medusaCountryToSalesforce(addr?.country_code)
  if (!street && !city && !postal && !country) return

  if (street) {
    fields.PersonMailingStreet = street
    fields.BillingStreet = street
    fields.ShippingStreet = street
  }
  if (city) {
    fields.PersonMailingCity = city
    fields.BillingCity = city
    fields.ShippingCity = city
  }
  if (postal) {
    fields.PersonMailingPostalCode = postal
    fields.BillingPostalCode = postal
    fields.ShippingPostalCode = postal
  }
  if (country) {
    fields.PersonMailingCountry = country
    fields.BillingCountry = country
    fields.ShippingCountry = country
  }
  fields.Same_account_address__c = true
}

/** Account field keys synced from the Medusa default shipping address. */
export const ACCOUNT_ADDRESS_FIELD_KEYS = new Set([
  "PersonMailingStreet",
  "PersonMailingCity",
  "PersonMailingPostalCode",
  "PersonMailingCountry",
  "BillingStreet",
  "BillingCity",
  "BillingPostalCode",
  "BillingCountry",
  "ShippingStreet",
  "ShippingCity",
  "ShippingPostalCode",
  "ShippingCountry",
  "Same_account_address__c",
])

export function splitAccountPushFields(fields: Record<string, unknown>): {
  profileFields: Record<string, unknown>
  addressFields: Record<string, unknown>
} {
  const profileFields: Record<string, unknown> = {}
  const addressFields: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(fields)) {
    if (ACCOUNT_ADDRESS_FIELD_KEYS.has(key)) {
      addressFields[key] = value
    } else {
      profileFields[key] = value
    }
  }
  return { profileFields, addressFields }
}

/** Fill Contact mailing from Person Account when Contact mailing is empty. */
export function contactWithAccountMailing(
  contact: SfContactShape,
  account?: SfAccountAddressShape | null
): SfContactShape {
  if (!account) return contact
  const hasContactMailing =
    contact.MailingStreet?.trim() ||
    contact.MailingCity?.trim() ||
    contact.MailingPostalCode?.trim() ||
    contact.MailingCountry?.trim()
  if (hasContactMailing) return contact

  const street = firstTrimmed(
    account.PersonMailingStreet,
    account.BillingStreet,
    account.ShippingStreet
  )
  const city = firstTrimmed(account.PersonMailingCity, account.BillingCity, account.ShippingCity)
  const postal = firstTrimmed(
    account.PersonMailingPostalCode,
    account.BillingPostalCode,
    account.ShippingPostalCode
  )
  const country = firstTrimmed(
    account.PersonMailingCountry,
    account.BillingCountry,
    account.ShippingCountry
  )
  if (!street && !city && !postal && !country) return contact

  return {
    ...contact,
    ...(street ? { MailingStreet: street } : {}),
    ...(city ? { MailingCity: city } : {}),
    ...(postal ? { MailingPostalCode: postal } : {}),
    ...(country ? { MailingCountry: country } : {}),
  }
}

function metadataFromSalesforce(sf: SfContactShape): Record<string, unknown> {
  const meta: Record<string, unknown> = {}
  const salutation = sf.Salutation__c?.trim() || sf.Salutation?.trim()
  if (salutation) meta[CUSTOMER_METADATA_KEYS.salutation] = salutation
  if (sf.Initials__c?.trim()) meta[CUSTOMER_METADATA_KEYS.initials] = sf.Initials__c.trim()
  if (sf.Birthdate) meta[CUSTOMER_METADATA_KEYS.birthdate] = sf.Birthdate
  if (sf.IBAN__c?.trim()) meta[CUSTOMER_METADATA_KEYS.iban] = sf.IBAN__c.trim()
  if (sf.Newsletter__c !== undefined) meta[CUSTOMER_METADATA_KEYS.newsletter] = sf.Newsletter__c
  if (sf.Magazine__c !== undefined) meta[CUSTOMER_METADATA_KEYS.magazine] = sf.Magazine__c
  if (sf.Editorial__c !== undefined) meta[CUSTOMER_METADATA_KEYS.editorial] = sf.Editorial__c
  if (sf.OptIn__c !== undefined) meta[CUSTOMER_METADATA_KEYS.optIn] = sf.OptIn__c
  if (sf.HasOptedOutOfEmail !== undefined) {
    meta[CUSTOMER_METADATA_KEYS.hasOptedOutOfEmail] = sf.HasOptedOutOfEmail
  }
  return meta
}

function addressFromSalesforce(
  sf: SfContactShape,
  profile: { first_name?: string; last_name?: string; phone?: string }
): MedusaCustomerAddressShape | undefined {
  const address_1 = sf.MailingStreet?.trim()
  const city = sf.MailingCity?.trim()
  const postal_code = sf.MailingPostalCode?.trim()
  const country_code = salesforceCountryToMedusa(sf.MailingCountry)
  if (!address_1 && !city && !postal_code && !country_code) return undefined
  return {
    address_1: address_1 ?? undefined,
    city: city ?? undefined,
    postal_code: postal_code ?? undefined,
    country_code: country_code ?? undefined,
    first_name: profile.first_name,
    last_name: profile.last_name,
    phone: profile.phone,
  }
}

export function customerProfileFromSalesforce(sf: SfContactShape): {
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  metadata?: Record<string, unknown>
  address?: MedusaCustomerAddressShape
} {
  const first_name = sf.FirstName?.trim() || undefined
  const last_name = sf.LastName?.trim() || undefined
  const email = coalesceEmail(sf)
  const phone = coalescePhone(sf)
  const metadata = metadataFromSalesforce(sf)
  const address = addressFromSalesforce(sf, { first_name, last_name, phone })
  return {
    ...(first_name ? { first_name } : {}),
    ...(last_name ? { last_name } : {}),
    ...(email ? { email } : {}),
    ...(phone ? { phone } : {}),
    ...(Object.keys(metadata).length ? { metadata } : {}),
    ...(address ? { address } : {}),
  }
}

export function personAccountFieldsFromMedusa(
  c: MedusaCustomerShape,
  recordTypeId?: string
): SfPersonAccountPushShape {
  const meta = c.metadata ?? {}
  const salutation =
    (meta[CUSTOMER_METADATA_KEYS.salutation] as string | undefined)?.trim() ||
    undefined
  const initials = (meta[CUSTOMER_METADATA_KEYS.initials] as string | undefined)?.trim()

  const fields: SfPersonAccountPushShape = {
    FirstName: c.first_name?.trim() || "Unknown",
    LastName: c.last_name?.trim() || "-",
    PersonEmail: c.email?.trim() || undefined,
  }

  if (recordTypeId) fields.RecordTypeId = recordTypeId
  if (c.phone?.trim()) {
    fields.PersonMobilePhone = c.phone.trim()
    fields.Phone = c.phone.trim()
  }
  if (salutation) {
    fields.Salutation = salutation
    fields.Salutation__c = salutation
  }
  if (initials) fields.Initials__c = initials

  applyMedusaAddressToAccountFields(fields, c.address)
  applyBirthdateFromMedusa(fields, meta, "account")

  return fields
}

export function contactFieldsFromMedusa(c: MedusaCustomerShape): SfContactPushShape {
  const meta = c.metadata ?? {}
  const salutation =
    (meta[CUSTOMER_METADATA_KEYS.salutation] as string | undefined)?.trim() ||
    undefined
  const initials = (meta[CUSTOMER_METADATA_KEYS.initials] as string | undefined)?.trim()

  const fields: SfContactPushShape = {
    FirstName: c.first_name?.trim() || "Unknown",
    LastName: c.last_name?.trim() || "-",
    Email: c.email?.trim() || undefined,
  }

  if (c.phone?.trim()) {
    fields.MobilePhone = c.phone.trim()
    fields.Phone = c.phone.trim()
  }
  if (salutation) {
    fields.Salutation = salutation
    fields.Salutation__c = salutation
  }
  if (initials) fields.Initials__c = initials

  const addr = c.address
  if (addr?.address_1?.trim()) fields.MailingStreet = addr.address_1.trim()
  if (addr?.city?.trim()) fields.MailingCity = addr.city.trim()
  if (addr?.postal_code?.trim()) fields.MailingPostalCode = addr.postal_code.trim()
  const country = medusaCountryToSalesforce(addr?.country_code)
  if (country) fields.MailingCountry = country

  applyBirthdateFromMedusa(fields, meta, "contact")

  return fields
}

/** Stable hash input for skip-if-unchanged push guard. */
export function customerPushPayloadFingerprint(c: MedusaCustomerShape): string {
  return JSON.stringify({
    first_name: c.first_name ?? null,
    last_name: c.last_name ?? null,
    email: c.email ?? null,
    phone: c.phone ?? null,
    address: c.address ?? null,
    salutation: c.metadata?.[CUSTOMER_METADATA_KEYS.salutation] ?? null,
    initials: c.metadata?.[CUSTOMER_METADATA_KEYS.initials] ?? null,
    birthdate: c.metadata?.[CUSTOMER_METADATA_KEYS.birthdate] ?? null,
  })
}

/** Legacy FieldMap shape kept for type compatibility; customers no longer use external-id upsert. */
export const customerMapping: FieldMap<MedusaCustomerShape, SfContactShape> = {
  externalIdField: "Id",
  salesforceFieldsForPull: [...customerContactFieldsForPull],
  toSalesforce: (c) => contactFieldsFromMedusa(c) as Partial<SfContactShape>,
  fromSalesforce: (sf) => customerProfileFromSalesforce(sf),
}

export function resolvePersonAccountRecordTypeId(): string {
  const id = process.env.SALESFORCE_PERSON_ACCOUNT_RECORD_TYPE_ID?.trim()
  if (!id) {
    throw new Error(
      "SALESFORCE_PERSON_ACCOUNT_RECORD_TYPE_ID must be set to create Person Accounts from the website"
    )
  }
  return id
}
