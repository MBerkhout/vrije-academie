import { describe, expect, it } from "vitest"
import {
  dedupePagesBySlug,
  encodeFolderPath,
  decodeFolderPath,
  getRootParentPath,
  groupPagesByFolder,
  type PageFolderEntry,
} from "../page-folder-tree"

const pages = (entries: Array<[string, string, string?]>): PageFolderEntry[] =>
  entries.map(([slug, title, id]) => ({
    _id: id ?? slug.replace(/\//g, "-"),
    title,
    slug,
  }))

describe("dedupePagesBySlug", () => {
  it("prefers published ids over draft ids for the same slug", () => {
    const result = dedupePagesBySlug([
      { _id: "drafts.page-over-ons", title: "Draft", slug: "over-ons" },
      { _id: "page-over-ons", title: "Published", slug: "over-ons" },
    ])

    expect(result).toHaveLength(1)
    expect(result[0]?.title).toBe("Published")
    expect(result[0]?._id).toBe("page-over-ons")
  })
})

describe("encodeFolderPath", () => {
  it("encodes slashes and handles root", () => {
    expect(encodeFolderPath("")).toBe("root")
    expect(encodeFolderPath("over-ons")).toBe("over-ons")
    expect(encodeFolderPath("over-ons/team")).toBe("over-ons~team")
  })

  it("round-trips through decodeFolderPath", () => {
    expect(decodeFolderPath(encodeFolderPath("over-ons/team"))).toBe("over-ons/team")
    expect(decodeFolderPath("root")).toBe("")
  })
})

describe("getRootParentPath", () => {
  it("uses empty path for VA and va-thuis for VA Thuis", () => {
    expect(getRootParentPath(false)).toBe("")
    expect(getRootParentPath(true)).toBe("va-thuis")
  })
})

describe("groupPagesByFolder", () => {
  it("shows homepage as current page at VA root", () => {
    const result = groupPagesByFolder(
      pages([["/", "Home"], ["contact", "Contact"]]),
      { parentPath: "", isVaThuis: false },
    )

    expect(result.currentPage?.slug).toBe("/")
    expect(result.children).toEqual([
      expect.objectContaining({ segment: "contact", path: "contact", hasDescendants: false }),
    ])
  })

  it("creates folders for nested slugs and leaves for top-level pages", () => {
    const result = groupPagesByFolder(
      pages([
        ["over-ons", "Over ons"],
        ["over-ons/team", "Team"],
        ["contact", "Contact"],
      ]),
      { parentPath: "", isVaThuis: false },
    )

    expect(result.children).toEqual([
      expect.objectContaining({
        segment: "contact",
        path: "contact",
        hasDescendants: false,
        page: expect.objectContaining({ slug: "contact" }),
      }),
      expect.objectContaining({
        segment: "over-ons",
        path: "over-ons",
        hasDescendants: true,
        page: expect.objectContaining({ slug: "over-ons" }),
      }),
    ])
  })

  it("supports virtual folders when only nested pages exist", () => {
    const result = groupPagesByFolder(pages([["over-ons/team", "Team"]]), {
      parentPath: "",
      isVaThuis: false,
    })

    expect(result.currentPage).toBeUndefined()
    expect(result.children).toEqual([
      expect.objectContaining({
        segment: "over-ons",
        path: "over-ons",
        hasDescendants: true,
        page: undefined,
      }),
    ])
  })

  it("groups nested pages under their parent folder", () => {
    const dataset = pages([
      ["over-ons", "Over ons"],
      ["over-ons/team", "Team"],
      ["over-ons/team/bio", "Bio"],
    ])

    const root = groupPagesByFolder(dataset, { parentPath: "", isVaThuis: false })
    const overOns = groupPagesByFolder(dataset, { parentPath: "over-ons", isVaThuis: false })
    const team = groupPagesByFolder(dataset, { parentPath: "over-ons/team", isVaThuis: false })

    expect(root.children[0]).toMatchObject({
      segment: "over-ons",
      hasDescendants: true,
    })
    expect(overOns.currentPage?.slug).toBe("over-ons")
    expect(overOns.children).toEqual([
      expect.objectContaining({
        segment: "team",
        path: "over-ons/team",
        hasDescendants: true,
      }),
    ])
    expect(team.currentPage?.slug).toBe("over-ons/team")
    expect(team.children).toEqual([
      expect.objectContaining({
        segment: "bio",
        path: "over-ons/team/bio",
        hasDescendants: false,
      }),
    ])
  })

  it("treats va-thuis as root for VA Thuis pages", () => {
    const dataset = pages([
      ["va-thuis", "VA Thuis"],
      ["va-thuis/about", "About"],
      ["va-thuis/about/team", "Team"],
    ])

    const root = groupPagesByFolder(dataset, { parentPath: "va-thuis", isVaThuis: true })
    const about = groupPagesByFolder(dataset, { parentPath: "va-thuis/about", isVaThuis: true })

    expect(root.currentPage?.slug).toBe("va-thuis")
    expect(root.children).toEqual([
      expect.objectContaining({
        segment: "about",
        path: "va-thuis/about",
        hasDescendants: true,
      }),
    ])
    expect(about.currentPage?.slug).toBe("va-thuis/about")
    expect(about.children).toEqual([
      expect.objectContaining({
        segment: "team",
        path: "va-thuis/about/team",
        hasDescendants: false,
      }),
    ])
  })
})
