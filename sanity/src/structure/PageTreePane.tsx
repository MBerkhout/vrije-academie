import { DocumentIcon, DocumentsIcon, FolderIcon, SearchIcon, WarningOutlineIcon } from "@sanity/icons"
import { Box, Card, Flex, Stack, Text, TextInput } from "@sanity/ui"
import { useEffect, useState, type ReactNode } from "react"
import { useDocumentStore } from "sanity"
import { usePaneRouter } from "sanity/structure"
import {
  encodeFolderPath,
  decodeFolderPath,
  filterPagesByQuery,
  groupPagesByFolder,
  type PageFolderEntry,
} from "../lib/page-folder-tree"

const API_VERSION = "2024-06-01"

export const FOLDER_CHILD_PREFIX = "folder:"

export function folderChildId(path: string): string {
  return `${FOLDER_CHILD_PREFIX}${encodeFolderPath(path)}`
}

export function folderPathFromChildId(childId: string): string | null {
  if (!childId.startsWith(FOLDER_CHILD_PREFIX)) return null
  return decodeFolderPath(childId.slice(FOLDER_CHILD_PREFIX.length))
}
export const VA_PAGES_NAV_ID = "nav:va-pages"
export const VA_THUIS_NAV_ID = "nav:va-thuis-pages"

export type PageTreePaneOptions = {
  isVaThuis: boolean
  parentPath: string
  listId: string
}

type PaneProps = {
  childItemId?: string
  isActive?: boolean
  options?: PageTreePaneOptions
}

function buildPagesQuery(
  isVaThuis: boolean | "all",
  parentPath: string,
): { query: string; params: Record<string, string> } {
  if (isVaThuis === "all") {
    return {
      query: `*[_type == "page"]{ _id, title, "slug": slug.current }`,
      params: {},
    }
  }

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

function formatPagePath(slug: string): string {
  if (slug === "/") return "/"
  return `/${slug}`
}

function usePages(isVaThuis: boolean | "all", parentPath: string) {
  const documentStore = useDocumentStore()
  const [pages, setPages] = useState<PageFolderEntry[] | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const { query, params } = buildPagesQuery(isVaThuis, parentPath)
    const subscription = documentStore
      .listenQuery(query, params, { apiVersion: API_VERSION })
      .subscribe({
        next: (result: PageFolderEntry[]) => {
          setPages(result)
          setError(null)
        },
        error: (err: unknown) => {
          setError(err instanceof Error ? err.message : "Could not load pages")
        },
      })

    return () => subscription.unsubscribe()
  }, [documentStore, isVaThuis, parentPath])

  return { pages, error }
}

function SearchField({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <Box
      paddingX={3}
      paddingBottom={3}
      style={{
        position: "sticky",
        top: 0,
        zIndex: 1,
        background: "var(--card-bg-color)",
      }}
    >
      <TextInput
        aria-label="Search pages"
        autoComplete="off"
        border={false}
        clearButton={value.length > 0}
        fontSize={[2, 2, 1]}
        icon={SearchIcon}
        onChange={(event) => onChange(event.currentTarget.value)}
        onClear={() => onChange("")}
        onKeyDown={(event) => {
          if (event.key === "Escape") onChange("")
        }}
        padding={2}
        placeholder="Search pages"
        radius={2}
        spellCheck={false}
        value={value}
      />
    </Box>
  )
}

function PaneRow({
  childId,
  title,
  subtitle,
  icon: Icon,
  selected,
  pressed,
}: {
  childId: string
  title: string
  subtitle?: string
  icon: typeof DocumentIcon
  selected: boolean
  pressed: boolean
}) {
  const { ChildLink } = usePaneRouter()

  return (
    <ChildLink
      childId={childId}
      style={{ display: "block", color: "inherit", textDecoration: "none" }}
    >
      <Card padding={2} radius={2} tone={selected || pressed ? "primary" : "default"}>
        <Flex align="center" gap={3}>
          <Text size={1}>
            <Icon />
          </Text>
          <Stack space={2}>
            <Text size={1} weight="medium" textOverflow="ellipsis">
              {title}
            </Text>
            {subtitle ? (
              <Text size={1} muted textOverflow="ellipsis">
                {subtitle}
              </Text>
            ) : null}
          </Stack>
        </Flex>
      </Card>
    </ChildLink>
  )
}

function EmptyMessage({ children }: { children: string }) {
  return (
    <Box paddingX={4} paddingY={5}>
      <Text align="center" muted size={1}>
        {children}
      </Text>
    </Box>
  )
}

export function PageTreePane(props: PaneProps) {
  const options = props.options
  const [query, setQuery] = useState("")
  const isVaThuis = options?.isVaThuis ?? false
  const parentPath = options?.parentPath ?? ""
  const { pages, error } = usePages(isVaThuis, parentPath)
  const childItemId = props.childItemId
  const isActive = props.isActive ?? false

  if (!options) {
    return <EmptyMessage>Page list is missing its scope.</EmptyMessage>
  }

  const matches = pages ? filterPagesByQuery(pages, query) : []
  const grouped = pages
    ? groupPagesByFolder(pages, { parentPath, isVaThuis })
    : undefined

  return (
    <Stack>
      <SearchField value={query} onChange={setQuery} />
      {error ? <EmptyMessage>{error}</EmptyMessage> : null}
      {!pages && !error ? <EmptyMessage>Loading pages…</EmptyMessage> : null}
      {pages && query.trim() ? (
        matches.length === 0 ? (
          <EmptyMessage>No pages found</EmptyMessage>
        ) : (
          <Stack paddingX={2} space={1}>
            {matches.map((page) => (
              <PaneRow
                key={page._id}
                childId={page._id}
                title={page.title || page.slug || "Untitled"}
                subtitle={page.slug ? formatPagePath(page.slug) : "No slug"}
                icon={page.slug ? DocumentIcon : WarningOutlineIcon}
                selected={isActive && childItemId === page._id}
                pressed={!isActive && childItemId === page._id}
              />
            ))}
          </Stack>
        )
      ) : null}
      {pages && !query.trim() && grouped ? (
        <TreeRows grouped={grouped} childItemId={childItemId} isActive={isActive} />
      ) : null}
    </Stack>
  )
}

function TreeRows({
  grouped,
  childItemId,
  isActive,
}: {
  grouped: ReturnType<typeof groupPagesByFolder>
  childItemId?: string
  isActive: boolean
}) {
  const rows: ReactNode[] = []

  if (grouped.currentPage) {
    const id = grouped.currentPage._id
    rows.push(
      <PaneRow
        key={`${id}-this-page`}
        childId={id}
        title={`This page: ${formatPagePath(grouped.currentPage.slug || "/")}`}
        icon={DocumentIcon}
        selected={isActive && childItemId === id}
        pressed={!isActive && childItemId === id}
      />,
    )
  }

  if (grouped.currentPage && grouped.children.length > 0) {
    rows.push(
      <Box key="tree-divider" paddingY={2}>
        <Box style={{ borderTop: "1px solid var(--card-border-color)" }} />
      </Box>,
    )
  }

  for (const child of grouped.children) {
    if (child.hasDescendants) {
      const childId = folderChildId(child.path)
      rows.push(
        <PaneRow
          key={childId}
          childId={childId}
          title={child.segment}
          icon={FolderIcon}
          selected={isActive && childItemId === childId}
          pressed={!isActive && childItemId === childId}
        />,
      )
      continue
    }

    if (child.page) {
      rows.push(
        <PaneRow
          key={child.page._id}
          childId={child.page._id}
          title={child.page.title || child.page.slug || child.segment}
          icon={DocumentIcon}
          selected={isActive && childItemId === child.page._id}
          pressed={!isActive && childItemId === child.page._id}
        />,
      )
    }
  }

  if (grouped.missingSlug.length > 0) {
    rows.push(
      <Box key="missing-divider" paddingY={2}>
        <Box style={{ borderTop: "1px solid var(--card-border-color)" }} />
      </Box>,
    )
    for (const page of grouped.missingSlug) {
      rows.push(
        <PaneRow
          key={`${page._id}-missing`}
          childId={page._id}
          title={page.title || "Untitled (no slug)"}
          icon={WarningOutlineIcon}
          selected={isActive && childItemId === page._id}
          pressed={!isActive && childItemId === page._id}
        />,
      )
    }
  }

  if (rows.length === 0) {
    return <EmptyMessage>No pages yet</EmptyMessage>
  }

  return (
    <Stack paddingX={2} space={1}>
      {rows}
    </Stack>
  )
}

type PagesIndexProps = {
  childItemId?: string
  isActive?: boolean
}

export function PagesIndexPane(props: PagesIndexProps) {
  const [query, setQuery] = useState("")
  const { pages, error } = usePages("all", "")
  const childItemId = props.childItemId
  const isActive = props.isActive ?? false
  const matches = pages ? filterPagesByQuery(pages, query) : []
  const searching = query.trim().length > 0

  return (
    <Stack>
      <SearchField value={query} onChange={setQuery} />
      {error ? <EmptyMessage>{error}</EmptyMessage> : null}
      {!pages && !error ? <EmptyMessage>Loading pages…</EmptyMessage> : null}
      {searching ? (
        matches.length === 0 && pages ? (
          <EmptyMessage>No pages found</EmptyMessage>
        ) : (
          <Stack paddingX={2} space={1}>
            {matches.map((page) => (
              <PaneRow
                key={page._id}
                childId={page._id}
                title={page.title || page.slug || "Untitled"}
                subtitle={page.slug ? formatPagePath(page.slug) : "No slug"}
                icon={page.slug ? DocumentIcon : WarningOutlineIcon}
                selected={isActive && childItemId === page._id}
                pressed={!isActive && childItemId === page._id}
              />
            ))}
          </Stack>
        )
      ) : (
        <Stack paddingX={2} space={1}>
          <PaneRow
            childId={VA_PAGES_NAV_ID}
            title="VA pages"
            icon={DocumentsIcon}
            selected={isActive && childItemId === VA_PAGES_NAV_ID}
            pressed={!isActive && childItemId === VA_PAGES_NAV_ID}
          />
          <PaneRow
            childId={VA_THUIS_NAV_ID}
            title="VA Thuis pages"
            icon={DocumentsIcon}
            selected={isActive && childItemId === VA_THUIS_NAV_ID}
            pressed={!isActive && childItemId === VA_THUIS_NAV_ID}
          />
        </Stack>
      )}
    </Stack>
  )
}
