import { describe, expect, it, vi } from "vitest"

import {
  buildEventsByHandlesFromSnapshot,
  toListingEventCard,
  EVENTS_BY_HANDLES_MAX,
} from "./store-events-by-handles"

vi.mock("./store-listing-snapshot", () => ({
  getPlpListingSnapshot: vi.fn(),
  getVathuisListingSnapshot: vi.fn(),
}))

import {
  getPlpListingSnapshot,
  getVathuisListingSnapshot,
} from "./store-listing-snapshot"

const scope = {} as Parameters<typeof buildEventsByHandlesFromSnapshot>[0]

describe("toListingEventCard", () => {
  it("strips variants and metadata", () => {
    const card = toListingEventCard({
      id: "p1",
      handle: "a",
      title: "A",
      variants: [{ id: "v1" }],
      metadata: { x: 1 },
    })
    expect(card).toEqual({ id: "p1", handle: "a", title: "A" })
  })
})

describe("buildEventsByHandlesFromSnapshot", () => {
  it("returns rows in request order and skips missing handles", async () => {
    vi.mocked(getPlpListingSnapshot).mockResolvedValue({
      list: [
        { id: "1", handle: "alpha", title: "Alpha", variants: [] },
        { id: "2", handle: "beta", title: "Beta", variants: [] },
      ],
      eventGroupLinks: [],
      catLinksAll: [],
      docLinksAll: [],
      eventGroupByProduct: {},
      builtAt: Date.now(),
    })
    vi.mocked(getVathuisListingSnapshot).mockResolvedValue({
      list: [],
      builtAt: Date.now(),
    })

    const events = await buildEventsByHandlesFromSnapshot(scope, [
      "beta",
      "missing",
      "alpha",
    ])

    expect(events.map((e) => e.handle)).toEqual(["beta", "alpha"])
    expect(events[0]).not.toHaveProperty("variants")
  })

  it("caps handle count", () => {
    expect(EVENTS_BY_HANDLES_MAX).toBeGreaterThanOrEqual(4)
  })
})
