import { describe, expect, it } from "vitest"
import { organisationCode } from "./session-nav.js"

describe("organisationCode", () => {
  it("takes the initials of the significant words, at most four", () => {
    expect(organisationCode("Northstar Studio")).toBe("NS")
    expect(organisationCode("Cedar Vale Collective")).toBe("CVC")
    expect(organisationCode("Orbit Workspace")).toBe("OW")
    expect(organisationCode("Council of the Arts and Crafts Tasmania")).toBe("CACT")
  })
  it("keeps the first three letters of a one-word name", () => {
    expect(organisationCode("Kyeema")).toBe("KYE")
  })
})
