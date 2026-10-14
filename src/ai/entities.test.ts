import { describe, expect, it } from "vitest"
import { IconLink } from "../icons/generated/icons.js"
import { defineEntityKinds, entityHref, parseEntityHref, safeExternalHref } from "./entities.js"

const kinds = defineEntityKinds({ endpoint: { icon: IconLink, noun: "Endpoint", plural: "Endpoints", segment: "endpoints" } })

describe("entity links", () => {
  it("recognises internal entity paths", () => {
    expect(parseEntityHref(kinds, "/endpoints/NST-C106")).toEqual({ kind: "endpoint", id: "NST-C106" })
    expect(parseEntityHref(kinds, "/endpoints/NST-C106/activity")).toBeNull()
    expect(parseEntityHref(kinds, "//evil.example/endpoints/x")).toBeNull()
    expect(parseEntityHref(kinds, "/unknown/x")).toBeNull()
  })

  it("round-trips ids with reserved characters", () => {
    const href = entityHref(kinds, { kind: "endpoint", id: "ORB 4E5E/1" })
    expect(parseEntityHref(kinds, href)).toEqual({ kind: "endpoint", id: "ORB 4E5E/1" })
  })

  it("only lets https links leave", () => {
    expect(safeExternalHref("https://learn.microsoft.com/x")).toBe("https://learn.microsoft.com/x")
    expect(safeExternalHref("http://example.com")).toBeNull()
    expect(safeExternalHref("javascript:alert(1)")).toBeNull()
    expect(safeExternalHref("https://user:pass@example.com")).toBeNull()
  })
})
