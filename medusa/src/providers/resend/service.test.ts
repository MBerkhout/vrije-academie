import { describe, expect, it, vi, beforeEach } from "vitest"
import { MedusaError } from "@medusajs/framework/utils"

const { sendMock } = vi.hoisted(() => ({
  sendMock: vi.fn(),
}))

vi.mock("resend", () => ({
  Resend: class Resend {
    emails = { send: sendMock }
  },
}))

import ResendNotificationProviderService from "./service"

describe("ResendNotificationProviderService", () => {
  const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() }

  beforeEach(() => {
    sendMock.mockReset()
  })

  function service() {
    return new ResendNotificationProviderService(
      { logger },
      { from: "noreply@vrijeacademie.nl", api_key: "re_test" }
    )
  }

  it("sends html and text via the Resend API", async () => {
    sendMock.mockResolvedValue({ data: { id: "msg_1" }, error: null })
    const result = await service().send({
      to: "user@example.com",
      content: {
        subject: "Je inlogcode",
        text: "Code: 123456",
        html: "<p>Code: 123456</p>",
      },
    })
    expect(result).toEqual({ id: "msg_1" })
    expect(sendMock).toHaveBeenCalledWith({
      from: "noreply@vrijeacademie.nl",
      to: "user@example.com",
      subject: "Je inlogcode",
      text: "Code: 123456",
      html: "<p>Code: 123456</p>",
      attachments: undefined,
    })
  })

  it("throws MedusaError when Resend returns an error", async () => {
    sendMock.mockResolvedValue({
      data: null,
      error: { message: "Invalid from", name: "validation_error" },
    })
    await expect(
      service().send({
        to: "user@example.com",
        content: { subject: "Hi", text: "Hello" },
      })
    ).rejects.toThrow(MedusaError)
  })
})
