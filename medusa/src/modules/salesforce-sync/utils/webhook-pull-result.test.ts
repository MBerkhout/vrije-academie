import { describe, expect, it } from "vitest"

import { extractWebhookApplyResult, webhookOutcomeFromApply } from "./webhook-pull-result"

describe("webhookOutcomeFromApply", () => {
  it("treats a successful create as done", () => {
    expect(webhookOutcomeFromApply({ medusaId: "prod_1", skipped: false })).toEqual({
      outcome: "done",
      medusaId: "prod_1",
    })
  })

  it("skips auto-import when the group is hidden or past", () => {
    expect(
      webhookOutcomeFromApply({ skipped: true, skipReason: "past_dates", medusaId: "" })
    ).toEqual({
      outcome: "skipped",
      error: "past_dates",
      medusaId: null,
    })
    expect(
      webhookOutcomeFromApply({ skipped: true, skipReason: "not_visible_on_website" })
    ).toEqual({
      outcome: "skipped",
      error: "not_visible_on_website",
      medusaId: null,
    })
  })

  it("does not treat an unchanged pull as a skip", () => {
    expect(
      webhookOutcomeFromApply({ skipped: true, skipReason: "unchanged", medusaId: "prod_1" })
    ).toEqual({
      outcome: "done",
      medusaId: "prod_1",
    })
  })
})

describe("extractWebhookApplyResult", () => {
  it("reads nested workflow results", () => {
    expect(
      extractWebhookApplyResult({
        result: { result: { medusaId: "prod_1", skipped: true, skipReason: "past_dates" } },
      })
    ).toEqual({
      medusaId: "prod_1",
      skipped: true,
      skipReason: "past_dates",
    })
  })
})
