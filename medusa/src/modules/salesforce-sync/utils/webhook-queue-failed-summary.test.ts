import { describe, expect, it } from "vitest"

import { summarizeTerminalFailedWebhookEvents } from "./webhook-queue-failed-summary"

describe("summarizeTerminalFailedWebhookEvents", () => {
  it("groups failed rows by error text and object type", () => {
    const summary = summarizeTerminalFailedWebhookEvents([
      { status: "failed", object_type: "vaProductgroup__c", error: "Workflow failed" },
      { status: "failed", object_type: "vaProductgroup__c", error: "Workflow failed" },
      { status: "done", object_type: "Account", error: "ignored" },
      {
        status: "failed",
        object_type: "vaProduct__c",
        error: "Event item date with salesforce_id: x, already exists.",
      },
    ])

    expect(summary.topErrors).toEqual([
      { message: "Workflow failed", count: 2 },
      { message: "Event item date with salesforce_id: x, already exists.", count: 1 },
    ])
    expect(summary.byObjectType).toEqual({
      vaProductgroup__c: 2,
      vaProduct__c: 1,
    })
  })
})