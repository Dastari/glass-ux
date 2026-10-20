// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react"
import { hydrateRoot } from "react-dom/client"
import { renderToString } from "react-dom/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { canonicalLocale, configureLocale, configuredLocale, documentLocale, FALLBACK_LOCALE, getLocale, serverLocale } from "./locale.js"
import { delocalizeNumber, numberSeparators } from "./intl.js"
import { LocaleProvider, useLocale } from "./use-locale.js"

function Shown({ locale }: { locale?: string }) {
  return <span data-testid="locale">{useLocale(locale)}</span>
}
const shown = () => screen.getByTestId("locale").textContent

describe("locale resolution", () => {
  let previous: string | undefined
  beforeEach(() => {
    previous = configuredLocale()
    configureLocale(undefined)
    document.documentElement.lang = ""
  })
  afterEach(() => {
    cleanup()
    configureLocale(previous)
    document.documentElement.lang = ""
  })

  it("falls back to en-US with no configuration and no <html lang>", () => {
    expect(getLocale()).toBe(FALLBACK_LOCALE)
    expect(FALLBACK_LOCALE).toBe("en-US")
    render(<Shown />)
    expect(shown()).toBe("en-US")
  })

  it("reads a valid <html lang>, canonicalised", () => {
    document.documentElement.lang = "en-au"
    expect(documentLocale()).toBe("en-AU")
    expect(getLocale()).toBe("en-AU")
  })

  it("ignores an invalid <html lang>", () => {
    document.documentElement.lang = "not a tag!"
    expect(documentLocale()).toBeUndefined()
    expect(getLocale()).toBe("en-US")
  })

  it("prefers configureLocale over <html lang>, and clears back to it", () => {
    document.documentElement.lang = "en-AU"
    configureLocale("de-DE")
    expect(getLocale()).toBe("de-DE")
    configureLocale(undefined)
    expect(getLocale()).toBe("en-AU")
  })

  it("rejects an invalid configured tag", () => {
    expect(() => configureLocale("en_AU!")).toThrow(RangeError)
    expect(configuredLocale()).toBeUndefined()
  })

  it("orders prop > provider > configureLocale > <html lang> > en-US", () => {
    document.documentElement.lang = "en-GB"
    configureLocale("fr-FR")
    const { rerender } = render(
      <LocaleProvider locale="de-DE">
        <Shown locale="ja-JP" />
      </LocaleProvider>
    )
    expect(shown()).toBe("ja-JP")
    rerender(
      <LocaleProvider locale="de-DE">
        <Shown />
      </LocaleProvider>
    )
    expect(shown()).toBe("de-DE")
    rerender(<Shown />)
    expect(shown()).toBe("fr-FR")
    act(() => configureLocale(undefined))
    expect(shown()).toBe("en-GB")
  })

  it("lets a nested provider override and skips invalid props and providers", () => {
    render(
      <LocaleProvider locale="de-DE">
        <LocaleProvider locale="en-NZ">
          <Shown />
        </LocaleProvider>
        <LocaleProvider locale="!!">
          <Shown locale="??" />
        </LocaleProvider>
      </LocaleProvider>
    )
    expect(screen.getAllByTestId("locale").map((node) => node.textContent)).toEqual(["en-NZ", "de-DE"])
  })

  it("re-renders when configureLocale or <html lang> changes", async () => {
    render(<Shown />)
    expect(shown()).toBe("en-US")
    act(() => configureLocale("en-AU"))
    expect(shown()).toBe("en-AU")
    act(() => configureLocale(undefined))
    await act(async () => {
      document.documentElement.lang = "pt-BR"
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    expect(shown()).toBe("pt-BR")
  })

  it("hydrates with the server's answer, then follows <html lang>", async () => {
    // The server has no document: only configureLocale or en-US.
    expect(serverLocale()).toBe("en-US")
    const html = renderToString(<Shown />)
    expect(html).toContain("en-US")
    document.documentElement.lang = "en-AU"
    const container = document.createElement("div")
    container.innerHTML = html
    document.body.append(container)
    const errors = vi.spyOn(console, "error").mockImplementation(() => {})
    const recoverable = vi.fn()
    await act(async () => {
      hydrateRoot(container, <Shown />, { onRecoverableError: recoverable })
    })
    expect(recoverable).not.toHaveBeenCalled()
    expect(errors).not.toHaveBeenCalled()
    expect(container.textContent).toBe("en-AU")
    errors.mockRestore()
    container.remove()
  })
})

describe("server", () => {
  it("skips <html lang> when there is no document", () => {
    const saved = globalThis.document
    const previous = configuredLocale()
    configureLocale(undefined)
    // @ts-expect-error simulate a server runtime
    delete globalThis.document
    try {
      expect(documentLocale()).toBeUndefined()
      expect(getLocale()).toBe("en-US")
      configureLocale("en-AU")
      expect(getLocale()).toBe("en-AU")
    } finally {
      globalThis.document = saved
      configureLocale(previous)
    }
  })
})

describe("number text", () => {
  it("canonicalises tags and rejects invalid ones", () => {
    expect(canonicalLocale("EN-au")).toBe("en-AU")
    expect(canonicalLocale("")).toBeUndefined()
    expect(canonicalLocale("x y")).toBeUndefined()
  })

  it("reads a locale's decimal and grouping marks", () => {
    expect(numberSeparators("en-AU")).toEqual({ decimal: ".", group: "," })
    expect(numberSeparators("de-DE")).toEqual({ decimal: ",", group: "." })
    expect(delocalizeNumber("1,234.5", "en-US")).toBe("1234.5")
    expect(delocalizeNumber("1.234,5", "de-DE")).toBe("1234.5")
    expect(delocalizeNumber("1 234,5", "fr-FR")).toBe("1234.5")
  })
})
