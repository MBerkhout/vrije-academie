import type {
  Logger,
  ProviderSendNotificationDTO,
  ProviderSendNotificationResultsDTO,
} from "@medusajs/framework/types"
import {
  AbstractNotificationProviderService,
  MedusaError,
} from "@medusajs/framework/utils"
import { Resend } from "resend"

import { buildSmtpMail } from "../smtp/build-mail"
import { mapMailAttachmentsToResend } from "./map-attachments"

export type ResendProviderOptions = {
  from: string
  api_key: string
}

type InjectedDependencies = {
  logger: Logger
}

class ResendNotificationProviderService extends AbstractNotificationProviderService {
  static identifier = "notification-resend"

  protected logger_: Logger
  protected from_: string
  protected client_: Resend

  static validateOptions(options: Record<string, unknown>) {
    if (!options.api_key || typeof options.api_key !== "string") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "RESEND_API_KEY is required in the Resend notification provider options."
      )
    }
    if (!options.from || typeof options.from !== "string") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "RESEND_FROM (or shared SMTP/SendGrid from) is required in the Resend notification provider options."
      )
    }
  }

  constructor(
    { logger }: InjectedDependencies,
    options: ResendProviderOptions
  ) {
    super()
    this.logger_ = logger
    this.from_ = options.from
    this.client_ = new Resend(options.api_key)
  }

  async send(
    notification: ProviderSendNotificationDTO
  ): Promise<ProviderSendNotificationResultsDTO> {
    try {
      const mail = buildSmtpMail(notification, this.from_)
      const attachments = mapMailAttachmentsToResend(mail.attachments)
      const base = {
        from: mail.from,
        to: mail.to,
        subject: mail.subject,
        ...(attachments ? { attachments } : {}),
      }
      const { data, error } = await this.client_.emails.send(
        mail.html
          ? {
              ...base,
              html: mail.html,
              ...(mail.text ? { text: mail.text } : {}),
            }
          : {
              ...base,
              text: mail.text ?? "",
            }
      )

      if (error) {
        throw new MedusaError(
          MedusaError.Types.UNEXPECTED_STATE,
          `Failed to send email: ${error.message}`
        )
      }

      if (!data?.id) {
        throw new MedusaError(
          MedusaError.Types.UNEXPECTED_STATE,
          "Failed to send email: Resend returned no message id"
        )
      }

      return { id: data.id }
    } catch (error) {
      if (error instanceof MedusaError) {
        throw error
      }
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Failed to send email: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }
}

export default ResendNotificationProviderService
