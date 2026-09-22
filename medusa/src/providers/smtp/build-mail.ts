import { textToHtml } from "../../lib/email-content"

export type SmtpNotificationInput = {
  to: string
  from?: string | null
  content?: {
    subject?: string
    text?: string
    html?: string
  } | null
  attachments?: Array<{
    content: string
    filename: string
    content_type?: string
    disposition?: string
    id?: string
  }> | null
}

export type SmtpMail = {
  from: string
  to: string
  subject: string
  text?: string
  html?: string
  attachments?: Array<{
    content: string
    filename: string
    contentType?: string
    contentDisposition?: string
    cid?: string
  }>
}

export function buildSmtpMail(
  notification: SmtpNotificationInput,
  defaultFrom: string
): SmtpMail {
  const from = notification.from?.trim() || defaultFrom
  const subject = notification.content?.subject?.trim() ?? ""
  const text = notification.content?.text
  const html =
    notification.content?.html || (text ? textToHtml(text) : undefined)

  if (!from) {
    throw new Error("SMTP mail requires a from address")
  }
  if (!notification.to?.trim()) {
    throw new Error("SMTP mail requires a to address")
  }
  if (!subject || (!text && !html)) {
    throw new Error("SMTP mail requires subject and text or html content")
  }

  const attachments = Array.isArray(notification.attachments)
    ? notification.attachments.map((attachment) => ({
        content: attachment.content,
        filename: attachment.filename,
        contentType: attachment.content_type,
        contentDisposition: attachment.disposition,
        cid: attachment.id,
      }))
    : undefined

  return {
    from,
    to: notification.to,
    subject,
    text,
    html,
    attachments,
  }
}
