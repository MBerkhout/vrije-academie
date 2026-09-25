import { describe, expect, it } from "vitest"

import {
  agendaLocalDateYmd,
  agendaOccurrenceSameCalendarDay,
  isAgendaOccurrenceEligible,
  isFutureAgendaStartAt,
  slimAgendaItemForResponse,
} from "./agenda-listing-response"
import type { AgendaOccurrenceRow } from "./store-listing-snapshot"

const baseEligibility = {
  record_type: "lezing" as const,
  delivery_type: "offline" as const,
}

describe("agendaLocalDateYmd", () => {
  it("formats dates in Europe/Amsterdam", () => {
    expect(agendaLocalDateYmd("2026-10-01T10:00:00.000Z")).toBe("2026-10-01")
  })
})

describe("agendaOccurrenceSameCalendarDay", () => {
  it("returns true for same-day start and end", () => {
    expect(
      agendaOccurrenceSameCalendarDay(
        "2026-10-01T08:00:00.000Z",
        "2026-10-01T18:00:00.000Z"
      )
    ).toBe(true)
  })

  it("returns false for multi-day spans", () => {
    expect(
      agendaOccurrenceSameCalendarDay(
        "2026-09-28T08:00:00.000Z",
        "2026-12-07T11:00:00.000Z"
      )
    ).toBe(false)
  })

  it("returns false when end is missing", () => {
    expect(agendaOccurrenceSameCalendarDay("2026-10-01T08:00:00.000Z", null)).toBe(false)
  })
})

describe("isAgendaOccurrenceEligible", () => {
  it("accepts single-day offline lezing rows", () => {
    expect(
      isAgendaOccurrenceEligible({
        ...baseEligibility,
        start_at: "2026-10-01T10:00:00.000Z",
        end_at: "2026-10-01T12:00:00.000Z",
      })
    ).toBe(true)
  })

  it("rejects multi-day rows", () => {
    expect(
      isAgendaOccurrenceEligible({
        ...baseEligibility,
        start_at: "2026-09-28T08:00:00.000Z",
        end_at: "2026-12-07T11:00:00.000Z",
      })
    ).toBe(false)
  })

  it("rejects VA-thuis by record_type and delivery_type", () => {
    expect(
      isAgendaOccurrenceEligible({
        ...baseEligibility,
        record_type: "vathuis",
        start_at: "2026-10-01T10:00:00.000Z",
        end_at: "2026-10-01T12:00:00.000Z",
      })
    ).toBe(false)
    expect(
      isAgendaOccurrenceEligible({
        ...baseEligibility,
        delivery_type: "pre_recorded",
        start_at: "2026-10-01T10:00:00.000Z",
        end_at: "2026-10-01T12:00:00.000Z",
      })
    ).toBe(false)
  })
})

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
