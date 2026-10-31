import { describe, expect, it } from "vitest"
import {
  alphabetLayout,
  alternatesFor,
  defineKeyboardLayout,
  keyboardLayouts,
  layerRows,
  layoutForLocale,
  normalizeKey,
  resolveKeyboardLayout,
  rowUnits,
  shiftedText,
  type BuiltInLayoutId,
  type KeyboardLayout,
} from "./layouts.js"

const texts = (layout: KeyboardLayout, layer = "default", shifted = false) =>
  layerRows(layout, layer, shifted).map((row) => row.map((key) => (typeof key === "string" ? key : (key.text ?? key.action))))

describe("layoutForLocale", () => {
  it.each([
    ["de-DE", "qwertz"],
    ["de-CH", "qwertz"],
    ["fr", "azerty"],
    ["es-MX", "spanish"],
    ["pt-BR", "portuguese"],
    ["it", "italian"],
    ["sv", "nordic"],
    ["fi", "nordic"],
    ["nb", "norwegian"],
    ["da", "danish"],
    ["nl", "dutch"],
    ["ar-EG", "arabic"],
    ["he", "hebrew"],
    ["ru", "russian"],
    ["el", "greek"],
    ["ja", "kana"],
    ["ko-KR", "hangul"],
    ["zh-Hans", "qwerty"],
    ["en-AU", "qwerty"],
    ["xx", "qwerty"],
  ])("%s → %s", (locale, id) => {
    expect(layoutForLocale(locale).id).toBe(id)
  })

  it("returns the same objects each time", () => {
    expect(layoutForLocale("de")).toBe(keyboardLayouts.qwertz)
    expect(layoutForLocale("nb")).toBe(layoutForLocale("nn"))
  })
})

describe("built-in layouts", () => {
  const ids = Object.keys(keyboardLayouts) as BuiltInLayoutId[]

  it.each(ids)("%s has a default layer, a label and a locale", (id) => {
    const layout = keyboardLayouts[id]
    expect(layout.id).toBe(id)
    expect(layout.label).not.toBe("")
    expect(layout.layers.default.length).toBeGreaterThan(0)
    expect(Intl.getCanonicalLocales(layout.locale)).toHaveLength(1)
  })

  it.each(ids)("%s fills its rows: no row is wider than the widest letter row and reachable layers exist", (id) => {
    const layout = keyboardLayouts[id]
    for (const [name, rows] of Object.entries(layout.layers)) {
      const widest = Math.max(...(rows ?? []).map(rowUnits))
      for (const row of rows ?? []) {
        expect(rowUnits(row), `${id}/${name}`).toBeLessThanOrEqual(widest)
        for (const key of row) {
          const normal = normalizeKey(key)
          if (normal.action === "layer" || normal.action === "script") expect(layout.layers[normal.layer ?? "default"], `${id}/${name} → ${normal.layer}`).toBeDefined()
        }
      }
    }
  })

  it("lays out typing layouts on full-width rows", () => {
    for (const id of ["qwerty", "qwertz", "azerty", "russian", "arabic", "hangul"] as const) {
      const rows = keyboardLayouts[id].layers.default
      const units = Math.max(...rows.map(rowUnits))
      // The shift row and the bottom row span the keyboard; letter rows may be centred.
      expect(rowUnits(rows[2] ?? []), id).toBe(units)
      expect(rowUnits(rows[3] ?? []), id).toBe(units)
    }
  })

  it("has the standard letter rows", () => {
    expect(texts(keyboardLayouts.qwerty)[0]?.join("")).toBe("qwertyuiop")
    expect(texts(keyboardLayouts.qwertz)[0]?.join("")).toBe("qwertzuiopü")
    expect(texts(keyboardLayouts.azerty)[1]?.join("")).toBe("qsdfghjklm")
    expect(texts(keyboardLayouts.russian)[0]?.join("")).toBe("йцукенгшщзх")
    expect(texts(keyboardLayouts.arabic)[0]?.join("")).toBe("ضصثقفغعهخحجد")
    expect(texts(keyboardLayouts.hebrew)[0]?.slice(2).join("")).toBe("קראטוןםפ")
    expect(texts(keyboardLayouts.hangul)[0]?.join("")).toBe("ㅂㅈㄷㄱㅅㅛㅕㅑㅐㅔ")
    expect(texts(keyboardLayouts.kana)[0]?.join("")).toBe("あいうえおはひふへほ")
    expect(texts(keyboardLayouts.kana, "katakana")[0]?.join("")).toBe("アイウエオハヒフヘホ")
  })

  it("marks scripts that keep their printed geometry as physical", () => {
    expect(keyboardLayouts.arabic.arrangement).toBe("physical")
    expect(keyboardLayouts.hebrew.arrangement).toBe("physical")
    expect(keyboardLayouts.kana.arrangement).toBe("reading")
    expect(keyboardLayouts.alphabet.arrangement).toBe("reading")
  })

  it("builds number pads", () => {
    expect(texts(keyboardLayouts.numeric)).toEqual([["1", "2", "3"], ["4", "5", "6"], ["7", "8", "9"], ["clear", "0", "backspace"]])
    expect(texts(keyboardLayouts.pin)[3]).toEqual(["gap", "0", "backspace"])
    expect(keyboardLayouts.pin.masked).toBe(true)
    expect(alternatesFor(keyboardLayouts.phone, "0")).toEqual(["+"])
    expect(texts(resolveKeyboardLayout("decimal", "de-DE"))[3]?.[0]).toBe(",")
    expect(texts(resolveKeyboardLayout("decimal", "en-US"))[3]?.[0]).toBe(".")
    expect(resolveKeyboardLayout("decimal", "de")).toBe(resolveKeyboardLayout("decimal", "fr"))
  })

  it("offers domains on the email and url layouts", () => {
    const bottom = texts(keyboardLayouts.email)[3] ?? []
    expect(bottom).toContain("@")
    expect(bottom).toContain(".com")
    expect(texts(keyboardLayouts.url)[3]).toContain("/")
    expect(alternatesFor(keyboardLayouts.email, ".com")).toContain(".org")
  })
})

describe("shift", () => {
  it("derives upper case for single letters in the layout's language", () => {
    expect(texts(keyboardLayouts.qwerty, "default", true)[0]?.join("")).toBe("QWERTYUIOP")
    expect(shiftedText("ß", "de")).toBe("ß")
    expect(shiftedText("i", "tr")).toBe("İ")
    expect(shiftedText("ς", "el")).toBe("Σ")
    expect(shiftedText("1", "en")).toBe("1")
    // The bottom row is unchanged.
    expect(texts(keyboardLayouts.qwerty, "default", true)[3]).toEqual(texts(keyboardLayouts.qwerty)[3])
  })

  it("uses an explicit shift layer when the layout has one", () => {
    expect(texts(keyboardLayouts.hangul, "default", true)[0]?.join("")).toBe("ㅃㅉㄸㄲㅆㅛㅕㅑㅒㅖ")
    expect(texts(keyboardLayouts.arabic, "default", true)[1]?.[5]).toBe("أ")
  })

  it("ignores shift on other layers", () => {
    expect(texts(keyboardLayouts.qwerty, "symbols", true)).toEqual(texts(keyboardLayouts.qwerty, "symbols"))
  })

  it("offers upper-case alternates for upper-case letters", () => {
    expect(alternatesFor(keyboardLayouts.azerty, "e")[0]).toBe("é")
    expect(alternatesFor(keyboardLayouts.azerty, "E")[0]).toBe("É")
    expect(alternatesFor(keyboardLayouts.qwerty, "q")).toEqual([])
    expect(alternatesFor(keyboardLayouts.russian, "е")).toEqual(["ё"])
  })
})

describe("alphabetLayout", () => {
  const letters = (layout: KeyboardLayout) => texts(layout).slice(1).flat()

  it("puts Space and Backspace on top, then letters and digits in rows of six", () => {
    const layout = alphabetLayout("en")
    expect(layout.columns).toBe(6)
    expect(texts(layout)[0]).toEqual(["space", "backspace"])
    expect(letters(layout).slice(0, 6).join("")).toBe("abcdef")
    expect(letters(layout).slice(-10).join("")).toBe("1234567890")
    for (const row of layout.layers.default.slice(1)) expect(row.length).toBeLessThanOrEqual(6)
    expect(rowUnits(layout.layers.default[0] ?? [])).toBe(6)
  })

  it("adds each language's letters", () => {
    expect(letters(alphabetLayout("de-AT"))).toEqual(expect.arrayContaining(["ä", "ö", "ü", "ß"]))
    expect(letters(alphabetLayout("es")).indexOf("ñ")).toBe(letters(alphabetLayout("es")).indexOf("n") + 1)
    expect(letters(alphabetLayout("sv")).slice(26, 29).join("")).toBe("åäö")
    expect(letters(alphabetLayout("da")).slice(26, 29).join("")).toBe("æøå")
    expect(letters(alphabetLayout("nb")).slice(26, 29).join("")).toBe("æøå")
    expect(letters(alphabetLayout("ru"))[0]).toBe("а")
    expect(alphabetLayout("ja").id).toBe("kana")
    expect(alphabetLayout("ko").compose).toBe("hangul")
    expect(alphabetLayout("fr").label).toBe("Français")
    expect(alphabetLayout("xx").locale).toBe("en")
  })

  it("resolves the alphabet for the keyboard's locale", () => {
    expect(resolveKeyboardLayout("alphabet", "de").label).toBe("Deutsch")
    expect(resolveKeyboardLayout("alphabet", "de")).toBe(resolveKeyboardLayout("alphabet", "de-CH"))
    expect(resolveKeyboardLayout(undefined, "fr").id).toBe("azerty")
  })
})

describe("defineKeyboardLayout", () => {
  it("returns the layout", () => {
    const layout = defineKeyboardLayout({ id: "hex", label: "Hex", locale: "en", arrangement: "reading", columns: 4, layers: { default: [["0", "1", "2", "3"]] } })
    expect(layout.id).toBe("hex")
  })
})
