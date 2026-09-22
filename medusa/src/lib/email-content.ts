/** Escape text for a safe HTML email body. */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

/** Wrap plain text as a simple HTML body (SendGrid requires `html`, not `text`). */
export function textToHtml(text: string): string {
  return `<p style="font-family:system-ui,sans-serif;white-space:pre-wrap;">${escapeHtml(text)}</p>`
}

export function emailContent(input: {
  subject: string
  text: string
  html?: string
}): { subject: string; text: string; html: string } {
  return {
    subject: input.subject,
    text: input.text,
    html: input.html ?? textToHtml(input.text),
  }
}

export function hasEmailProvider(
  env: Record<string, string | undefined> = process.env
): boolean {
  return Boolean(env.SMTP_HOST?.trim() || env.SENDGRID_API_KEY?.trim())
}
