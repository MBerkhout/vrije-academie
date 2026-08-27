import { describe, expect, it } from "vitest"

import {
  formatPromotionRuleDisplayValue,
  formatYyyymmddForDisplay,
  getPromotionRuleOperatorLabel,
} from "./promotion-rule-display"
import { EVENT_PROMOTION_RULE_ATTRIBUTE_IDS } from "./promotion-event-rule-attributes"

describe("promotion-rule-display", () => {
  it("formats YYYYMMDD as DD/MM/YYYY", () => {
    expect(formatYyyymmddForDisplay("20260910")).toBe("10/09/2026")
    expect(formatYyyymmddForDisplay(20260910)).toBe("10/09/2026")
  })

  it("formats event date rule values for admin display", () => {
    expect(
      formatPromotionRuleDisplayValue("20260910", {
        id: EVENT_PROMOTION_RULE_ATTRIBUTE_IDS.event_start_from,
      } as any)
    ).toBe("10/09/2026")
  })

  it("labels numeric operators", () => {
    expect(
      getPromotionRuleOperatorLabel("gte", {
        operators: [{ value: "gte", label: "Greater than or equal" }],
      } as any)
    ).toBe("Greater than or equal")
  })
})
