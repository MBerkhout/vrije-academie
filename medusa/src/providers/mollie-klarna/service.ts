import type {
  AuthorizePaymentInput,
  AuthorizePaymentOutput,
  CancelPaymentInput,
  CancelPaymentOutput,
  CapturePaymentInput,
  CapturePaymentOutput,
  DeletePaymentInput,
  DeletePaymentOutput,
  GetPaymentStatusInput,
  GetPaymentStatusOutput,
  InitiatePaymentInput,
  InitiatePaymentOutput,
  Logger,
  ProviderWebhookPayload,
  RefundPaymentInput,
  RefundPaymentOutput,
  RetrievePaymentInput,
  RetrievePaymentOutput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
  WebhookActionResult,
} from "@medusajs/framework/types"
import {
  AbstractPaymentProvider,
  BigNumber,
  MedusaError,
  PaymentActions,
  PaymentSessionStatus,
} from "@medusajs/framework/utils"
import createMollieClient, {
  CaptureMethod,
  Locale,
  PaymentMethod,
  PaymentStatus,
  type MollieClient,
} from "@mollie/api-client"
import { buildKlarnaOrderLine } from "./build-klarna-lines"
import { MOLLIE_KLARNA_PROVIDER_ID, type MollieKlarnaProviderOptions } from "./types"

type InjectedDependencies = {
  logger: Logger
}

type BillingContext = {
  givenName: string
  familyName: string
  email: string
  streetAndNumber: string
  postalCode: string
  city: string
  country: string
}

function asRecord(data: unknown): Record<string, unknown> {
  return (data ?? {}) as Record<string, unknown>
}

function formatMajorAmount(amount: number | string | { toString(): string }): string {
  return parseFloat(amount.toString()).toFixed(2)
}

function extractBillingContext(context: Record<string, unknown> | undefined): BillingContext {
  const customer = context?.customer as Record<string, unknown> | undefined
  const billing = customer?.billing_address as Record<string, unknown> | undefined

  const givenName = String(customer?.first_name ?? billing?.first_name ?? "").trim()
  const familyName = String(customer?.last_name ?? billing?.last_name ?? "").trim()
  const email = String(customer?.email ?? "").trim()
  const streetAndNumber = String(billing?.address_1 ?? "").trim()
  const postalCode = String(billing?.postal_code ?? "").trim()
  const city = String(billing?.city ?? "").trim()
  const country = String(billing?.country_code ?? "nl").trim().toUpperCase()

  const missing: string[] = []
  if (!givenName) missing.push("givenName")
  if (!familyName) missing.push("familyName")
  if (!email) missing.push("email")
  if (!streetAndNumber) missing.push("streetAndNumber")
  if (!postalCode) missing.push("postalCode")
  if (!city) missing.push("city")
  if (!country) missing.push("country")

  if (missing.length > 0) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Klarna requires complete billing details: missing ${missing.join(", ")}`
    )
  }

  return { givenName, familyName, email, streetAndNumber, postalCode, city, country }
}

class MollieKlarnaProviderService extends AbstractPaymentProvider<MollieKlarnaProviderOptions> {
  static identifier = MOLLIE_KLARNA_PROVIDER_ID

  protected logger_: Logger
  protected options_: MollieKlarnaProviderOptions
  protected client_: MollieClient
  protected debug_: boolean

  static validateOptions(options: MollieKlarnaProviderOptions): void {
    if (!options.apiKey || !options.redirectUrl || !options.medusaUrl) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "API key, redirect URL, and Medusa URL are required in the Klarna provider options."
      )
    }
  }

  constructor(container: InjectedDependencies, options: MollieKlarnaProviderOptions) {
    super(container, options)
    this.logger_ = container.logger
    this.options_ = options
    this.debug_ =
      options.debug ||
      process.env.NODE_ENV === "development" ||
      process.env.NODE_ENV === "test" ||
      false
    this.client_ = createMollieClient({
      apiKey: options.apiKey,
      versionStrings: [
        "MedusaJS/" + require("@medusajs/medusa/package.json").version,
        "VrijeAcademie/mollie-klarna",
      ],
    })
  }

  private webhookUrl(): string {
    return `${this.options_.medusaUrl}/hooks/payment/${MOLLIE_KLARNA_PROVIDER_ID}_mollie`
  }

  async initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentOutput> {
    const { context, amount, currency_code } = input
    const billing = extractBillingContext(context as Record<string, unknown> | undefined)
    const description = this.options_.description ?? "Bestelling Vrije Academie"
    const currency = currency_code.toUpperCase()
    const value = formatMajorAmount(amount)

    try {
      const payment = await this.client_.payments.create({
        method: PaymentMethod.klarna,
        amount: { value, currency },
        description,
        redirectUrl: this.options_.redirectUrl,
        webhookUrl: this.webhookUrl(),
        locale: Locale.nl_NL,
        captureMode:
          this.options_.autoCapture !== false ? CaptureMethod.automatic : CaptureMethod.manual,
        billingAddress: {
          givenName: billing.givenName,
          familyName: billing.familyName,
          email: billing.email,
          streetAndNumber: billing.streetAndNumber,
          postalCode: billing.postalCode,
          city: billing.city,
          country: billing.country,
        },
        lines: buildKlarnaOrderLine(amount, currency_code, description),
        metadata: {
          idempotency_key: (context as { idempotency_key?: string } | undefined)?.idempotency_key,
        },
      } as Parameters<MollieClient["payments"]["create"]>[0])

      this.debug_ &&
        this.logger_.info(`Mollie Klarna payment ${payment.id} created with amount ${value} ${currency}`)

      return { id: payment.id, data: asRecord(payment) }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.logger_.error(`Mollie Klarna payment creation failed: ${message}`)
      throw new MedusaError(MedusaError.Types.INVALID_DATA, message)
    }
  }

  async authorizePayment(input: AuthorizePaymentInput): Promise<AuthorizePaymentOutput> {
    const externalId = input.data?.id as string | undefined
    if (!externalId) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "Payment ID is required")
    }

    const { status } = await this.getPaymentStatus({ data: { id: externalId } })
    if (!["captured", "authorized", "paid"].includes(status)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Payment is not authorized: current status is ${status}`
      )
    }

    return { data: input.data, status }
  }

  async capturePayment(input: CapturePaymentInput): Promise<CapturePaymentOutput> {
    const externalId = input.data?.id as string | undefined
    if (!externalId) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "Payment ID is required")
    }

    const { data } = await this.retrievePayment({ data: { id: externalId } })
    let status = data?.status as string | undefined

    if (status === PaymentStatus.authorized && data?.captureMode === CaptureMethod.manual) {
      await this.client_.paymentCaptures.create({ paymentId: externalId })
    }

    const refreshed = await this.getPaymentStatus({ data: { id: externalId } })
    status = refreshed.status

    if (status !== PaymentSessionStatus.CAPTURED) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Payment is not captured: current status is ${status}`
      )
    }

    const payment = await this.retrievePayment({ data: { id: externalId } })
    return { data: payment.data }
  }

  async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentOutput> {
    const externalId = input.data?.id as string | undefined
    if (!externalId) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "Payment ID is required")
    }

    const payment = await this.retrievePayment({ data: { id: externalId } })
    const paymentAmount = payment.data?.amount as { value?: string; currency?: string } | undefined
    const currency = paymentAmount?.currency
    if (!currency) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "Currency information is missing from payment data")
    }

    const refundAmount = input.amount ?? paymentAmount?.value ?? "0"
    const refund = await this.client_.paymentRefunds.create({
      paymentId: externalId,
      amount: {
        value: formatMajorAmount(refundAmount),
        currency: currency.toUpperCase(),
      },
    })

    return { data: asRecord(refund) }
  }

  async cancelPayment(input: CancelPaymentInput): Promise<CancelPaymentOutput> {
    const id = input.data?.id as string
    try {
      const payment = await this.client_.payments.get(id)
      if (payment.status === PaymentStatus.expired) {
        return { data: { id: input.data?.id } }
      }

      const newPayment = await this.client_.payments.cancel(id).catch((error) => {
        this.logger_.warn(`Could not cancel Mollie Klarna payment ${id}: ${error.message}`)
        return payment
      })

      return { data: asRecord(newPayment) }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.logger_.error(`Error cancelling Klarna payment ${id}: ${message}`)
      throw error
    }
  }

  async deletePayment(input: DeletePaymentInput): Promise<DeletePaymentOutput> {
    return this.cancelPayment(input)
  }

  async getPaymentStatus(input: GetPaymentStatusInput): Promise<GetPaymentStatusOutput> {
    const paymentId = input.data?.id as string | undefined
    if (!paymentId) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "Payment ID is required")
    }

    const { status } = await this.client_.payments.get(paymentId)
    const statusMap: Record<string, PaymentSessionStatus> = {
      [PaymentStatus.open]: PaymentSessionStatus.REQUIRES_MORE,
      [PaymentStatus.canceled]: PaymentSessionStatus.CANCELED,
      [PaymentStatus.pending]: PaymentSessionStatus.PENDING,
      [PaymentStatus.authorized]: PaymentSessionStatus.AUTHORIZED,
      [PaymentStatus.expired]: PaymentSessionStatus.ERROR,
      [PaymentStatus.failed]: PaymentSessionStatus.ERROR,
      [PaymentStatus.paid]: PaymentSessionStatus.CAPTURED,
    }

    return { status: statusMap[status] ?? PaymentSessionStatus.PENDING }
  }

  async retrievePayment(input: RetrievePaymentInput): Promise<RetrievePaymentOutput> {
    const paymentId = input.data?.id as string | undefined
    if (!paymentId) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "Payment ID is required")
    }

    const payment = await this.client_.payments.get(paymentId)
    return { data: asRecord(payment) }
  }

  async updatePayment(input: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
    const data = input.data ?? {}
    const {
      id,
      description,
      redirectUrl,
      cancelUrl,
      webhookUrl,
      metadata,
      restrictPaymentMethodsToCountry,
    } = data as {
      id: string
      description?: string
      redirectUrl?: string
      cancelUrl?: string
      webhookUrl?: string
      metadata?: Record<string, unknown>
      restrictPaymentMethodsToCountry?: string
    }

    const payment = await this.client_.payments.update(id, {
      description,
      redirectUrl,
      cancelUrl,
      webhookUrl,
      metadata,
      restrictPaymentMethodsToCountry,
    })

    return { data: asRecord(payment) }
  }

  async getWebhookActionAndData(
    payload: ProviderWebhookPayload["payload"]
  ): Promise<WebhookActionResult> {
    const paymentId = payload.data?.id as string | undefined
    if (!paymentId) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "Payment ID is required in webhook payload")
    }

    try {
      const { data: payment } = await this.retrievePayment({ data: { id: paymentId } })
      if (!payment) {
        throw new MedusaError(MedusaError.Types.NOT_FOUND, "Payment not found")
      }

      const status = payment.status as string | undefined
      const session_id = (payment.metadata as { idempotency_key?: string } | undefined)
        ?.idempotency_key
      const amountValue = payment.amount as { value?: string; currency?: string } | undefined
      const amount = new BigNumber(amountValue?.value ?? 0)
      const baseData = {
        ...payment,
        session_id: session_id ?? "",
        amount,
      } as WebhookActionResult["data"]

      switch (status) {
        case PaymentStatus.authorized:
          return { action: PaymentActions.AUTHORIZED, data: baseData }
        case PaymentStatus.paid:
          return { action: PaymentActions.SUCCESSFUL, data: baseData }
        case PaymentStatus.expired:
        case PaymentStatus.failed:
          return { action: PaymentActions.FAILED, data: baseData }
        case PaymentStatus.canceled:
          return { action: PaymentActions.CANCELED, data: baseData }
        case PaymentStatus.pending:
          return { action: PaymentActions.PENDING, data: baseData }
        case PaymentStatus.open:
          return { action: PaymentActions.REQUIRES_MORE, data: baseData }
        default:
          return { action: PaymentActions.NOT_SUPPORTED, data: baseData }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.logger_.error(`Error processing Klarna webhook for payment ${paymentId}: ${message}`)

      const { data: payment } = await this.retrievePayment({ data: { id: paymentId } }).catch(
        () => ({ data: null })
      )

      if (payment) {
        const amountValue = payment.amount as { value?: string } | undefined
        return {
          action: "failed",
          data: {
            ...payment,
            session_id:
              (payment.metadata as { session_id?: string } | undefined)?.session_id ?? "",
            amount: new BigNumber(amountValue?.value ?? 0),
          } as WebhookActionResult["data"],
        }
      }

      throw error
    }
  }
}

export default MollieKlarnaProviderService
