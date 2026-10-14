import { describe, expect, it } from "vitest"
import { describeAccept, describeRejections, formatBytes, matchesAccept, screenFiles } from "./files.js"

const file = (name: string, size: number, type = "") => new File([new Uint8Array(0)], name, { type }) as File & { size: number }
const sized = (name: string, size: number, type = "") => {
  const f = file(name, size, type)
  Object.defineProperty(f, "size", { value: size })
  return f
}

describe("formatBytes", () => {
  it("uses binary units with a thin space", () => {
    expect(formatBytes(0)).toBe("0 B")
    expect(formatBytes(812 * 1024)).toBe("812 KB")
    expect(formatBytes(24.6 * 1024 * 1024)).toBe("24.6 MB")
    expect(formatBytes(500 * 1024 * 1024)).toBe("500 MB")
    expect(formatBytes(-1)).toBe("0 B")
  })
})

describe("matchesAccept", () => {
  it("matches extensions, exact types and wildcards", () => {
    expect(matchesAccept({ name: "Setup.MSI", type: "" }, ".msi,.exe")).toBe(true)
    expect(matchesAccept({ name: "notes.txt", type: "text/plain" }, ".msi,.exe")).toBe(false)
    expect(matchesAccept({ name: "a.png", type: "image/png" }, "image/*")).toBe(true)
    expect(matchesAccept({ name: "a.zip", type: "application/zip" }, "application/zip")).toBe(true)
    expect(matchesAccept({ name: "anything", type: "" }, undefined)).toBe(true)
  })
  it("describes the accepted types", () => {
    expect(describeAccept(".msi,.exe")).toBe(".msi or .exe")
    expect(describeAccept(".msi, .exe, .zip")).toBe(".msi, .exe or .zip")
    expect(describeAccept("image/*")).toBe("image files")
  })
})

describe("screenFiles", () => {
  it("refuses wrong types, oversize files and files past the limit, with reasons", () => {
    const { accepted, rejected } = screenFiles(
      [sized("a.msi", 10), sized("b.txt", 10), sized("c.exe", 600), sized("d.msi", 10), sized("e.msi", 10)],
      { accept: ".msi,.exe", maxSize: 500, maxFiles: 3, existing: 1 }
    )
    expect(accepted.map((f) => f.name)).toEqual(["a.msi", "d.msi"])
    expect(rejected.map((r) => r.reason)).toEqual(["type", "size", "count"])
    expect(rejected[0]?.message).toBe("b.txt is not a .msi or .exe file")
    expect(rejected[1]?.message).toBe("c.exe is larger than 500 B")
    expect(describeRejections(rejected)).toBe("b.txt is not a .msi or .exe file · 2 more not added")
    expect(describeRejections([])).toBeUndefined()
  })
})
