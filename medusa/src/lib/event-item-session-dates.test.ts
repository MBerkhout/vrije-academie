import { describe, expect, it } from "vitest"

import { stripPrivateEventItemFields } from "./event-item-session-dates"

describe("stripPrivateEventItemFields", () => {
  it("removes webinar urls from storefront payloads", () => {
    const stripped = stripPrivateEventItemFields({
      id: "ei_1",
      start_at: "2027-01-28T13:00:00.000Z",
      live_url: "https://live.example/",
      recording_url: "https://replay.example/",
    })
    expect(stripped).toEqual({
      id: "ei_1",
      start_at: "2027-01-28T13:00:00.000Z",
    })
    expect(stripped).not.toHaveProperty("live_url")
    expect(stripped).not.toHaveProperty("recording_url")
  })
})