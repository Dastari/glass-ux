// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { LocaleProvider } from "../locale/index.js"
import { configureMessages, defineMessagePack, defineMessages, loadMessagePack, messagePackFor, MessagesProvider, plural, registeredMessages, registerMessagePack, useMessages } from "./index.js"

const demo = defineMessages("i18nDemo", {
  clear: "Clear",
  rows: (count: number) => `${count} rows`,
})
declare module "./catalog.js" {
  interface MessageCatalog {
    i18nDemo: typeof demo.defaults
  }
}

function Demo({ labels }: { labels?: Partial<typeof demo.defaults> }) {
  const t = useMessages(demo, { labels })
  return (
    <p>
      {t.clear} · {t.rows(3)}
    </p>
  )
}

afterEach(() => {
  cleanup()
  configureMessages({})
})

describe("messages", () => {
  it("returns registry snapshots without exposing the live map", () => {
    const before = registeredMessages()
    const descriptor = defineMessages("registrySnapshot", { label: "Snapshot" })
    expect(before.has("registrySnapshot")).toBe(false)
    expect(registeredMessages().get("registrySnapshot")).toBe(descriptor)
    const mutableCopy = new Map(registeredMessages())
    mutableCopy.clear()
    expect(registeredMessages().has("registrySnapshot")).toBe(true)
  })

  it("uses the English defaults", () => {
    render(<Demo />)
    expect(screen.getByText("Clear · 3 rows")).toBeTruthy()
  })

  it("picks the pack for the locale's language, then overrides and labels win in order", () => {
    registerMessagePack(
      defineMessagePack("de", { i18nDemo: { clear: "Leeren", rows: (n: number) => plural("de", n, { one: "1 Zeile", other: `${n} Zeilen` }) } }),
    )
    const { rerender } = render(
      <LocaleProvider locale="de-AT">
        <Demo />
      </LocaleProvider>,
    )
    expect(screen.getByText("Leeren · 3 Zeilen")).toBeTruthy()
    configureMessages({ i18nDemo: { clear: "Zurücksetzen" } })
    rerender(
      <LocaleProvider locale="de-AT">
        <MessagesProvider messages={{ i18nDemo: { rows: () => "viele" } }}>
          <Demo labels={{ clear: "Weg" }} />
        </MessagesProvider>
      </LocaleProvider>,
    )
    expect(screen.getByText("Weg · viele")).toBeTruthy()
  })

  it("keeps English for a locale without a pack", () => {
    render(
      <LocaleProvider locale="fi">
        <Demo />
      </LocaleProvider>,
    )
    expect(screen.getByText("Clear · 3 rows")).toBeTruthy()
  })

  it("matches regional tags to a script or regional pack and keeps other scripts apart", () => {
    const simplified = defineMessagePack("zh-Hans", { i18nDemo: { clear: "清除" } })
    const brazil = defineMessagePack("pt-BR", { i18nDemo: { clear: "Limpar" } })
    registerMessagePack(simplified, brazil)
    expect(messagePackFor("zh-CN")).toBe(simplified)
    expect(messagePackFor("zh-Hans-SG")).toBe(simplified)
    expect(messagePackFor("zh")).toBe(simplified)
    expect(messagePackFor("zh-TW")).toBeUndefined()
    expect(messagePackFor("pt")).toBe(brazil)
    expect(messagePackFor("pt-PT")).toBeUndefined()
  })
})

describe("loadMessagePack", () => {
  it("loads, registers and returns the pack that matches the locale", async () => {
    const finnish = defineMessagePack("fi", { i18nDemo: { clear: "Tyhjennä" } })
    const load = vi.fn(async () => ({ default: finnish }))
    const other = vi.fn(async () => ({ default: defineMessagePack("sv", { i18nDemo: { clear: "Rensa" } }) }))
    expect(messagePackFor("fi")).toBeUndefined()
    await expect(loadMessagePack("fi-FI", { fi: load, sv: other })).resolves.toBe(finnish)
    expect(messagePackFor("fi-FI")).toBe(finnish)
    expect(load).toHaveBeenCalledTimes(1)
    expect(other).not.toHaveBeenCalled()
  })

  it("matches as messagePackFor does: script, region, then language", async () => {
    const cyrillic = defineMessagePack("sr-Cyrl", { i18nDemo: { clear: "Обриши" } })
    const norwegian = defineMessagePack("nb", { i18nDemo: { clear: "Tøm" } })
    const loaders = { "sr-Cyrl": async () => ({ default: cyrillic }), nb: async () => ({ default: norwegian }) }
    await expect(loadMessagePack("sr-RS", loaders)).resolves.toBe(cyrillic)
    await expect(loadMessagePack("nb-NO", loaders)).resolves.toBe(norwegian)
    await expect(loadMessagePack("sr-Latn", loaders)).resolves.toBeUndefined()
    await expect(loadMessagePack("not a tag", loaders)).resolves.toBeUndefined()
  })

  it("does not load a pack that is already registered", async () => {
    const polish = defineMessagePack("pl", { i18nDemo: { clear: "Wyczyść" } })
    registerMessagePack(polish)
    const load = vi.fn(async () => ({ default: defineMessagePack("pl", {}) }))
    await expect(loadMessagePack("pl", { pl: load })).resolves.toBe(polish)
    expect(load).not.toHaveBeenCalled()
  })

  it("shows English until the pack arrives, then re-renders in its language", async () => {
    const czech = defineMessagePack("cs", { i18nDemo: { clear: "Vymazat" } })
    render(
      <LocaleProvider locale="cs">
        <Demo />
      </LocaleProvider>,
    )
    expect(screen.getByText(/Clear/)).toBeTruthy()
    await act(async () => {
      await loadMessagePack("cs", { cs: async () => ({ default: czech }) })
    })
    expect(screen.getByText(/Vymazat/)).toBeTruthy()
  })

  it("rejects when the loader fails and registers nothing", async () => {
    await expect(loadMessagePack("da", { da: async () => Promise.reject(new Error("offline")) })).rejects.toThrow("offline")
    expect(messagePackFor("da")).toBeUndefined()
  })
})
