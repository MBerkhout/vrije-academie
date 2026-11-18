import {
  ContainerRegistrationKeys,
  generateJwtToken,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import type { ICustomerModuleService } from "@medusajs/framework/types"

import { CUSTOMER_OTP_MODULE } from "../../modules/customer-otp"
import type CustomerOtpModuleService from "../../modules/customer-otp/service"
import {
  findAuthIdentityByEmail,
  ensurePasswordlessAuthIdentity,
  getCustomerById,
  linkAuthIdentityToCustomer,
  type MedusaContainer,
} from "./helpers"
import {
  IMPERSONATION_JWT_CLAIM,
  IMPERSONATION_JWT_EXPIRES_IN,
  type CustomerJwtPayload,
} from "./impersonation-jwt"

const EMAILPASS_PROVIDER = "emailpass"

const DEFAULT_STOREFRONT_PUBLIC_URL = "https://v2.vrijeacademie.nl"

export function resolveStorefrontPublicUrl(env: NodeJS.ProcessEnv = process.env): string {
  return (
    env.STOREFRONT_PUBLIC_URL?.trim().replace(/\/+$/, "") || DEFAULT_STOREFRONT_PUBLIC_URL
  )
}

export function buildImpersonationStorefrontUrl(code: string, env?: NodeJS.ProcessEnv): string {
  const base = resolveStorefrontPublicUrl(env)
  return `${base}/impersonate#code=${encodeURIComponent(code)}`
}

export async function issueImpersonationJwt(
  container: MedusaContainer,
  authIdentity: {
    id: string
    app_metadata?: Record<string, unknown> | null
    provider_identities?: Array<{ provider?: string; user_metadata?: Record<string, unknown> | null }>
  },
  adminUserId: string
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
    (pi) => pi.provider === EMAILPASS_PROVIDER
  )

  return generateJwtToken(
    {
      actor_id: customerId,
      actor_type: "customer",
      auth_identity_id: authIdentity.id,
      app_metadata: {
        customer_id: customerId,
        [IMPERSONATION_JWT_CLAIM]: adminUserId,
      },
      user_metadata: providerIdentity?.user_metadata ?? {},
    } as CustomerJwtPayload,
    {
      secret: http.jwtSecret,
      expiresIn: IMPERSONATION_JWT_EXPIRES_IN,
      jwtOptions: http.jwtOptions,
    }
  )
}

function logImpersonation(
  container: MedusaContainer,
  message: string
): void {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER) as {
    warn: (msg: string) => void
  }
  logger.warn(`[impersonation] ${message}`)
}

export async function createImpersonationHandoff(
  container: MedusaContainer,
  customerId: string,
  adminUserId: string,
  clientIp?: string
): Promise<{ code: string; url: string; expires_at: string }> {
  const customer = await getCustomerById(container, customerId)
  if (!customer.email) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Customer email not found")
  }

  const otp = container.resolve(CUSTOMER_OTP_MODULE) as InstanceType<
    typeof CustomerOtpModuleService
  >
  const { code, expires_at } = await otp.createImpersonationChallenge(customerId, adminUserId)

  logImpersonation(
    container,
    `issue admin=${adminUserId} customer=${customerId} ip=${clientIp ?? "unknown"}`
  )

  return {
    code,
    expires_at,
    url: buildImpersonationStorefrontUrl(code),
  }
}

export async function exchangeImpersonationHandoff(
  container: MedusaContainer,
  code: string,
  clientIp?: string
): Promise<{ token: string }> {
  const otp = container.resolve(CUSTOMER_OTP_MODULE) as InstanceType<
    typeof CustomerOtpModuleService
  >
  const { customerId, adminUserId } = await otp.exchangeImpersonationCode(code)

  const customerService = container.resolve(Modules.CUSTOMER) as ICustomerModuleService
  const customer = await customerService.retrieveCustomer(customerId, {
    select: ["id", "email", "metadata"],
  })
  if (!customer.email) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Customer not found")
  }

  let authIdentity = await findAuthIdentityByEmail(container, customer.email)
  if (!authIdentity) {
    authIdentity = await ensurePasswordlessAuthIdentity(container, customer.email)
  }
  if (authIdentity.app_metadata?.customer_id !== customer.id) {
    await linkAuthIdentityToCustomer(container, authIdentity.id, customer.id)
    authIdentity = (await findAuthIdentityByEmail(container, customer.email)) ?? authIdentity
  }

  const token = await issueImpersonationJwt(container, authIdentity, adminUserId)

  const metadata = {
    ...(customer.metadata ?? {}),
    last_impersonated_at: new Date().toISOString(),
    last_impersonated_by: adminUserId,
  }
  await customerService.updateCustomers(customer.id, { metadata })

  logImpersonation(
    container,
    `exchange admin=${adminUserId} customer=${customerId} ip=${clientIp ?? "unknown"}`
  )

  return { token }
}