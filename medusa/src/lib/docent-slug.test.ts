import { describe, expect, it } from "vitest"

import { isDocentSlugInSync, pickDocentSlug, slugifyDocentName } from "./docent-slug"

describe("docent slug", () => {
  it("slugifies names without diacritics", () => {
    expect(slugifyDocentName("Renée van der Elst")).toBe("renee-van-der-elst")
  })

  it("detects slugs that do not follow the name", () => {
    expect(isDocentSlugInSync("camus", "Annette van der Elst")).toBe(false)
    expect(isDocentSlugInSync("krzysztof-dobrowolski", "Peter van Duinen")).toBe(false)
    expect(isDocentSlugInSync("krzysztof-dobrowolski-9miaaj", "Krzysztof Dobrowolski-Onclin")).toBe(false)
  })

  it("accepts clean and suffixed slugs", () => {
    expect(isDocentSlugInSync("annette-van-der-elst", "Annette van der Elst")).toBe(true)
    expect(isDocentSlugInSync("annette-van-der-elst-abc123", "Annette van der Elst")).toBe(true)
    expect(isDocentSlugInSync("jan-bakker", "Jan Bakker")).toBe(true)
  })

  it("picks a free slug", () => {
    const taken = new Set(["peter-van-duinen", "peter-van-duinen-abc123"])
    expect(pickDocentSlug("Peter van Duinen", "xyzabc", (s) => taken.has(s))).toBe(
      "peter-van-duinen-xyzabc"
    )
    expect(pickDocentSlug("Nieuw Persoon", "xyzabc", (s) => taken.has(s))).toBe("nieuw-persoon")
  })
})
