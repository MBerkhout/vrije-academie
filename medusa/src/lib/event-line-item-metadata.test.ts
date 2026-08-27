import assert from "node:assert/strict"
import test from "node:test"

import {
  eventStartDateKey,
  stripReservedEventLineItemMetadata,
  EVENT_LINE_ITEM_METADATA_KEYS,
} from "./event-line-item-metadata.js"

test("eventStartDateKey formats UTC midnight as Amsterdam calendar date", () => {
  assert.equal(eventStartDateKey("2026-03-15T00:00:00.000Z"), 20260315)
})

test("eventStartDateKey uses Amsterdam timezone for late UTC evening", () => {
  assert.equal(eventStartDateKey("2026-03-15T23:00:00.000Z"), 20260316)
})

test("stripReservedEventLineItemMetadata removes reserved keys only", () => {
  const cleaned = stripReservedEventLineItemMetadata({
    note: "keep",
    [EVENT_LINE_ITEM_METADATA_KEYS.event_city_slug]: "amsterdam",
    [EVENT_LINE_ITEM_METADATA_KEYS.event_start_from]: 20260101,
  })

  assert.deepEqual(cleaned, { note: "keep" })
})
