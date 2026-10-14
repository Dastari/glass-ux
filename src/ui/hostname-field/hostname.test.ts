import { describe, expect, it } from "vitest"
import { hostOf, normaliseDomain, normaliseHostname, parseDomain, parseHostname } from "./hostname.js"

describe("host names", () => {
  it("accepts single labels and dotted names, keeping case", () => {
    expect(normaliseHostname("NST-C106")).toBe("NST-C106")
    expect(normaliseHostname("printer.northstar.local.")).toBe("printer.northstar.local")
  })
  it("requires a dot when asked", () => {
    expect(parseHostname("NST-C106", { fqdn: true }).ok).toBe(false)
  })
  it("rejects bad labels with a reason", () => {
    const hyphen = parseHostname("-bad.example")
    expect(hyphen.ok).toBe(false)
    if (!hyphen.ok) expect(hyphen.error).toMatch(/hyphen/)
    expect(parseHostname("bad_host").ok).toBe(false)
    expect(parseHostname("a".repeat(64)).ok).toBe(false)
  })
  it("takes the host out of a pasted URL", () => {
    expect(hostOf("https://admin@northstar.example:8443/about?x=1")).toBe("northstar.example")
    expect(normaliseDomain("https://NORTHSTAR.example/about")).toBe("northstar.example")
  })
})

describe("domains", () => {
  it("needs two labels and an alphabetic TLD", () => {
    expect(parseDomain("localhost").ok).toBe(false)
    expect(parseDomain("10.0.0.1").ok).toBe(false)
    expect(normaliseDomain("orbit.example")).toBe("orbit.example")
  })
  it("allows a wildcard only when asked", () => {
    expect(parseDomain("*.northstar.example").ok).toBe(false)
    expect(normaliseDomain("*.northstar.example", { wildcard: true })).toBe("*.northstar.example")
  })
  it("converts Unicode to punycode", () => {
    expect(normaliseDomain("bücher.de")).toBe("xn--bcher-kva.de")
  })
})
