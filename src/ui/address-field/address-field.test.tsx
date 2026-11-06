// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { AddressInput } from "./address-field.js"
import type { GeocoderAdapter } from "./geocoder.js"

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
