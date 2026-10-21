export type OtpPurpose = "login" | "set_password"

export const OTP_LOGIN_TTL_MS = 60 * 60 * 1000
export const OTP_SET_PASSWORD_TTL_MS = 10 * 60 * 1000

export function otpTtlMs(purpose: OtpPurpose): number {
  return purpose === "login" ? OTP_LOGIN_TTL_MS : OTP_SET_PASSWORD_TTL_MS
}

export function otpValidityMinutes(purpose: OtpPurpose): number {
  return otpTtlMs(purpose) / 60_000
}
