import { VATHUIS_PATH_SEGMENT } from "../constants/storefront-paths"

export type PageFolderEntry = {
  _id: string
  title: string
  slug: string
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

/** Prefer published document ids when draft and published share a slug. */
export function dedupePagesBySlug(pages: PageFolderEntry[]): PageFolderEntry[] {
  const bySlug = new Map<string, { page: PageFolderEntry; priority: number }>()

  for (const page of pages) {
    const priority = pagePublishPriority(page)
    const existing = bySlug.get(page.slug)
    if (!existing || priority > existing.priority) {
      bySlug.set(page.slug, {
        page: { ...page, _id: normalizePageId(page._id) },
        priority,
      })
    }
  }

  return Array.from(bySlug.values()).map(({ page }) => page)
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
  const deduped = dedupePagesBySlug(pages)

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

  return { currentPage, children }
}
