export type MollieKlarnaProviderOptions = {
  apiKey: string
  redirectUrl: string
  medusaUrl: string
  autoCapture?: boolean
  description?: string
  debug?: boolean
}

export const MOLLIE_KLARNA_PROVIDER_ID = "mollie-klarna"
