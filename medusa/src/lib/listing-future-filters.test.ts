import { describe, expect, it } from "vitest"

import {
  dayPartFromStartAt,
  earliestMatchingSessionStartAt,
  futureEventItemsMatchDayParts,
  futureEventItemsMatchPeriod,
  futureEventItemsMatchSessionFilters,
  monthKeyFromStartAt,
  sessionStartInPeriod,
  uniqueFutureMonthKeys,
} from "./listing-future-filters"

const now = new Date("2026-09-18T12:00:00.000Z")
const past = new Date(2026, 2, 10, 10, 0, 0).toISOString()
const octoberEvening = new Date(2026, 9, 5, 18, 0, 0).toISOString()
const decemberMorning = new Date(2026, 11, 2, 9, 30, 0).toISOString()

describe("sessionStartInPeriod", () => {
  it("includes the whole period-end calendar day", () => {
    expect(sessionStartInPeriod("2026-09-30T21:00:00.000Z", "2026-09-01", "2026-09-30")).toBe(
      true
    )
    expect(sessionStartInPeriod("2026-10-01T00:00:00.000Z", "2026-09-01", "2026-09-30")).toBe(
      false
    )
  })

  it("matches the same calendar month in every year", () => {
    expect(sessionStartInPeriod("2027-01-26T12:30:00.000Z", "2026-01-01", "2026-01-31")).toBe(
      true
    )
    expect(sessionStartInPeriod("2030-01-15T09:00:00.000Z", "2027-01-01", "2027-01-31")).toBe(
      true
    )
    expect(sessionStartInPeriod("2026-09-22T07:30:00.000Z", "2026-01-01", "2026-01-31")).toBe(
      false
    )
  })

  it("matches voorjaar in every year", () => {
    expect(sessionStartInPeriod("2030-01-10T10:00:00.000Z", "2026-01-01", "2026-06-30")).toBe(
      true
    )
    expect(sessionStartInPeriod("2027-09-01T10:00:00.000Z", "2026-01-01", "2026-06-30")).toBe(
      false
    )
  })
})

describe("futureEventItemsMatchPeriod", () => {
  it("matches a later future session even when an earlier future session is outside the month", () => {
    const items = [{ start_at: octoberEvening }, { start_at: decemberMorning }]
    expect(futureEventItemsMatchPeriod(items, "2026-12-01", "2026-12-31", now)).toBe(true)
    expect(futureEventItemsMatchPeriod(items, "2026-11-01", "2026-11-30", now)).toBe(false)
  })

  it("ignores past sessions that fall in the selected period", () => {
    expect(
      futureEventItemsMatchPeriod(
        [{ start_at: past }, { start_at: octoberEvening }],
        "2026-03-01",
        "2026-03-31",
        now
      )
    ).toBe(false)
  })
})

describe("futureEventItemsMatchDayParts", () => {
  it("matches any future session in the selected day part", () => {
    const items = [{ start_at: octoberEvening }, { start_at: decemberMorning }]
    expect(dayPartFromStartAt(octoberEvening)).toBe("avond")
    expect(futureEventItemsMatchDayParts(items, ["ochtend"], now)).toBe(true)
    expect(futureEventItemsMatchDayParts(items, ["middag"], now)).toBe(false)
  })

  it("does not match a past session in the selected day part", () => {
    expect(futureEventItemsMatchDayParts([{ start_at: past }], ["ochtend"], now)).toBe(false)
  })
})

describe("futureEventItemsMatchSessionFilters", () => {
  const amsterdamEveningSept = {
    start_at: new Date(2026, 8, 25, 18, 30, 0).toISOString(),
    city_slug: "amsterdam",
  }
  const amsterdamMorningOct = {
    start_at: new Date(2026, 9, 5, 10, 0, 0).toISOString(),
    city_slug: "amsterdam",
  }
  const utrechtEveningSept = {
    start_at: new Date(2026, 8, 26, 19, 0, 0).toISOString(),
    city_slug: "utrecht",
  }
  const items = [amsterdamEveningSept, amsterdamMorningOct, utrechtEveningSept]

  it("requires city and day-part on the same session", () => {
    expect(
      futureEventItemsMatchSessionFilters(
        items,
        { citySlugs: ["amsterdam"], dayParts: ["avond"], periodStart: null, periodEnd: null },
        now
      )
    ).toBe(true)
    expect(
      futureEventItemsMatchSessionFilters(
        items,
        { citySlugs: ["utrecht"], dayParts: ["ochtend"], periodStart: null, periodEnd: null },
        now
      )
    ).toBe(false)
  })

  it("requires city and month on the same session", () => {
    expect(
      futureEventItemsMatchSessionFilters(
        items,
        {
          citySlugs: ["amsterdam"],
          dayParts: [],
          periodStart: "2026-09-01",
          periodEnd: "2026-09-30",
        },
        now
      )
    ).toBe(true)
    expect(
      futureEventItemsMatchSessionFilters(
        items,
        {
          citySlugs: ["utrecht"],
          dayParts: [],
          periodStart: "2026-10-01",
          periodEnd: "2026-10-31",
        },
        now
      )
    ).toBe(false)
  })

  it("sets the card date from the matching session, not an earlier other-month start", () => {
    expect(
      earliestMatchingSessionStartAt(
        items,
        {
          citySlugs: ["amsterdam"],
          dayParts: [],
          periodStart: "2026-10-01",
          periodEnd: "2026-10-31",
        },
        now
      )
    ).toBe(amsterdamMorningOct.start_at)
  })
})

describe("uniqueFutureMonthKeys", () => {
  it("skips past months and de-duplicates", () => {
    expect(
      uniqueFutureMonthKeys(
        [{ start_at: past }, { start_at: octoberEvening }, { start_at: octoberEvening }, { start_at: decemberMorning }],
        now
      )
    ).toEqual(["2026-10", "2026-12"])
  })

  it("builds YYYY-MM keys from local session dates", () => {
    expect(monthKeyFromStartAt(octoberEvening)).toBe("2026-10")
  })
})
