// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { AddressInput } from "./address-field.js"
import { emptyAddress, hasAddressParts } from "./address.js"
import { GeocoderError, type GeocoderAdapter } from "./geocoder.js"

afterEach(cleanup)

const geocoder = (): GeocoderAdapter => ({
  search: vi.fn(async () => []),
  attribution: { provider: "Sample", data: "Sample data" },
  debounceMs: 1,
})

const lookup = () => screen.getByRole("combobox") as HTMLInputElement
const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 20)))

describe("AddressInput defaultQuery", () => {
  it("starts empty without it", () => {
    render(<AddressInput label="Site address" geocoder={geocoder()} />)
    expect(lookup().value).toBe("")
  })

  it("shows the text and asks the geocoder nothing until the lookup takes focus", async () => {
    const adapter = geocoder()
    render(<AddressInput label="Site address" geocoder={adapter} defaultQuery="12 Example Lane Hobart" />)
    expect(lookup().value).toBe("12 Example Lane Hobart")
    await settle()
    expect(adapter.search).not.toHaveBeenCalled()
    fireEvent.focus(lookup())
    await waitFor(() => expect(adapter.search).toHaveBeenCalledOnce())
    expect(vi.mocked(adapter.search).mock.calls[0]![0]).toBe("12 Example Lane Hobart")
  })

  it("searches from the first keystroke as usual when there is no seed", async () => {
    const adapter = geocoder()
    render(<AddressInput label="Site address" geocoder={adapter} />)
    fireEvent.focus(lookup())
    fireEvent.change(lookup(), { target: { value: "12 Ex" } })
    await waitFor(() => expect(adapter.search).toHaveBeenCalledOnce())
  })
})

describe("AddressInput lookup failure", () => {
  const failing = (error: unknown): GeocoderAdapter => ({ ...geocoder(), search: vi.fn(async () => Promise.reject(error)) })
  const lookupBox = () => screen.getAllByRole("combobox")[0] as HTMLInputElement
  const type = async (text = "12 Ex") => {
    fireEvent.focus(lookupBox())
    fireEvent.change(lookupBox(), { target: { value: text } })
    await settle()
  }
  const failureLine = () => document.querySelector(".fa-address-lookup-failure")?.textContent
  const unavailable = "Address lookup is unavailable right now. You can type the address under Enter manually."

  it("says the lookup is unavailable for a timeout or upstream failure", async () => {
    render(<AddressInput label="Site address" geocoder={failing(new GeocoderError(504, "GEOCODER_TIMEOUT"))} />)
    await type()
    expect(failureLine()).toBe(unavailable)
  })

  it("treats any error that is not a rate limit as unavailable", async () => {
    render(<AddressInput label="Site address" geocoder={failing(new TypeError("Failed to fetch"))} />)
    await type()
    expect(failureLine()).toBe(unavailable)
  })

  it.each([
    ["the status", new GeocoderError(429, "")],
    ["the code", new GeocoderError(503, "RATE_LIMITED")],
    ["a custom adapter's error", Object.assign(new Error("slow down"), { status: 429 })],
  ])("reports too many lookups from %s", async (_name, error) => {
    render(<AddressInput label="Site address" geocoder={failing(error)} />)
    await type()
    expect(failureLine()).toBe("Too many lookups. Try again in a moment.")
  })

  it("mentions the pin only when there is a map", async () => {
    render(<AddressInput label="Site address" map={{ styleUrl: "" } as never} geocoder={failing(new GeocoderError(502, ""))} />)
    await type()
    expect(failureLine()).toContain("under Enter manually and place the pin.")
  })

  it("keeps the failure and Enter manually on the page after the list closes", async () => {
    render(<AddressInput label="Site address" geocoder={failing(new GeocoderError(504, "GEOCODER_TIMEOUT"))} />)
    await type()
    fireEvent.blur(lookupBox())
    await settle()
    expect(failureLine()).toBe(unavailable)
    expect(screen.getByRole("button", { name: "Enter manually" }).getAttribute("data-variant")).toBe("secondary")
  })

  it("clears the failure when the text changes or a lookup succeeds", async () => {
    const adapter = failing(new GeocoderError(504, "GEOCODER_TIMEOUT"))
    render(<AddressInput label="Site address" geocoder={adapter} />)
    await type()
    expect(failureLine()).toBeTruthy()
    vi.mocked(adapter.search).mockResolvedValue([])
    await type("12 Exa")
    expect(failureLine()).toBeUndefined()
    expect(screen.getByRole("button", { name: "Enter manually" }).getAttribute("data-variant")).toBe("ghost")
  })

  it("points at the fields below once they are showing", async () => {
    render(<AddressInput label="Site address" geocoder={failing(new GeocoderError(504, ""))} />)
    fireEvent.click(screen.getByRole("button", { name: "Enter manually" }))
    await type()
    expect(failureLine()).toBe("Address lookup is unavailable right now. You can type the address in the fields below.")
  })

  it("ignores a lookup cancelled by further typing", async () => {
    const abort = Object.assign(new Error("Aborted"), { name: "AbortError" })
    const adapter: GeocoderAdapter = {
      ...geocoder(),
      search: vi.fn((_query, { signal }) => new Promise<never>((_resolve, reject) => signal.addEventListener("abort", () => reject(abort)))),
    }
    render(<AddressInput label="Site address" geocoder={adapter} />)
    await type()
    vi.mocked(adapter.search).mockResolvedValue([])
    await type("12 Exa")
    expect(failureLine()).toBeUndefined()
  })
})

describe("AddressInput parts", () => {
  const blank = emptyAddress({ code: "AU", name: "Australia" })
  const position = { lat: -41.45, lng: 147.13 }
  const street = () => screen.queryByRole("textbox", { name: "Street address" })

  it("stay shut for a position alone", () => {
    render(<AddressInput label="Site address" geocoder={geocoder()} value={{ ...blank, location: position }} />)
    expect(street()).toBeNull()
    expect(screen.getByRole("button", { name: "Enter manually" })).toBeTruthy()
  })
  it("stay shut when a position arrives on a blank address", () => {
    const { rerender } = render(<AddressInput label="Site address" geocoder={geocoder()} value={blank} />)
    rerender(<AddressInput label="Site address" geocoder={geocoder()} value={{ ...blank, location: position, pinned: true }} />)
    expect(street()).toBeNull()
  })
  it("open for any written part", () => {
    for (const part of [{ line1: "6 Integrity Drive" }, { line2: "Level 2" }, { locality: "Westbury" }, { postcode: "7303" }, { region: { code: "AU-TAS", name: "Tasmania" } }]) {
      const { unmount } = render(<AddressInput label="Site address" geocoder={geocoder()} value={{ ...blank, ...part }} />)
      expect(street()).not.toBeNull()
      unmount()
    }
  })
  it("open with Enter manually, and hold the position", () => {
    render(<AddressInput label="Site address" geocoder={geocoder()} value={{ ...blank, location: position }} />)
    fireEvent.click(screen.getByRole("button", { name: "Enter manually" }))
    expect(street()).not.toBeNull()
  })
  it("treat a country as a default and whitespace as nothing", () => {
    expect(hasAddressParts(blank)).toBe(false)
    expect(hasAddressParts({ ...blank, line1: "   ", location: position })).toBe(false)
    expect(hasAddressParts(null)).toBe(false)
  })
})
