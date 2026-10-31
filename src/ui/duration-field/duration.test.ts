import { beforeAll, describe, expect, it } from "vitest"
import ar from "../../i18n/ar.js"
import de from "../../i18n/de.js"
import fr from "../../i18n/fr.js"
import ja from "../../i18n/ja.js"
import { registerMessagePack } from "../../lib/i18n/index.js"
import { formatDuration, parseDuration } from "./duration.js"

describe("durations", () => {
  it("reads what people write", () => {
    expect(parseDuration("1h 30m")).toBe(5400)
    expect(parseDuration("1h30m")).toBe(5400)
    expect(parseDuration("1.5h")).toBe(5400)
    expect(parseDuration("90")).toBe(5400)
    expect(parseDuration("90", { defaultUnit: "s" })).toBe(90)
    expect(parseDuration("1:30")).toBe(5400)
    expect(parseDuration("1:30:15")).toBe(5415)
    expect(parseDuration("2 days 4 hrs")).toBe(187200)
    expect(parseDuration("1 hour and 15 minutes")).toBe(4500)
    expect(parseDuration("1w")).toBe(604800)
    expect(parseDuration("45s")).toBe(45)
  })
  it("rejects anything else", () => {
    expect(parseDuration("")).toBeNull()
    expect(parseDuration("soon")).toBeNull()
    expect(parseDuration("1h foo")).toBeNull()
    expect(parseDuration("1h 2h")).toBeNull()
    expect(parseDuration("1:75")).toBeNull()
  })
  it("writes durations compactly or in words", () => {
    expect(formatDuration(5400)).toBe("1h 30m")
    expect(formatDuration(187200)).toBe("2d 4h")
    expect(formatDuration(45)).toBe("45s")
    expect(formatDuration(0)).toBe("0s")
    expect(formatDuration(5415, { units: ["h", "m"] })).toBe("1h 30m")
    expect(formatDuration(0, { units: ["h", "m"] })).toBe("0m")
    expect(formatDuration(5400, { style: "long" })).toBe("1 hour 30 minutes")
    expect(parseDuration(formatDuration(93784))).toBe(93784)
  })
})

describe("durations in other languages", () => {
  beforeAll(() => {
    for (const pack of [ar, de, fr, ja]) registerMessagePack(pack)
  })

  it("reads each language's unit words, with English still accepted", () => {
    expect(parseDuration("1 Std. 30 Min.", { locale: "de" })).toBe(5400)
    expect(parseDuration("1 Stunde und 15 Minuten", { locale: "de" })).toBe(4500)
    expect(parseDuration("1,5 Std.", { locale: "de" })).toBe(5400)
    expect(parseDuration("2 Tage, 4 Stunden", { locale: "de" })).toBe(187200)
    expect(parseDuration("1 heure et 15 minutes", { locale: "fr" })).toBe(4500)
    expect(parseDuration("1h30", { locale: "fr" })).toBeNull()
    expect(parseDuration("2 j 4 h", { locale: "fr" })).toBe(187200)
    expect(parseDuration("1時間30分", { locale: "ja" })).toBe(5400)
    expect(parseDuration("1時間と15分", { locale: "ja" })).toBe(4500)
    expect(parseDuration("1 hour 30 minutes", { locale: "de" })).toBe(5400)
    expect(parseDuration("1h 30m", { locale: "ja" })).toBe(5400)
    expect(parseDuration("1:30", { locale: "de" })).toBe(5400)
    expect(parseDuration("soon", { locale: "de" })).toBeNull()
    expect(parseDuration("1 Std. foo", { locale: "de" })).toBeNull()
  })

  it("reads Arabic-Indic digits and attached joining words", () => {
    expect(parseDuration("١ ساعة و٣٠ دقيقة", { locale: "ar-EG" })).toBe(5400)
    expect(parseDuration("٩٠", { locale: "ar-EG" })).toBe(5400)
    // Words that carry their own count: "ساعة" is one hour, Hebrew "יומיים" two days.
    expect(parseDuration("ساعة و30 دقيقة", { locale: "ar" })).toBe(5400)
    expect(parseDuration("יומיים, 4 שעות", { locale: "he" })).toBe(187200)
    expect(parseDuration("hour", { locale: "en" })).toBeNull()
  })

  it("keeps English notation exact and writes other languages with the runtime's words", () => {
    expect(formatDuration(5400, { locale: "en-GB" })).toBe("1h 30m")
    expect(formatDuration(5400, { locale: "en-GB", style: "long" })).toBe("1 hour 30 minutes")
    expect(formatDuration(0, { locale: "en-GB" })).toBe("0s")
    if (typeof (Intl as { DurationFormat?: unknown }).DurationFormat === "function") {
      expect(formatDuration(5400, { locale: "de", style: "long" })).toBe("1 Stunde, 30 Minuten")
      expect(formatDuration(0, { locale: "de", units: ["h", "m"] })).toBe("0 Min.")
      expect(formatDuration(-5400, { locale: "ja" })).toMatch(/^−1/)
    }
  })

  it("reads back what it writes", () => {
    for (const locale of ["de", "fr", "ja", "ko", "zh-Hans", "es", "it", "nl", "pt-BR", "ar", "he"]) {
      for (const seconds of [0, 45, 5400, 187200, 93784]) {
        for (const style of ["short", "long"] as const) {
          const written = formatDuration(seconds, { locale, style })
          expect(parseDuration(written, { locale }), `${locale} ${style} "${written}"`).toBe(seconds === 0 ? 0 : seconds)
        }
      }
    }
  })
})
