// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { useDirection as useBaseDirection } from "@base-ui/react/direction-provider"
import { afterEach, describe, expect, it, vi } from "vitest"
import { DirectionProvider, localeDirection, useDirection } from "./direction.js"

afterEach(() => { cleanup(); vi.restoreAllMocks() })

describe("localeDirection", () => {
  it.each(["ar", "ar-EG", "he", "iw", "fa", "ur", "ps", "dv", "yi", "ckb"])("recognises %s", (tag) => {
    expect(localeDirection(tag)).toBe("rtl")
  })
  it.each(["en-AU", "de", "ja", "", "not_a_tag"])("uses ltr for %s", (tag) => {
    expect(localeDirection(tag)).toBe("ltr")
  })
  it("uses script and language information without Intl text info", () => {
    const prototype = Intl.Locale.prototype
    if ("getTextInfo" in prototype) vi.spyOn(prototype as Intl.Locale & { getTextInfo: () => unknown }, "getTextInfo").mockReturnValue(undefined)
    if ("textInfo" in prototype) vi.spyOn(prototype as Intl.Locale & { textInfo: unknown }, "textInfo", "get").mockReturnValue(undefined)
    expect(localeDirection("az-Arab")).toBe("rtl")
    expect(localeDirection("ar-Latn")).toBe("ltr")
    expect(localeDirection("he")).toBe("rtl")
    expect(localeDirection("en")).toBe("ltr")
  })
})

it("shares nested context with Base UI", () => {
  function Sample() { return <span>{useDirection()} / {useBaseDirection()}</span> }
  render(<DirectionProvider direction="rtl"><Sample /><DirectionProvider direction="ltr"><Sample /></DirectionProvider></DirectionProvider>)
  expect(screen.getByText("rtl / rtl")).toBeTruthy()
  expect(screen.getByText("ltr / ltr")).toBeTruthy()
})
