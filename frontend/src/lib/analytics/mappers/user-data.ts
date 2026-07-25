import type { Address, Customer } from '@/lib/commerce/types'
import type { UserData } from '@/lib/analytics/types'

function nonEmpty(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed || undefined
}

export function buildUserDataFromCustomer(customer: Customer | null | undefined): UserData | undefined {
  if (!customer) return undefined
  const data: UserData = {}
  const email = nonEmpty(customer.email)
  if (email) data.email = email
  const phone = nonEmpty(customer.phone)
  if (phone) data.phone_number = phone
  const first = nonEmpty(customer.first_name)
  if (first) data.first_name = first
  const last = nonEmpty(customer.last_name)
  if (last) data.last_name = last

  const addr = pickDefaultAddress(customer.addresses)
  if (addr) {
    const postal = nonEmpty(addr.postal_code)
    if (postal) data.postal_code = postal
    const country = nonEmpty(addr.country_code)?.toUpperCase()
    if (country) data.country = country
  }

  return Object.keys(data).length > 0 ? data : undefined
}

export function buildUserDataFromFields(fields: {
  email?: string | null
  phone?: string | null
  first_name?: string | null
  last_name?: string | null
  postal_code?: string | null
  country?: string | null
}): UserData | undefined {
  const data: UserData = {}
  const email = nonEmpty(fields.email)
  if (email) data.email = email
  const phone = nonEmpty(fields.phone)
  if (phone) data.phone_number = phone
  const first = nonEmpty(fields.first_name)
  if (first) data.first_name = first
  const last = nonEmpty(fields.last_name)
  if (last) data.last_name = last
  const postal = nonEmpty(fields.postal_code)
  if (postal) data.postal_code = postal
  const country = nonEmpty(fields.country)?.toUpperCase()
  if (country) data.country = country
  return Object.keys(data).length > 0 ? data : undefined
}

function pickDefaultAddress(addresses: Address[] | undefined): Address | undefined {
  if (!addresses?.length) return undefined
  return addresses.find((a) => a.is_default_shipping) ?? addresses[0]
}
