import { describe, expect, it } from "vitest"
import { editDistance, normaliseEmail, parseEmail, suggestEmail } from "./email.js"

describe("email", () => {
  it("validates and lower-cases the domain", () => {
    expect(normaliseEmail(" Avery.Martin@orbit.example ")).toBe("Avery.Martin@orbit.example")
    expect(normaliseEmail("mailto:avery@northstar.example")).toBe("avery@northstar.example")
    expect(normaliseEmail("avery+alerts@gmail.com")).toBe("avery+alerts@gmail.com")
  })
  it("rejects what mail systems would", () => {
    for (const text of ["avery", "avery@", "@gmail.com", "avery@gmail", "avery@@gmail.com", "to..by@gmail.com", ".avery@gmail.com", "avery@-gmail.com", "avery@gmail.c"]) {
      expect(parseEmail(text).ok, text).toBe(false)
    }
  })
  it("suggests the domain someone meant", () => {
    expect(suggestEmail("avery@gmial.com")).toBe("avery@gmail.com")
    expect(suggestEmail("avery@gmail.co")).toBe("avery@gmail.com")
    expect(suggestEmail("avery@hotmial.com")).toBe("avery@hotmail.com")
    expect(suggestEmail("avery@bigpond.con")).toBe("avery@bigpond.com")
    expect(suggestEmail("avery@example.com.ua")).toBe("avery@example.com.au")
    expect(suggestEmail("mira@northstar.examplf", ["northstar.example"])).toBe("mira@northstar.example")
  })
  it("stays quiet for correct and unrelated domains", () => {
    expect(suggestEmail("avery@gmail.com")).toBeNull()
    expect(suggestEmail("avery@orbit.example")).toBeNull()
    expect(suggestEmail("avery")).toBeNull()
  })
  it("measures edits with swaps as one", () => {
    expect(editDistance("gmial", "gmail")).toBe(1)
    expect(editDistance("abc", "abc")).toBe(0)
    expect(editDistance("", "abc")).toBe(3)
  })
})
