import { describe, expect, it } from "vitest"

import {
  isFutureAgendaStartAt,
  slimAgendaItemForResponse,
} from "./agenda-listing-response"
import type { AgendaOccurrenceRow } from "./store-listing-snapshot"

describe("isFutureAgendaStartAt", () => {
  const nowMs = new Date("2026-09-21T12:00:00.000Z").getTime()

  it("returns true for future and current starts", () => {
    expect(isFutureAgendaStartAt("2026-09-21T12:00:00.000Z", nowMs)).toBe(true)
    expect(isFutureAgendaStartAt("2026-09-22T09:00:00.000Z", nowMs)).toBe(true)
  })

  it("returns false for past or missing starts", () => {
    expect(isFutureAgendaStartAt("2026-09-20T09:00:00.000Z", nowMs)).toBe(false)
    expect(isFutureAgendaStartAt(null, nowMs)).toBe(false)
    expect(isFutureAgendaStartAt(undefined, nowMs)).toBe(false)
  })
})

describe("slimAgendaItemForResponse", () => {
  it("drops facet-only fields from agenda rows", () => {
    const row = {
      id: "ei_1",
      variant_id: "var_1",
      product_id: "prod_1",
      product_handle: "lezing-test",
      product_title: "Lezing test",
      thumbnail: null,
      record_type: "Lezing",
      categories: [{ slug: "kunst", label: "Kunst" }],
      docenten: [{ slug: "docent-a", name: "Docent A" }],
      tags: [{ id: "tag_1", value: "Exclusief" }],
      has_exclusief_tag: true,
      variant_title: null,
      delivery_type: "offline",
      city: "Amsterdam",
      city_slug: "amsterdam",
      start_at: "2026-10-01T10:00:00.000Z",
      end_at: "2026-10-01T12:00:00.000Z",
      available_quantity: 5,
      capacity: 15,
      is_free_trial: false,
      registration_deadline_at: null,
      price: 2500,
      day_part: "ochtend",
      status: "open",
    } satisfies AgendaOccurrenceRow & { status: "open" }

    expect(slimAgendaItemForResponse(row)).toEqual({
      id: "ei_1",
      variant_id: "var_1",
      product_id: "prod_1",
      product_handle: "lezing-test",
      product_title: "Lezing test",
      thumbnail: null,
      record_type: "Lezing",
      has_exclusief_tag: true,
      variant_title: null,
      delivery_type: "offline",
      city: "Amsterdam",
      city_slug: "amsterdam",
      start_at: "2026-10-01T10:00:00.000Z",
      end_at: "2026-10-01T12:00:00.000Z",
      available_quantity: 5,
      capacity: 15,
      is_free_trial: false,
      registration_deadline_at: null,
      price: 2500,
      day_part: "ochtend",
      status: "open",
    })
  })
})
