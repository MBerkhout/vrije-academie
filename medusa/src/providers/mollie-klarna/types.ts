export type MollieKlarnaProviderOptions = {
  apiKey: string
  redirectUrl: string
  medusaUrl: string
  autoCapture?: boolean
  description?: string
  debug?: boolean
  /** Minimum order amount in euros; 0 disables. */
  minAmount?: number
}

export const MOLLIE_KLARNA_PROVIDER_ID = "mollie-klarna"
