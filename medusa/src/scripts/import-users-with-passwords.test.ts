import { describe, expect, it } from "vitest"

import { parseCsvRows, rowsFromCsv } from "./import-users-with-passwords"

describe("import-users-with-passwords CSV", () => {
  it("parses quoted fields containing $ and +", () => {
    const content = `email,password,is_active
"a@b.nl","pbkdf2_sha256$150000$salt$abc+def=",true`
    const rows = rowsFromCsv(content)
    expect(rows).toHaveLength(1)
    expect(rows[0].email).toBe("a@b.nl")
    expect(rows[0].passwordHash).toContain("abc+def=")
  })

  it("keeps only active rows with pbkdf2 hashes", () => {
    const content = `last_login,is_active,sfid,id,password,username,email
2024-01-01,false,,1,pbkdf2_sha256$x,off,off@b.nl
2024-01-01,TRUE,003SF,2,pbkdf2_sha256$150000$salt$hash=,alice,alice@b.nl
2024-01-01,true,,3,not_pbkdf2,bob,bob@b.nl`
    const rows = rowsFromCsv(content)
    expect(rows.map((r) => r.email)).toEqual(["alice@b.nl"])
    expect(rows[0].sfid).toBe("003SF")
    expect(rows[0].username).toBe("alice")
  })

  it("dedupes same email by latest last_login and accepts username as email", () => {
    const content = `last_login,is_active,sfid,id,password,username,email
,x,003A,1,pbkdf2_sha256$150000$old$oldhash=,Mick@b.nl,
2024-06-01,TRUE,003B,2,pbkdf2_sha256$150000$new$newhash=,mick@b.nl,mick@b.nl`
    const rows = rowsFromCsv(content)
    expect(rows).toHaveLength(1)
    expect(rows[0].email).toBe("mick@b.nl")
    expect(rows[0].passwordHash).toContain("$new$")
    expect(rows[0].lastLoginMs).toBeGreaterThan(0)
  })

  it("parseCsvRows handles embedded commas in quotes", () => {
    const matrix = parseCsvRows('"a","b,c",d\n1,2,3')
    expect(matrix).toHaveLength(2)
    expect(matrix[0]).toEqual(["a", "b,c", "d"])
  })
})
