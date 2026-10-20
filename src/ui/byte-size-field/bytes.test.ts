import { describe, expect, it } from "vitest"
import { formatBytes, parseBytes } from "./bytes.js"

describe("byte sizes", () => {
  it("reads decimal and binary units", () => {
    expect(parseBytes("500 MB")).toBe(500_000_000)
    expect(parseBytes("1.5GB")).toBe(1_500_000_000)
    expect(parseBytes("2 GiB")).toBe(2_147_483_648)
    expect(parseBytes("750k")).toBe(750_000)
    expect(parseBytes("1,024 bytes")).toBe(1024)
    expect(parseBytes("500", { defaultUnit: "MB" })).toBe(500_000_000)
  })
  it("rejects anything else", () => {
    expect(parseBytes("lots")).toBeNull()
    expect(parseBytes("5 parsecs")).toBeNull()
    expect(parseBytes("")).toBeNull()
  })
  it("writes sizes with a thin space", () => {
    expect(formatBytes(1_500_000_000)).toBe("1.5 GB")
    expect(formatBytes(2_000_000_000)).toBe("2 GB")
    expect(formatBytes(2_147_483_648, { base: "binary" })).toBe("2 GiB")
    expect(formatBytes(512)).toBe("512 B")
    expect(parseBytes(formatBytes(7_800_000_000))).toBe(7_800_000_000)
  })
  it("writes and reads the locale's decimal mark", () => {
    expect(formatBytes(1_500_000_000, { locale: "de-DE" })).toBe("1,5\u2009GB")
    expect(parseBytes("1,5 GB", { locale: "de-DE" })).toBe(1_500_000_000)
    expect(parseBytes("1.024 bytes", { locale: "de-DE" })).toBe(1024)
    expect(parseBytes("1,5,5 GB", { locale: "de-DE" })).toBeNull()
  })
})
