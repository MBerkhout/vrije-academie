import type {
  Logger,
  ProviderSendNotificationDTO,
  ProviderSendNotificationResultsDTO,
} from "@medusajs/framework/types"
import {
  AbstractNotificationProviderService,
  MedusaError,
} from "@medusajs/framework/utils"
import nodemailer from "nodemailer"
import type { Transporter } from "nodemailer"

import { buildSmtpMail } from "./build-mail"

export type SmtpProviderOptions = {
  from: string
  host: string
  port: number
  secure?: boolean
  auth?: { user: string; pass: string }
}

type InjectedDependencies = {
  logger: Logger
}

class SmtpNotificationProviderService extends AbstractNotificationProviderService {
  static identifier = "notification-smtp"

  protected logger_: Logger
  protected from_: string
  protected transporter_: Transporter

  static validateOptions(options: Record<string, unknown>) {
    if (!options.host || typeof options.host !== "string") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "SMTP_HOST is required in the SMTP notification provider options."
      )
    }
    if (!options.from || typeof options.from !== "string") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "SMTP_FROM is required in the SMTP notification provider options."
      )
    }
  }

  constructor({ logger }: InjectedDependencies, options: SmtpProviderOptions) {
    super()
    this.logger_ = logger
    this.from_ = options.from
    this.transporter_ = nodemailer.createTransport({
      host: options.host,
      port: options.port,
      secure: Boolean(options.secure),
      auth: options.auth?.user
        ? { user: options.auth.user, pass: options.auth.pass }
        : undefined,
    })
  }

  async send(
    notification: ProviderSendNotificationDTO
  ): Promise<ProviderSendNotificationResultsDTO> {
    try {
      const mail = buildSmtpMail(notification, this.from_)
      const info = await this.transporter_.sendMail(mail)
      return { id: info.messageId }
    } catch (error) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Failed to send email: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }
}

export default SmtpNotificationProviderService
