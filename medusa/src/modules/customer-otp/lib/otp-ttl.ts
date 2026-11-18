export type OtpPurpose = "login" | "set_password" | "impersonate"

export const OTP_LOGIN_TTL_MS = 60 * 60 * 1000
export const OTP_SET_PASSWORD_TTL_MS = 10 * 60 * 1000
export const OTP_IMPERSONATE_TTL_MS = 60 * 1000

export function otpTtlMs(purpose: OtpPurpose): number {
  if (purpose === "login") return OTP_LOGIN_TTL_MS
  if (purpose === "impersonate") return OTP_IMPERSONATE_TTL_MS
  return OTP_SET_PASSWORD_TTL_MS
}

export function otpValidityMinutes(purpose: OtpPurpose): number {
  return otpTtlMs(purpose) / 60_000
}
