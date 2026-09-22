import { describe, expect, it } from "vitest"
import type { DocumentActionComponent, DocumentActionsContext } from "sanity"
import { mirroredDocumentActions } from "../mirrorActions"

const publishAction = Object.assign((() => null) as DocumentActionComponent, { action: "publish" })
const deleteAction = Object.assign((() => null) as DocumentActionComponent, { action: "delete" })
const prev = [publishAction, deleteAction]

function context(schemaType: string): DocumentActionsContext {
  return { schemaType } as DocumentActionsContext
}

function actionNames(actions: DocumentActionComponent[]): Array<string | undefined> {
  return actions.map((action) => action.action)
}

describe("mirroredDocumentActions", () => {
  it("keeps default actions and adds Open in Medusa for product and category", () => {
    for (const type of ["product", "category"]) {
      const result = mirroredDocumentActions(prev, context(type))
      expect(actionNames(result)).toEqual(["publish", "delete", "open-in-medusa"])
    }
  })

  it("strips default actions for docent", () => {
    const result = mirroredDocumentActions(prev, context("docent"))
    expect(actionNames(result)).toEqual(["open-in-medusa"])
  })

  it("leaves other document types unchanged", () => {
    expect(mirroredDocumentActions(prev, context("page"))).toBe(prev)
  })
})
