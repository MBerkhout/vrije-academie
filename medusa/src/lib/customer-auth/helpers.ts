import { randomBytes } from "node:crypto"

import {
  ContainerRegistrationKeys,
  generateJwtToken,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import { createCustomerAccountWorkflow } from "@medusajs/core-flows"
import type { ICustomerModuleService } from "@medusajs/framework/types"

import { CUSTOMER_OTP_MODULE } from "../../modules/customer-otp"
import type CustomerOtpModuleService from "../../modules/customer-otp/service"
import { LEGACY_PASSWORD_MODULE } from "../../modules/legacy-password"
import type LegacyPasswordModuleService from "../../modules/legacy-password/service"
import { enqueueCustomerPullFromSalesforce } from "../../modules/salesforce-sync/utils/enqueue-customer-pull"
import { enqueueCustomerPushToSalesforce } from "../../modules/salesforce-sync/utils/enqueue-customer-push"
import { verifyDjangoPbkdf2Password } from "./django-pbkdf2"

const EMAILPASS_PROVIDER = "emailpass"
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type OtpPurpose = "login" | "set_password"

export type CustomerLookupResult = {
  exists: boolean
  hasPassword: boolean
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MedusaContainer = any

export function normalizeCustomerEmail(email: string): string {
  return email.toLowerCase().trim()
}

export function assertValidEmail(email: string): string {
  const normalized = normalizeCustomerEmail(email)
  if (!EMAIL_RE.test(normalized)) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Valid email is required")
  }
  return normalized
}

type AuthIdentityShape = {
  id: string
  app_metadata?: Record<string, unknown> | null
  provider_identities?: Array<{
    provider?: string
    entity_id?: string
    provider_metadata?: Record<string, unknown> | null
    user_metadata?: Record<string, unknown> | null
  }>
}

async function listAuthIdentitiesByEmail(
  container: MedusaContainer,
  email: string
): Promise<AuthIdentityShape[]> {
  const auth = container.resolve(Modules.AUTH) as {
    listAuthIdentities: (
      filters: Record<string, unknown>,
      config?: Record<string, unknown>
    ) => Promise<AuthIdentityShape[]>
  }

  return auth.listAuthIdentities(
    {
      provider_identities: {
        entity_id: email,
      },
    },
    { relations: ["provider_identities"] }
  )
}

export function authIdentityHasPassword(authIdentity: AuthIdentityShape): boolean {
  const provider = authIdentity.provider_identities?.find(
    (pi) => pi.provider === EMAILPASS_PROVIDER
  )
  const password = provider?.provider_metadata?.password
  return typeof password === "string" && password.length > 0
}

export async function lookupCustomerAuth(
  container: MedusaContainer,
  email: string
): Promise<CustomerLookupResult> {
  const normalized = assertValidEmail(email)
  const customerService = container.resolve(Modules.CUSTOMER) as ICustomerModuleService

  const [customers] = await customerService.listAndCountCustomers(
    { email: normalized },
    { take: 1, select: ["id"] }
  )

  if (!customers.length) {
    return { exists: false, hasPassword: false }
  }

  const identities = await listAuthIdentitiesByEmail(container, normalized)
  const hasMedusaPassword = identities.some(authIdentityHasPassword)
  const hasLegacyPassword = await customerHasLegacyPassword(container, normalized)
  return { exists: true, hasPassword: hasMedusaPassword || hasLegacyPassword }
}

export async function findAuthIdentityByEmail(
  container: MedusaContainer,
  email: string
): Promise<AuthIdentityShape | null> {
  const identities = await listAuthIdentitiesByEmail(container, email)
  return identities[0] ?? null
}

export async function ensurePasswordlessAuthIdentity(
  container: MedusaContainer,
  email: string
): Promise<AuthIdentityShape> {
  const normalized = assertValidEmail(email)
  const existing = await findAuthIdentityByEmail(container, normalized)
  if (existing) {
    return existing
  }

  const auth = container.resolve(Modules.AUTH) as {
    createAuthIdentities: (data: Record<string, unknown>) => Promise<AuthIdentityShape>
  }

  return auth.createAuthIdentities({
    provider_identities: [
      {
        entity_id: normalized,
        provider: EMAILPASS_PROVIDER,
        provider_metadata: {},
        user_metadata: {},
      },
    ],
  })
}

export async function linkAuthIdentityToCustomer(
  container: MedusaContainer,
  authIdentityId: string,
  customerId: string
): Promise<void> {
  const { setAuthAppMetadataWorkflow } = await import("@medusajs/core-flows")
  await setAuthAppMetadataWorkflow(container).run({
    input: {
      authIdentityId,
      actorType: "customer",
      value: customerId,
    },
  })
}

export async function issueCustomerJwt(
  container: MedusaContainer,
  authIdentity: AuthIdentityShape,
  authProvider = EMAILPASS_PROVIDER
): Promise<string> {
  const config = container.resolve(ContainerRegistrationKeys.CONFIG_MODULE) as {
    projectConfig: {
      http: {
        jwtSecret: string
        jwtExpiresIn?: string
        jwtOptions?: Record<string, unknown>
      }
    }
  }

  const { http } = config.projectConfig
  const customerId = (authIdentity.app_metadata?.customer_id as string | undefined) ?? ""
  const providerIdentity = authIdentity.provider_identities?.find(
    (pi) => pi.provider === authProvider
  )

  return generateJwtToken(
    {
      actor_id: customerId,
      actor_type: "customer",
      auth_identity_id: authIdentity.id,
      app_metadata: {
        customer_id: customerId,
      },
      user_metadata: providerIdentity?.user_metadata ?? {},
    },
    {
      secret: http.jwtSecret,
      expiresIn: http.jwtExpiresIn,
      jwtOptions: http.jwtOptions,
    }
  )
}

export async function getCustomerByEmail(
  container: MedusaContainer,
  email: string
) {
  const normalized = assertValidEmail(email)
  const customerService = container.resolve(Modules.CUSTOMER) as ICustomerModuleService
  const [customers] = await customerService.listAndCountCustomers(
    { email: normalized },
    { take: 1 }
  )
  return customers[0] ?? null
}

export async function verifyOtpAndIssueToken(
  container: MedusaContainer,
  email: string,
  code: string,
  purpose: OtpPurpose
): Promise<{ token: string }> {
  const normalized = assertValidEmail(email)
  const otp = container.resolve(CUSTOMER_OTP_MODULE) as InstanceType<
    typeof CustomerOtpModuleService
  >
  await otp.verifyChallenge(normalized, code, purpose)

  const customer = await getCustomerByEmail(container, normalized)
  if (!customer) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Customer not found")
  }

  let authIdentity = await findAuthIdentityByEmail(container, normalized)
  if (!authIdentity) {
    authIdentity = await ensurePasswordlessAuthIdentity(container, normalized)
  }

  if (!authIdentity.app_metadata?.customer_id) {
    await linkAuthIdentityToCustomer(container, authIdentity.id, customer.id)
    authIdentity = (await findAuthIdentityByEmail(container, normalized)) ?? authIdentity
  }

  const token = await issueCustomerJwt(container, authIdentity)
  void enqueueCustomerPullFromSalesforce(container, customer.id, normalized).catch(() => {
    /* logged by workflow failure reporter */
  })
  return { token }
}

export type PasswordlessRegisterInput = {
  email: string
  first_name: string
  last_name: string
  phone?: string
  birthdate?: string
  address?: {
    address_1: string
    postal_code: string
    city: string
    country_code: string
    phone?: string
  }
}

export async function registerPasswordlessCustomer(
  container: MedusaContainer,
  input: PasswordlessRegisterInput
): Promise<{ token: string; customerId: string }> {
  const normalized = assertValidEmail(input.email)
  const existing = await getCustomerByEmail(container, normalized)
  if (existing) {
    const lookup = await lookupCustomerAuth(container, normalized)
    if (lookup.hasPassword) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "An account with this email already exists"
      )
    }

    let authIdentity = await findAuthIdentityByEmail(container, normalized)
    if (!authIdentity) {
      authIdentity = await ensurePasswordlessAuthIdentity(container, normalized)
    }
    if (!authIdentity.app_metadata?.customer_id) {
      await linkAuthIdentityToCustomer(container, authIdentity.id, existing.id)
      authIdentity = (await findAuthIdentityByEmail(container, normalized)) ?? authIdentity
    }

    const token = await issueCustomerJwt(container, authIdentity)
    void enqueueCustomerPullFromSalesforce(container, existing.id, normalized).catch(() => {})
    return { token, customerId: existing.id }
  }

  const authIdentity = await ensurePasswordlessAuthIdentity(container, normalized)
  const workflow = createCustomerAccountWorkflow(container)
  const { result: customer } = await workflow.run({
    input: {
      authIdentityId: authIdentity.id,
      customerData: {
        email: normalized,
        first_name: input.first_name.trim(),
        last_name: input.last_name.trim(),
        ...(input.phone?.trim() ? { phone: input.phone.trim() } : {}),
        ...(input.birthdate?.trim()
          ? { metadata: { sf_birthdate: input.birthdate.trim() } }
          : {}),
      },
    },
  })

  if (input.address) {
    const customerService = container.resolve(Modules.CUSTOMER) as ICustomerModuleService
    await customerService.createCustomerAddresses([
      {
        customer_id: customer.id,
        address_1: input.address.address_1,
        postal_code: input.address.postal_code,
        city: input.address.city,
        country_code: input.address.country_code,
        first_name: input.first_name.trim(),
        last_name: input.last_name.trim(),
        ...(input.address.phone?.trim() ? { phone: input.address.phone.trim() } : {}),
        is_default_shipping: true,
        is_default_billing: true,
      },
    ])
    void enqueueCustomerPushToSalesforce(container, customer.id, { isCreate: true }).catch(
      () => {}
    )
  }

  const linked = (await findAuthIdentityByEmail(container, normalized))!
  const token = await issueCustomerJwt(container, linked)
  return { token, customerId: customer.id }
}

export async function customerHasMedusaPassword(
  container: MedusaContainer,
  email: string
): Promise<boolean> {
  const identities = await listAuthIdentitiesByEmail(container, assertValidEmail(email))
  return identities.some(authIdentityHasPassword)
}

export async function customerHasLegacyPassword(
  container: MedusaContainer,
  email: string
): Promise<boolean> {
  const legacyPassword = container.resolve(LEGACY_PASSWORD_MODULE) as InstanceType<
    typeof LegacyPasswordModuleService
  >
  return legacyPassword.hasLegacyPassword(container, email)
}

export async function verifyLegacyPasswordForEmail(
  container: MedusaContainer,
  email: string,
  password: string
): Promise<boolean> {
  const legacyPassword = container.resolve(LEGACY_PASSWORD_MODULE) as InstanceType<
    typeof LegacyPasswordModuleService
  >
  const row = await legacyPassword.getByEmail(container, assertValidEmail(email))
  if (!row?.password_hash) return false
  return verifyDjangoPbkdf2Password(password, row.password_hash)
}

export async function loginWithPasswordMigration(
  container: MedusaContainer,
  email: string,
  password: string
): Promise<{ token: string }> {
  const normalized = assertValidEmail(email)
  const auth = container.resolve(Modules.AUTH) as {
    authenticate: (
      provider: string,
      data: Record<string, unknown>
    ) => Promise<{ success: boolean; authIdentity?: AuthIdentityShape; error?: string }>
    updateProvider: (
      provider: string,
      data: Record<string, unknown>
    ) => Promise<{ success: boolean; error?: string }>
  }

  const customer = await getCustomerByEmail(container, normalized)
  if (!customer) {
    throw new MedusaError(MedusaError.Types.UNAUTHORIZED, "Invalid email or password")
  }

  const login = await auth.authenticate("emailpass", {
    body: { email: normalized, password },
  })

  if (login.success && login.authIdentity) {
    let authIdentity = login.authIdentity
    if (!authIdentity.app_metadata?.customer_id) {
      await linkAuthIdentityToCustomer(container, authIdentity.id, customer.id)
      authIdentity = (await findAuthIdentityByEmail(container, normalized)) ?? authIdentity
    }
    const token = await issueCustomerJwt(container, authIdentity)
    void enqueueCustomerPullFromSalesforce(container, customer.id, normalized).catch(() => {})
    return { token }
  }

  const legacyPassword = container.resolve(LEGACY_PASSWORD_MODULE) as InstanceType<
    typeof LegacyPasswordModuleService
  >
  const legacyRow = await legacyPassword.getByEmail(container, normalized)
  if (!legacyRow?.password_hash) {
    throw new MedusaError(MedusaError.Types.UNAUTHORIZED, "Invalid email or password")
  }

  if (!verifyDjangoPbkdf2Password(password, legacyRow.password_hash)) {
    throw new MedusaError(MedusaError.Types.UNAUTHORIZED, "Invalid email or password")
  }

  let authIdentity = await findAuthIdentityByEmail(container, normalized)
  if (!authIdentity) {
    authIdentity = await ensurePasswordlessAuthIdentity(container, normalized)
  }
  if (!authIdentity.app_metadata?.customer_id) {
    await linkAuthIdentityToCustomer(container, authIdentity.id, customer.id)
    authIdentity = (await findAuthIdentityByEmail(container, normalized)) ?? authIdentity
  }

  const updated = await auth.updateProvider("emailpass", {
    entity_id: normalized,
    password,
  })
  if (!updated.success) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      updated.error ?? "Could not migrate password"
    )
  }

  await legacyPassword.deleteByCustomerId(customer.id)

  authIdentity = (await findAuthIdentityByEmail(container, normalized)) ?? authIdentity
  const token = await issueCustomerJwt(container, authIdentity)
  void enqueueCustomerPullFromSalesforce(container, customer.id, normalized).catch(() => {})
  return { token }
}

export async function customerHasPassword(
  container: MedusaContainer,
  email: string
): Promise<boolean> {
  const normalized = assertValidEmail(email)
  if (await customerHasMedusaPassword(container, normalized)) return true
  return customerHasLegacyPassword(container, normalized)
}

export function generateTemporaryPassword(): string {
  const suffix = randomBytes(6).toString("base64url")
  return `VaTemp-${suffix}!`
}

export async function getCustomerById(
  container: MedusaContainer,
  customerId: string
) {
  const customerService = container.resolve(Modules.CUSTOMER) as ICustomerModuleService
  try {
    return await customerService.retrieveCustomer(customerId, { select: ["id", "email"] })
  } catch {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Customer not found")
  }
}

export async function resetCustomerPassword(
  container: MedusaContainer,
  email: string,
  password?: string
): Promise<{ password: string; email: string }> {
  const normalized = assertValidEmail(email)
  let resolvedPassword = password?.trim()

  if (!resolvedPassword) {
    resolvedPassword = generateTemporaryPassword()
  } else if (resolvedPassword.length < 8) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Password must be at least 8 characters"
    )
  }

  const customer = await getCustomerByEmail(container, normalized)
  let authIdentity = await findAuthIdentityByEmail(container, normalized)

  if (!authIdentity && !customer) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "No auth identity or customer found for this email"
    )
  }

  if (!authIdentity) {
    authIdentity = await ensurePasswordlessAuthIdentity(container, normalized)
  }

  if (customer && !authIdentity.app_metadata?.customer_id) {
    await linkAuthIdentityToCustomer(container, authIdentity.id, customer.id)
  }

  const auth = container.resolve(Modules.AUTH) as {
    updateProvider: (
      provider: string,
      data: Record<string, unknown>
    ) => Promise<{ success: boolean; error?: string }>
  }

  const updated = await auth.updateProvider("emailpass", {
    entity_id: normalized,
    password: resolvedPassword,
  })

  if (!updated.success) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      updated.error ?? "Could not reset password"
    )
  }

  if (customer) {
    const legacyPassword = container.resolve(LEGACY_PASSWORD_MODULE) as InstanceType<
      typeof LegacyPasswordModuleService
    >
    await legacyPassword.deleteByCustomerId(customer.id)
  }

  return { password: resolvedPassword, email: normalized }
}
