import { describe, expect, it } from "vitest"

import { mapMailAttachmentsToResend } from "./map-attachments"

describe("mapMailAttachmentsToResend", () => {
  it("maps SMTP attachment fields to Resend", () => {
    const mapped = mapMailAttachmentsToResend([
      {
        content: "base64-pdf",
        filename: "cadeaubon.pdf",
        contentType: "application/pdf",
        contentDisposition: "attachment",
        cid: "logo",
      },
    ])
    expect(mapped).toEqual([
      {
        content: "base64-pdf",
        filename: "cadeaubon.pdf",
        contentType: "application/pdf",
        contentId: "logo",
      },
    ])
  })

  it("returns undefined when there are no attachments", () => {
    expect(mapMailAttachmentsToResend(undefined)).toBeUndefined()
    expect(mapMailAttachmentsToResend([])).toBeUndefined()
  })
})
