import { beforeAll, describe, expect, it } from "vitest"
import fr from "../../i18n/fr.js"
import { registerMessagePack } from "../../lib/i18n/index.js"
import { formatBytes as formatChartBytes } from "../charts/core/format.js"
import { formatBytes as formatFileBytes } from "../file-drop/files.js"
import { formatBytes, parseBytes } from "./bytes.js"
import { formatByteSize } from "./units.js"

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

describe("sizes in other languages", () => {
  beforeAll(() => registerMessagePack(fr))

  it("writes the unit symbols the language uses", () => {
    expect(formatBytes(1_500_000_000, { locale: "fr" })).toBe("1,5\u2009Go")
    expect(formatBytes(512, { locale: "fr" })).toBe("512\u2009o")
    expect(formatBytes(2_048, { base: "binary", locale: "fr" })).toBe("2\u2009Kio")
    expect(formatFileBytes(24.6 * 1024 * 1024, "fr")).toBe("24,6\u2009Mo")
    expect(formatChartBytes(1.8 * 1024 ** 3, "fr")).toBe("1,8\u2009Go")
    expect(formatByteSize(1500, { locale: "fr", symbols: "si" })).toBe("1,5\u2009ko")
  })

  it("reads the language's symbols back", () => {
    expect(parseBytes("1,5 Go", { locale: "fr" })).toBe(1_500_000_000)
    expect(parseBytes("2 Kio", { locale: "fr" })).toBe(2_048)
    expect(parseBytes("512 o", { locale: "fr" })).toBe(512)
    expect(parseBytes("1,5 GB", { locale: "fr" })).toBe(1_500_000_000)
  })

  it("reads what Arabic-Indic digits wrote", () => {
    const written = formatBytes(1_234_500_000, { locale: "ar-EG", decimals: 4 })
    expect(written).toMatch(/^[\u0660-\u0669]/)
    expect(written).toContain("\u066b")
    expect(parseBytes(written, { locale: "ar-EG" })).toBe(1_234_500_000)
    expect(parseBytes("١٢٣٬٤٥٦ B", { locale: "ar-EG" })).toBe(123_456)
    expect(parseBytes("١٫٥ GB", { locale: "ar-EG" })).toBe(1_500_000_000)
    expect(parseBytes("lots", { locale: "ar-EG" })).toBeNull()
  })
})

describe("one size formatter", () => {
  it("keeps each caller's English output", () => {
    expect(formatFileBytes(812 * 1024, "en-US")).toBe("812\u2009KB")
    expect(formatFileBytes(-5, "en-US")).toBe("0\u2009B")
    expect(formatFileBytes(Number.NaN, "en-US")).toBe("0\u2009B")
    expect(formatFileBytes(5 * 1024 ** 5, "en-US")).toBe("5,120\u2009TB")
    expect(formatChartBytes(5 * 1024 ** 5, "en-US")).toBe("5\u2009PB")
    expect(formatChartBytes(-1.8 * 1024 ** 3, "en-US")).toBe("−1.8\u2009GB")
    expect(formatChartBytes(Number.NaN, "en-US")).toBe("—")
    expect(formatChartBytes(640 * 1024 ** 2, "en-US")).toBe("640\u2009MB")
    expect(formatBytes(-1_500, { locale: "en-US" })).toBe("−1.5\u2009kB")
  })
})
