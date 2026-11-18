import { describe, expect, it } from "vitest"

import {
  courseProductLiveUrl,
  courseProductRecordingUrl,
  isReservationCancelled,
  mapReservationToEventItemDate,
  mapReservationsForEventItem,
} from "./course-product-reservation"

describe("course-product-reservation", () => {
  it("maps zoom urls from child product fields", () => {
    expect(
      courseProductLiveUrl({
        Zoom_Link__c: " https://live.example/ ",
      } as never)
    ).toBe("https://live.example/")
    expect(courseProductLiveUrl({ Zoom_Link__c: "  " } as never)).toBeNull()
    expect(
      courseProductRecordingUrl({
        Link_Zoom_Recording__c: "https://replay.example/",
      } as never)
    ).toBe("https://replay.example/")
  })

  it("skips cancelled reservations", () => {
    expect(
      isReservationCancelled({
        B25__Status__r: { Name: "Geannuleerd" },
      })
    ).toBe(true)
    expect(mapReservationToEventItemDate({
      Id: "a0o1",
      B25__Start__c: "2027-01-28T13:00:00.000Z",
      B25__Status__r: { Name: "Afgelast" },
    })).toBeNull()
  })

  it("sorts reservations by sequence then start", () => {
    const child = {
      Reservations__r: {
        records: [
          {
            Id: "r2",
            Sequence__c: 2,
            B25__Start__c: "2027-02-04T13:00:00.000Z",
            B25__End__c: "2027-02-04T15:00:00.000Z",
          },
          {
            Id: "r1",
            Sequence__c: 1,
            B25__Start__c: "2027-01-28T13:00:00.000Z",
            B25__End__c: "2027-01-28T15:00:00.000Z",
          },
        ],
      },
    }
    const mapped = mapReservationsForEventItem(child)
    expect(mapped.map((row) => row.salesforce_id)).toEqual(["r1", "r2"])
  })
})