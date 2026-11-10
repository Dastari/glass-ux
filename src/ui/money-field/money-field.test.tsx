// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { useState } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { LocaleProvider } from "../../lib/locale/index.js"
import { MoneyInput } from "./money-field.js"

afterEach(cleanup)

/** Base UI's Select chooses on the press's release, as a mouse makes it. */
async function choose(name: RegExp) {
  const option = await screen.findByRole("option", { name })
  fireEvent.pointerDown(option, { pointerType: "mouse", button: 0 })
  fireEvent.mouseDown(option, { button: 0 })
  fireEvent.pointerUp(option, { pointerType: "mouse", button: 0 })
  fireEvent.mouseUp(option, { button: 0 })
  fireEvent.click(option)
}

const box = () => screen.getByRole("textbox", { name: "Price" }) as HTMLInputElement

describe("MoneyInput", () => {
  it("holds finer amounts with fractionDigits and shows 2 to 4 decimals (#27)", () => {
    const onValueChange = vi.fn()
    render(
      <LocaleProvider locale="en-AU">
        <MoneyInput aria-label="Price" fractionDigits={4} defaultValue={525} onValueChange={onValueChange} />
      </LocaleProvider>,
    )
    expect(box().value).toBe("$0.0525")
    fireEvent.change(box(), { target: { value: "1.2" } })
    fireEvent.blur(box())
    expect(onValueChange).toHaveBeenLastCalledWith(12000)
    expect(box().value).toBe("$1.20")
  })

  it("draws no picker for one currency", () => {
    render(<MoneyInput aria-label="Price" currencies={["AUD"]} defaultValue={1250} />)
    expect(screen.queryByRole("combobox")).toBeNull()
  })

  it("changes the currency from a picker in the box and keeps the amount", async () => {
    function Priced() {
      const [currency, setCurrency] = useState("AUD")
      const [value, setValue] = useState<number | null>(1250)
      return (
        <LocaleProvider locale="en-AU">
          <MoneyInput aria-label="Price" currencies={["AUD", "EUR", "JPY"]} currency={currency} onCurrencyChange={setCurrency} value={value} onValueChange={setValue} />
          <output data-testid="state">{`${currency} ${value}`}</output>
        </LocaleProvider>
      )
    }
    render(<Priced />)
    const trigger = screen.getByRole("combobox", { name: /^Currency: Australian Dollar \(AUD\)$/ })
    expect(trigger.textContent).toContain("$")
    // The symbol is in the picker, so the amount does not repeat it.
    expect(box().value).toBe("12.50")
    fireEvent.click(trigger)
    await choose(/Japanese Yen/)
    await waitFor(() => expect(screen.getByTestId("state").textContent).toBe("JPY 13"))
    expect(box().value).toBe("13")
    expect(screen.getByRole("combobox", { name: /\(JPY\)$/ }).textContent).toContain("¥")
  })

  it("uncontrolled, it reports the amount in the new currency's units", async () => {
    const onValueChange = vi.fn()
    const onCurrencyChange = vi.fn()
    render(<MoneyInput aria-label="Price" currencies={["AUD", "KWD"]} defaultValue={1250} onValueChange={onValueChange} onCurrencyChange={onCurrencyChange} />)
    fireEvent.click(screen.getByRole("combobox", { name: /AUD/ }))
    await choose(/Kuwaiti Dinar/)
    await waitFor(() => expect(onCurrencyChange).toHaveBeenCalledWith("KWD"))
    expect(onValueChange).toHaveBeenLastCalledWith(12500)
  })
})
