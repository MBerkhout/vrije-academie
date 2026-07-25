import { describe, expect, it } from "vitest"

import { parseDjangoPbkdf2, verifyDjangoPbkdf2Password } from "./django-pbkdf2"

const SAMPLE_HASH =
  "pbkdf2_sha256$150000$L1HYAziUX37G$DYy9VQaENqqZKFO0IfA5WITGXVs+olzu0hscyn2Zac0="

describe("parseDjangoPbkdf2", () => {
  it("parses a valid Django PBKDF2 hash", () => {
    const parsed = parseDjangoPbkdf2(SAMPLE_HASH)
    expect(parsed).not.toBeNull()
    expect(parsed?.algorithm).toBe("pbkdf2_sha256")
    expect(parsed?.iterations).toBe(150000)
    expect(parsed?.salt).toBe("L1HYAziUX37G")
    expect(parsed?.hash.length).toBeGreaterThan(0)
  })

  it("rejects malformed encodings", () => {
    expect(parseDjangoPbkdf2("")).toBeNull()
    expect(parseDjangoPbkdf2("bcrypt$foo")).toBeNull()
    expect(parseDjangoPbkdf2("pbkdf2_sha256$0$salt$hash")).toBeNull()
    expect(parseDjangoPbkdf2("pbkdf2_sha256$150000$salt")).toBeNull()
  })
})

describe("verifyDjangoPbkdf2Password", () => {
  it("rejects wrong passwords for a valid hash", () => {
    expect(verifyDjangoPbkdf2Password("wrong-password", SAMPLE_HASH)).toBe(false)
    expect(verifyDjangoPbkdf2Password("", SAMPLE_HASH)).toBe(false)
  })

  it("rejects invalid hash strings", () => {
    expect(verifyDjangoPbkdf2Password("any", "not-a-hash")).toBe(false)
  })
})
