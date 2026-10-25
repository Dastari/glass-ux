// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { LocaleProvider } from "../locale/index.js"
import { configureMessages, defineMessagePack, defineMessages, MessagesProvider, plural, registerMessagePack, useMessages } from "./index.js"

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
})
