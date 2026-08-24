import { describe, expect, it } from "vitest"

import {
  shouldBulkImportProductgroup,
  shouldEnqueueBulkProductgroup,
  shouldImportProductgroup,
  shouldLinkedVathuisBulkImport,
} from "./future-import-guard"

const future = new Date(Date.now() + 86_400_000).toISOString()

describe("shouldImportProductgroup visibility", () => {
  it("does not import a hidden group even for manual CLI/API", () => {
    expect(
      shouldImportProductgroup({
        group: {
          Visible_on_website__c: false,
          Latest_Product_Start_Date__c: future,
        },
        children: [{ Id: "a04a", Visible_On_Website__c: true, Start_date_time__c: future }],
        manual: true,
      })
    ).toBe(false)
  })

  it("imports a visible future group", () => {
    expect(
      shouldImportProductgroup({
        group: {
          Visible_on_website__c: true,
          Latest_Product_Start_Date__c: future,
        },
        children: [{ Id: "a04a", Visible_On_Website__c: true, Start_date_time__c: future }],
        manual: false,
      })
    ).toBe(true)
  })
})

describe("shouldBulkImportProductgroup visibility", () => {
  it("does not bulk-import a hidden VAthuis group", () => {
    expect(
      shouldBulkImportProductgroup({
        group: {
          Visible_on_website__c: false,
          Productgroup_Record_Type_Developer_Name__c: "Lezingen_Thuis",
        },
        children: [{ Id: "a04a", Visible_On_Website__c: true }],
      })
    ).toBe(false)
  })
})

describe("shouldLinkedVathuisBulkImport visibility", () => {
  it("skips hidden linked-online / VAthuis groups", () => {
    expect(
      shouldLinkedVathuisBulkImport({
        group: {
          Visible_on_website__c: false,
          Productgroup_Record_Type_Developer_Name__c: "Lezingen_Thuis",
        },
        children: [{ Id: "a04a" }],
      })
    ).toBe(false)
  })
})

describe("shouldEnqueueBulkProductgroup", () => {
  it("enqueues an already-imported hidden group so it can be drafted off the site", () => {
    expect(
      shouldEnqueueBulkProductgroup(
        {
          group: {
            Visible_on_website__c: false,
            Latest_Product_Start_Date__c: future,
          },
          children: [{ Id: "a04a", Visible_On_Website__c: true, Start_date_time__c: future }],
        },
        { alreadyImported: true }
      )
    ).toBe(true)
  })

  it("does not enqueue a hidden group that was never imported", () => {
    expect(
      shouldEnqueueBulkProductgroup(
        {
          group: { Visible_on_website__c: false, Latest_Product_Start_Date__c: future },
          children: [{ Id: "a04a", Visible_On_Website__c: true, Start_date_time__c: future }],
        },
        { alreadyImported: false }
      )
    ).toBe(false)
  })

  it("does not hide unrelated groups during linked-vathuis-only backfill", () => {
    expect(
      shouldEnqueueBulkProductgroup(
        {
          group: {
            Visible_on_website__c: false,
            Productgroup_Record_Type_Developer_Name__c: "Lezing",
          },
          children: [{ Id: "a04a" }],
        },
        { alreadyImported: true, linkedVathuisOnly: true }
      )
    ).toBe(false)
  })
})
