import { describe, expect, it } from "vitest"

import { resolveChaptersFromDescendantEpisodes } from "./audience-player"

describe("resolveChaptersFromDescendantEpisodes", () => {
  const embed = { projectId: 14, previewUrl: null, iframeUrl: null }

  it("groups episodes by parent_id and sorts by episode name", () => {
    const chapters = resolveChaptersFromDescendantEpisodes(
      [
        {
          id: 1462,
          name: "26BT0013_01",
          parent_id: 1461,
          metas: [{ key: "title", value: "Lesson B" }],
          assets: [{ id: 10, duration: 100 }],
        },
        {
          id: 1463,
          name: "26BT0013_00",
          parent_id: 1461,
          metas: [{ key: "title", value: "Introductie" }],
          assets: [{ id: 11, duration: 50 }],
        },
      ],
      embed,
      new Map([[1461, "Hoofdstuk Cupido"]])
    )

    expect(chapters).toHaveLength(1)
    expect(chapters[0]?.title).toBe("Hoofdstuk Cupido")
    expect(chapters[0]?.episodes.map((e) => e.title)).toEqual(["Introductie", "Lesson B"])
    expect(chapters[0]?.episodes[0]?.preview_available).toBe(true)
    expect(chapters[0]?.episodes[0]?.number).toBe(1)
    expect(chapters[0]?.episodes[0]?.chapter_number).toBe(1)
  })

  it("creates multiple chapters when episodes have different parent seasons", () => {
    const chapters = resolveChaptersFromDescendantEpisodes(
      [
        {
          id: 10,
          name: "a_2",
          parent_id: 200,
          metas: [{ key: "title", value: "Ep 2" }],
          assets: [{ id: 1, duration: 60 }],
        },
        {
          id: 9,
          name: "a_1",
          parent_id: 100,
          metas: [{ key: "title", value: "Ep 1" }],
          assets: [{ id: 2, duration: 60 }],
        },
      ],
      embed
    )

    expect(chapters).toHaveLength(2)
    expect(chapters[0]?.number).toBe(1)
    expect(chapters[1]?.number).toBe(2)
    expect(chapters[0]?.title).toBe("Hoofdstuk 1")
  })
})
