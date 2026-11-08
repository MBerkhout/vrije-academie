import type { Attachment } from "resend"

import type { SmtpMail } from "../smtp/build-mail"

export function mapMailAttachmentsToResend(
  attachments: SmtpMail["attachments"]
): Attachment[] | undefined {
  if (!attachments?.length) return undefined
  return attachments.map((attachment) => ({
    filename: attachment.filename,
    content: attachment.content,
    contentType: attachment.contentType,
    contentId: attachment.cid,
  }))
}
