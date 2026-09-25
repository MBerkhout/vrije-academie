import type { StructureBuilder } from "sanity/structure"
import { encodeFolderPath, getRootParentPath } from "../lib/page-folder-tree"
import {
  folderPathFromChildId,
  PagesIndexPane,
  PageTreePane,
  VA_PAGES_NAV_ID,
  VA_THUIS_NAV_ID,
  type PageTreePaneOptions,
} from "./PageTreePane"

export const PAGE_IN_FOLDER_TEMPLATE = "page-in-folder"

export type PageTreeScope = {
  isVaThuis: boolean
  title: string
  listId: string
}

function buildSlugPrefix(parentPath: string): string {
  return parentPath ? `${parentPath}/` : ""
}

function formatPagePath(slug: string): string {
  if (slug === "/") return "/"
  return `/${slug}`
}

function pageDocument(S: StructureBuilder, documentId: string) {
  return S.document().documentId(documentId).schemaType("page")
}

function buildPageTreePane(
  S: StructureBuilder,
  scope: PageTreeScope,
  parentPath: string,
) {
  const slugPrefix = buildSlugPrefix(parentPath)
  const listTitle = parentPath ? formatPagePath(parentPath) : scope.title
  const options: PageTreePaneOptions = {
    isVaThuis: scope.isVaThuis,
    parentPath,
    listId: scope.listId,
  }

  return S.component()
    .id(`${scope.listId}-${encodeFolderPath(parentPath)}`)
    .title(listTitle)
    .component(PageTreePane)
    .options(options)
    .menuItems([
      S.menuItem()
        .title("New page")
        .intent({
          type: "create",
          params: [
            { type: "page", template: PAGE_IN_FOLDER_TEMPLATE },
            { isVaThuis: scope.isVaThuis, slugPrefix },
          ],
        }),
    ])
    .canHandleIntent((intentName, params) => {
      if (intentName === "create" && params.template === PAGE_IN_FOLDER_TEMPLATE) {
        return true
      }

      if (intentName === "edit" && params.type === "page") {
        return true
      }

      return false
    })
    .child((childId) => {
      const folderPath = folderPathFromChildId(childId)
      if (folderPath !== null) {
        return buildPageTreePane(S, scope, folderPath)
      }

      return pageDocument(S, childId)
    })
}

const VA_PAGES_SCOPE: PageTreeScope = {
  isVaThuis: false,
  title: "VA pages",
  listId: "va-pages",
}

const VA_THUIS_SCOPE: PageTreeScope = {
  isVaThuis: true,
  title: "VA Thuis pages",
  listId: "va-thuis-pages",
}

export function pagesIndexPane(S: StructureBuilder) {
  return S.component()
    .id("pages-index")
    .title("Pages")
    .component(PagesIndexPane)
    .child((childId) => {
      if (childId === VA_PAGES_NAV_ID) {
        return buildPageTreePane(S, VA_PAGES_SCOPE, getRootParentPath(false))
      }

      if (childId === VA_THUIS_NAV_ID) {
        return buildPageTreePane(S, VA_THUIS_SCOPE, getRootParentPath(true))
      }

      return pageDocument(S, childId)
    })
}
