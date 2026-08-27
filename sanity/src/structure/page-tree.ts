import { DocumentIcon, FolderIcon } from "@sanity/icons"
import { map } from "rxjs/operators"
import type { DocumentStore } from "sanity"
import type { StructureBuilder } from "sanity/structure"
import {
  encodeFolderPath,
  getRootParentPath,
  groupPagesByFolder,
  type PageFolderEntry,
} from "../lib/page-folder-tree"

const API_VERSION = "2024-06-01"
export const PAGE_IN_FOLDER_TEMPLATE = "page-in-folder"

export type PageTreeScope = {
  isVaThuis: boolean
  title: string
  listId: string
}

function buildPagesQuery(
  isVaThuis: boolean,
  parentPath: string,
): { query: string; params: Record<string, string> } {
  const vaFilter = isVaThuis ? "isVaThuis == true" : "isVaThuis != true"

  if (parentPath === "") {
    return {
      query: `*[_type == "page" && ${vaFilter}]{ _id, title, "slug": slug.current }`,
      params: {},
    }
  }

  return {
    query: `*[_type == "page" && ${vaFilter} && (slug.current == $parentPath || slug.current match $parentPath + "/*")]{ _id, title, "slug": slug.current }`,
    params: { parentPath },
  }
}

function buildSlugPrefix(parentPath: string): string {
  return parentPath ? `${parentPath}/` : ""
}

function formatPagePath(slug: string): string {
  if (slug === "/") return "/"
  return `/${slug}`
}

function pageDocumentItem(S: StructureBuilder, page: PageFolderEntry) {
  return S.documentListItem()
    .id(page._id)
    .schemaType("page")
    .title(page.title || page.slug)
    .icon(DocumentIcon)
    .child(S.document().documentId(page._id).schemaType("page"))
}

function folderListItem(
  S: StructureBuilder,
  documentStore: DocumentStore,
  scope: PageTreeScope,
  child: { segment: string; path: string },
) {
  return S.listItem()
    .id(`${scope.listId}-${encodeFolderPath(child.path)}`)
    .title(child.segment)
    .icon(FolderIcon)
    .showIcon(true)
    .child(() => buildPageFolderList(S, documentStore, scope, child.path))
}

function buildPageFolderList(
  S: StructureBuilder,
  documentStore: DocumentStore,
  scope: PageTreeScope,
  parentPath: string,
) {
  const { query, params } = buildPagesQuery(scope.isVaThuis, parentPath)
  const slugPrefix = buildSlugPrefix(parentPath)
  const listTitle = parentPath ? formatPagePath(parentPath) : scope.title

  return documentStore.listenQuery(query, params, { apiVersion: API_VERSION }).pipe(
    map((pages: PageFolderEntry[]) => {
      const grouped = groupPagesByFolder(pages, {
        parentPath,
        isVaThuis: scope.isVaThuis,
      })

      const items = []

      if (grouped.currentPage) {
        items.push(
          S.listItem()
            .id(`${grouped.currentPage._id}-this-page`)
            .title(`This page: ${formatPagePath(grouped.currentPage.slug)}`)
            .schemaType("page")
            .icon(DocumentIcon)
            .child(
              S.document().documentId(grouped.currentPage._id).schemaType("page"),
            ),
        )
      }

      if (grouped.currentPage && grouped.children.length > 0) {
        items.push(S.divider())
      }

      for (const child of grouped.children) {
        if (child.hasDescendants) {
          items.push(folderListItem(S, documentStore, scope, child))
          continue
        }

        if (child.page) {
          items.push(pageDocumentItem(S, child.page))
        }
      }

      return S.list()
        .id(`${scope.listId}-${encodeFolderPath(parentPath)}`)
        .title(listTitle)
        .initialValueTemplates([
          S.initialValueTemplateItem(PAGE_IN_FOLDER_TEMPLATE, {
            isVaThuis: scope.isVaThuis,
            slugPrefix,
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
        .items(items)
    }),
  )
}

export function pageTreeListItem(
  S: StructureBuilder,
  documentStore: DocumentStore,
  scope: PageTreeScope,
) {
  const rootParentPath = getRootParentPath(scope.isVaThuis)

  return S.listItem()
    .id(scope.listId)
    .title(scope.title)
    .child(() => buildPageFolderList(S, documentStore, scope, rootParentPath))
}
