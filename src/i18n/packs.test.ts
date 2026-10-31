import { describe, expect, it } from "vitest"
import { registeredMessages, type MessagePack, type MessageSet } from "../lib/i18n/index.js"
import de from "./de.js"
import fr from "./fr.js"
import es from "./es.js"
import itPack from "./it.js"
import ptBR from "./pt-BR.js"
import nl from "./nl.js"
import ja from "./ja.js"
import zhHans from "./zh-Hans.js"
import ko from "./ko.js"
import ar from "./ar.js"
import he from "./he.js"

// Load every library descriptor, including ones whose components have not rendered yet.
import.meta.glob("../{ui,shell,windows,ai}/**/*messages.ts", { eager: true })

const packs = [de, fr, es, itPack, ptBR, nl, ja, zhHans, ko, ar, he]

describe("shipped language packs", () => {
  it.each(packs)("$locale covers exactly the loaded English catalogue", (pack: MessagePack) => {
    const defaults = registeredMessages()
    const actual = pack.messages as Record<string, MessageSet>
    let keys = 0
    let covered = 0
    expect([...defaults.keys()].length).toBeGreaterThan(4)
    expect(Object.keys(actual).sort()).toEqual([...defaults.keys()].sort())
    for (const [namespace, descriptor] of defaults) {
      const translated = actual[namespace] ?? {}
      expect(Object.keys(translated).sort(), `${pack.locale}/${namespace}`).toEqual(Object.keys(descriptor.defaults).sort())
      for (const [key, value] of Object.entries(descriptor.defaults)) {
        keys++
        if (Object.hasOwn(translated, key)) covered++
        expect(typeof translated[key], `${pack.locale}/${namespace}.${key}`).toBe(typeof value)
        if (typeof translated[key] === "string") {
          expect(translated[key].trim(), `${namespace}.${key}`).not.toBe("")
          expect(translated[key], `${namespace}.${key}`).not.toMatch(/【[0-9０-９]+】|\[[0-9０-９]+\]|^0{2,3}\d{1,2} /)
        }
      }
    }
    console.info(`${pack.locale}: ${covered}/${keys} messages (${Math.round(100 * covered / keys)}%)`)
    expect(covered).toBe(keys)
  })

  it.each(packs)("$locale retains interpolated application content", (pack: MessagePack) => {
    const samples: Array<[string, string, Array<string | number>]> = [
      ["actions", "actionsFor", ["cedar-sample"]],
      ["addressField", "noAddressesMatch", ["cedar-sample"]],
      ["datePicker", "enterATimeFromTo", ["09:15", "17:30"]],
      ["contextSwitcher", "noMatch", ["cedar-sample"]],
      ["windows", "controlLabel", ["sample-action", "cedar-sample"]],
      ["asks", "order", ["cedar-sample"]],
      ["desktop", "sessionOnEnded", ["cedar-sample"]],
      ["message", "turn", [17]],
      ["toolActivity", "runningOf", [17, "23"]],
      ["sheet", "heightStep", ["2", "3"]],
    ]
    const namespaces = pack.messages as Record<string, MessageSet>
    for (const [namespace, key, args] of samples) {
      const message = namespaces[namespace]?.[key]
      expect(typeof message, `${pack.locale}/${namespace}.${key}`).toBe("function")
      const result = typeof message === "function" ? message(...args) : ""
      for (const value of args) expect(result, `${pack.locale}/${namespace}.${key}`).toContain(String(value))
    }
  })

  it("keeps interpolations and applies language-specific count rules", () => {
    expect(de.messages.pagination?.rowRange("1–10", "50")).toContain("50")
    expect(de.messages.results?.fileCount(1, "de")).toBe("1 Datei")
    expect(de.messages.results?.fileCount(3, "de")).toBe("3 Dateien")
    for (const pack of packs) {
      for (const n of [0, 1, 2, 3, 11, 100]) {
        const text = pack.messages.results?.fileCount(n, pack.locale)
        expect(typeof text).toBe("string")
        expect(text).not.toMatch(/undefined|\{\d+\}|\[object Object\]/)
      }
    }
  })
})

it.each(packs)("$locale keeps optional values inside complete announcements", (pack) => {
  const drag = pack.messages.dragDrop!
  const place = { label: "cedar-label", zone: "cedar-zone", position: 2, count: 5 }
  const full = drag.lifted!({ ...place, keyboard: true })
  expect(full).toContain(place.label)
  expect(full).toContain(place.zone)
  expect(full).not.toMatch(/\b(?:undefined|null)\b|\[object Object\]/)
  const outside = drag.dropped!({ ...place, zone: null, position: null, count: null })
  expect(outside).toContain(place.label)
  expect(outside).not.toMatch(/\b(?:undefined|null)\b|\[object Object\]/)
  const position = pack.messages.lightbox!.position!(2, 3)
  for (const value of ["2", "3"]) expect(position).toContain(value)
  const conflict = pack.messages.entitySettings!.conflictNotice!("cedar-section", "cedar-author")
  expect(conflict).toContain("cedar-section")
  expect(conflict).toContain("cedar-author")
})

it("uses Japanese rows and a complete page-input label", () => {
  expect(ja.messages.pagination!.noRows).toBe("行がありません")
  expect(ja.messages.pagination!.previousPage).toBe("前のページ")
  expect(ja.messages.pagination!.pageInput!("12")).toBe("ページ（全12ページ）")
})
