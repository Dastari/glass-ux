import { describe, expect, it } from "vitest"
import { describeMac, formatMac, macDigits, normaliseMac, ouiOf } from "./mac.js"

describe("MAC addresses", () => {
  it("accepts any separator", () => {
    for (const text of ["00:15:65:aa:bb:cc", "00-15-65-AA-BB-CC", "0015.65aa.bbcc", "001565aabbcc", "00 15 65 aa bb cc", " 0:15:65:aa:bb:cc "]) {
      expect(macDigits(text)).toBe("001565AABBCC")
    }
  })
  it("rejects mixed separators and wrong lengths", () => {
    expect(macDigits("00:15-65:aa:bb:cc")).toBeNull()
    expect(macDigits("00:15:65:aa:bb")).toBeNull()
    expect(macDigits("00:15:65:aa:bb:cc:dd")).toBeNull()
    expect(macDigits("zz:15:65:aa:bb:cc")).toBeNull()
  })
  it("writes one format", () => {
    expect(normaliseMac("0015.65aa.bbcc")).toBe("00:15:65:AA:BB:CC")
    expect(normaliseMac("00:15:65:aa:bb:cc", { format: "hyphen" })).toBe("00-15-65-AA-BB-CC")
    expect(normaliseMac("00:15:65:aa:bb:cc", { format: "dot", case: "lower" })).toBe("0015.65aa.bbcc")
    expect(formatMac("001565AABBCC", { format: "bare" })).toBe("001565AABBCC")
  })
  it("finds the vendor prefix and special addresses", () => {
    expect(ouiOf("001565AABBCC")).toBe("001565")
    expect(describeMac("001565AABBCC")).toBeNull()
    expect(describeMac("DAA1192B3C4D")).toMatch(/Locally administered/)
    expect(describeMac("FFFFFFFFFFFF")).toBe("Broadcast address")
    expect(describeMac("01005E000001")).toBe("Multicast address")
  })
})
