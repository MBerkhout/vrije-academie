import { describe, expect, it } from "vitest"
import type { DocumentActionComponent, DocumentActionsContext } from "sanity"
import {
  buildClearPageCacheRequest,
  clearCacheDocumentActions,
  pageStorefrontPath,
} from "../clearCacheActions"

const publishAction = Object.assign((() => null) as DocumentActionComponent, { action: "publish" })
const deleteAction = Object.assign((() => null) as DocumentActionComponent, { action: "delete" })
const prev = [publishAction, deleteAction]

function context(schemaType: string): DocumentActionsContext {
  return { schemaType } as DocumentActionsContext
}

function actionNames(actions: DocumentActionComponent[]): Array<string | undefined> {
  return actions.map((action) => action.action)
}

describe("clearCacheDocumentActions", () => {
  it("appends Clear page cache for pages only", () => {
    expect(actionNames(clearCacheDocumentActions(prev, context("page")))).toEqual([
      "publish",
      "delete",
      "clear-page-cache",
    ])
    expect(clearCacheDocumentActions(prev, context("product"))).toBe(prev)
    expect(clearCacheDocumentActions(prev, context("generalSettings"))).toBe(prev)
  })
})

describe("pageStorefrontPath", () => {
  it("maps homepage and nested slugs", () => {
    expect(pageStorefrontPath("/")).toBe("/")
    expect(pageStorefrontPath("over-ons/team")).toBe("/over-ons/team")
    expect(pageStorefrontPath(undefined)).toBeNull()
  })
})

describe("buildClearPageCacheRequest", () => {
  it("posts the page slug to the studio revalidate route", () => {
    expect(
      buildClearPageCacheRequest("over-ons", {
        origin: "https://v2.vrijeacademie.nl",
        secret: "test-secret",
      }),
    ).toEqual({
      url: "https://v2.vrijeacademie.nl/api/revalidate/studio",
      headers: {
        Authorization: "Bearer test-secret",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ _type: "page", slug: "over-ons" }),
    })
  })
})
