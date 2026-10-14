import { describe, expect, it } from "vitest"
import { normaliseUrl, parseUrl } from "./url.js"

describe("URLs", () => {
  it("adds the scheme people leave off", () => {
    const result = parseUrl("northstar.example/portal")
    expect(result.ok && result.value).toBe("https://northstar.example/portal")
    expect(result.ok && result.addedScheme).toBe(true)
    expect(normaliseUrl("printer.northstar.local:631")).toBe("https://printer.northstar.local:631")
    expect(normaliseUrl("//northstar.example")).toBe("https://northstar.example")
  })
  it("normalises case, default ports and the bare slash", () => {
    expect(normaliseUrl("HTTP://Printer.Northstar.local:80/")).toBe("http://printer.northstar.local")
    expect(normaliseUrl("https://northstar.example/About?x=1")).toBe("https://northstar.example/About?x=1")
  })
  it("refuses schemes that are not links", () => {
    expect(parseUrl("javascript:alert(1)").ok).toBe(false)
    expect(parseUrl("ftp://files.example.com").ok).toBe(false)
    expect(normaliseUrl("ftp://files.example.com", { schemes: ["ftp"] })).toBe("ftp://files.example.com")
  })
  it("wants a full host unless told otherwise", () => {
    expect(parseUrl("https://intranet").ok).toBe(false)
    expect(normaliseUrl("https://intranet", { requireTld: false })).toBe("https://intranet")
    expect(normaliseUrl("http://10.13.4.1:8080")).toBe("http://10.13.4.1:8080")
    expect(normaliseUrl("http://localhost:3000")).toBe("http://localhost:3000")
  })
})
