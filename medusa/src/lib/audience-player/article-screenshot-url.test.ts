import { describe, expect, it } from "vitest"

import { pickAssetScreenshotUrl } from "./article-screenshot-url"

describe("pickAssetScreenshotUrl", () => {
  it("returns null when assets are missing", () => {
    expect(pickAssetScreenshotUrl(undefined, 1)).toBeNull()
    expect(pickAssetScreenshotUrl([], 1)).toBeNull()
  })

  it("returns null when the asset has no screenshots", () => {
    expect(
      pickAssetScreenshotUrl([{ id: 1, screenshots: [] }], 1)
    ).toBeNull()
  })

  it("picks the widest screenshot for the matching asset", () => {
    expect(
      pickAssetScreenshotUrl(
        [
          {
            id: 135,
            screenshots: [
              { url: "https://cdn.example/small.jpg", width: 640 },
              { url: "https://cdn.example/large.jpg", width: 1920 },
            ],
          },
        ],
        135
      )
    ).toBe("https://cdn.example/large.jpg")
  })

  it("ignores other assets", () => {
    expect(
      pickAssetScreenshotUrl(
        [
          { id: 74, screenshots: [{ url: "https://cdn.example/other.jpg" }] },
          { id: 135, screenshots: [{ url: "https://cdn.example/target.jpg" }] },
        ],
        135
      )
    ).toBe("https://cdn.example/target.jpg")
  })
})
