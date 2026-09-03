import { VATHUIS_PATH_SEGMENT } from "../constants/storefront-paths"

export type PageFolderEntry = {
  _id: string
  title: string
  /** `slug.current` from GROQ; null when the page has no slug set yet. */
  slug: string | null
}

export type PageFolderChild = {
  segment: string
  path: string
  page?: PageFolderEntry
  hasDescendants: boolean
}

export type PageFolderGroup = {
  currentPage?: PageFolderEntry
  children: PageFolderChild[]
  /** Pages with no slug set — can't be placed in the tree, listed separately. */
  missingSlug: PageFolderEntry[]
}

export type GroupPagesOptions = {
  parentPath: string
  isVaThuis: boolean
}

/** Strip `drafts.` prefix from document ids for stable list item ids. */
export function normalizePageId(id: string): string {
  return id.replace(/^drafts\./, "")
}

function pagePublishPriority(page: PageFolderEntry): number {
  return page._id.startsWith("drafts.") ? 0 : 1
}

/** A page needs a non-empty slug to be placed in the folder tree. */
export function hasValidSlug(
  page: PageFolderEntry,
): page is PageFolderEntry & { slug: string } {
  return typeof page.slug === "string" && page.slug.length > 0
}

function dedupePagesByKey<T extends PageFolderEntry>(
  pages: T[],
  keyOf: (page: T) => string,
): T[] {
  const byKey = new Map<string, { page: T; priority: number }>()

  for (const page of pages) {
    const priority = pagePublishPriority(page)
    const key = keyOf(page)
    const existing = byKey.get(key)
    if (!existing || priority > existing.priority) {
      byKey.set(key, {
        page: { ...page, _id: normalizePageId(page._id) },
        priority,
      })
    }
  }

  return Array.from(byKey.values()).map(({ page }) => page)
}

/** Prefer published document ids when draft and published share a slug. */
export function dedupePagesBySlug<T extends PageFolderEntry>(pages: T[]): T[] {
  return dedupePagesByKey(pages, (page) => page.slug ?? "")
}

/** Prefer published document ids when draft and published are the same document. */
function dedupePagesById(pages: PageFolderEntry[]): PageFolderEntry[] {
  return dedupePagesByKey(pages, (page) => normalizePageId(page._id))
}

/** Encode a slug path for use as a Structure Builder list item id. */
export function encodeFolderPath(path: string): string {
  return path.replace(/\//g, "~") || "root"
}

/** Decode a Structure Builder list item id back to a slug path. */
export function decodeFolderPath(id: string): string {
  if (id === "root") return ""
  return id.replace(/~/g, "/")
}

/** Root folder path for a page tree scope. */
export function getRootParentPath(isVaThuis: boolean): string {
  return isVaThuis ? VATHUIS_PATH_SEGMENT : ""
}

function getRelativePath(
  slug: string,
  parentPath: string,
): string | null {
  if (slug === "/") {
    return parentPath === "" ? "" : null
  }

  if (parentPath === "") {
    return slug
  }

  if (slug === parentPath) {
    return ""
  }

  const prefix = `${parentPath}/`
  if (!slug.startsWith(prefix)) {
    return null
  }

  return slug.slice(prefix.length)
}

/**
 * Group pages under a folder path into the current page (if any) and child
 * segments. Folders appear when a path has nested slugs, even without a page
 * document at that path.
 */
export function groupPagesByFolder(
  pages: PageFolderEntry[],
  options: GroupPagesOptions,
): PageFolderGroup {
  const { parentPath } = options
  const missingSlug = dedupePagesById(pages.filter((page) => !hasValidSlug(page)))
  const deduped = dedupePagesBySlug(pages.filter(hasValidSlug))

  const currentPage =
    parentPath === ""
      ? deduped.find((page) => page.slug === "/")
      : deduped.find((page) => page.slug === parentPath)

  const childMap = new Map<string, PageFolderChild>()

  for (const page of deduped) {
    if (page.slug === "/") continue

    const relativePath = getRelativePath(page.slug, parentPath)
    if (relativePath === null || relativePath === "") continue

    const segments = relativePath.split("/").filter(Boolean)
    if (segments.length === 0) continue

    const segment = segments[0]
    const path = parentPath ? `${parentPath}/${segment}` : segment

    const existing = childMap.get(segment)
    if (!existing) {
      childMap.set(segment, {
        segment,
        path,
        hasDescendants: segments.length > 1,
        page: segments.length === 1 && page.slug === path ? page : undefined,
      })
      continue
    }

    if (segments.length > 1) {
      existing.hasDescendants = true
    }

    if (segments.length === 1 && page.slug === path) {
      existing.page = page
    }
  }

  for (const child of childMap.values()) {
    const exactPage = deduped.find((page) => page.slug === child.path)
    if (exactPage) {
      child.page = exactPage
    }

    child.hasDescendants = deduped.some(
      (page) => page.slug.startsWith(`${child.path}/`) && page.slug !== child.path,
    )
  }

  const children = Array.from(childMap.values()).sort((a, b) =>
    a.segment.localeCompare(b.segment, "nl"),
  )

  return { currentPage, children, missingSlug }
}
