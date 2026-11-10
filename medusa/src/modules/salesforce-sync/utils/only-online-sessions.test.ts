import { describe, expect, it } from "vitest"

import { onlyOnlineFutureSessionsRemain } from "./only-online-sessions"

const future = new Date(Date.now() + 86_400_000).toISOString()
const past = new Date(Date.now() - 86_400_000).toISOString()

describe("onlyOnlineFutureSessionsRemain", () => {
  it("is true when only future online sessions remain", () => {
    expect(
      onlyOnlineFutureSessionsRemain([
        { Product_City__c: "Amsterdam", Start_date_time__c: past },
        { Product_City__c: "Online", Start_date_time__c: future },
      ])
    ).toBe(true)
  })

  it("is false when a future offline session exists", () => {
    expect(
      onlyOnlineFutureSessionsRemain([
        { Product_City__c: "Amsterdam", Start_date_time__c: future },
        { Product_City__c: "Online", Start_date_time__c: future },
      ])
    ).toBe(false)
  })

  it("is false when every session is in the past", () => {
    expect(
      onlyOnlineFutureSessionsRemain([
        { Product_City__c: "Online", Start_date_time__c: past },
      ])
    ).toBe(false)
  })
})
