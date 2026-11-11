// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { iconRegistry } from "../../icons/generated/registry.js"
import { iconCatalogue, IconInput, IconPicker, searchIcons } from "./index.js"

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
})
afterEach(cleanup)

describe("iconCatalogue (#25)", () => {
  it("lists every icon once, filed in a group, with its words", () => {
    expect(iconCatalogue).toHaveLength(iconRegistry.length)
    expect(new Set(iconCatalogue.map((entry) => entry.name)).size).toBe(iconRegistry.length)
    const groundPower = iconCatalogue.find((entry) => entry.name === "ground-power")!
    expect(groundPower.group).toBe("aviation")
    expect(groundPower.keywords).toContain("gpu")
    expect(iconCatalogue.find((entry) => entry.name === "github")!.group).toBe("logos")
    expect(iconCatalogue.find((entry) => entry.name === "cisco")!.group).toBe("devices")
  })

  it("searches names first, then the words people use", () => {
    expect(searchIcons("GPU").map((entry) => entry.name)).toContain("ground-power")
    expect(searchIcons("truck").map((entry) => entry.name)).toContain("supplier")
    expect(searchIcons("air start")[0]!.name).toBe("air-start")
    expect(searchIcons("IconSearch")[0]!.name).toBe("search")
    expect(searchIcons("")).toHaveLength(iconCatalogue.length)
    expect(searchIcons("zzzz-nothing")).toEqual([])
  })
})

describe("IconPicker", () => {
  it("picks with the keyboard and marks the chosen icon", () => {
    const onValueChange = vi.fn()
    const icons = iconCatalogue.filter((entry) => entry.group === "vehicles")
    render(<IconPicker icons={icons} defaultValue="bus" onValueChange={onValueChange} />)
    const list = screen.getByRole("listbox", { name: "Icons" })
    expect(within(list).getAllByRole("option")).toHaveLength(icons.length)
    // The grid's one tab stop starts on the chosen icon.
    const bus = within(list).getByRole("option", { name: "bus" })
    expect(bus).toHaveAttribute("aria-selected", "true")
    expect(bus).toHaveAttribute("tabindex", "0")
    fireEvent.keyDown(bus, { key: "Enter" })
    expect(onValueChange).toHaveBeenCalledWith("bus")
  })

  it("Enter in the search picks the first result", () => {
    const onValueChange = vi.fn()
    render(<IconPicker onValueChange={onValueChange} />)
    const search = screen.getByRole("searchbox", { name: "Search icons" })
    fireEvent.change(search, { target: { value: "forkl" } })
    fireEvent.keyDown(search, { key: "Enter" })
    expect(onValueChange).toHaveBeenCalledWith("forklift")
  })
})

describe("IconInput", () => {
  it("opens the picker, stores the name, and clears it", async () => {
    const onValueChange = vi.fn()
    render(<IconInput aria-label="Icon" clearable onValueChange={onValueChange} name="icon" />)
    const trigger = screen.getByRole("button", { name: /^Icon Choose an icon$/ })
    expect(trigger.textContent).toContain("Choose an icon")
    fireEvent.click(trigger)
    const search = await screen.findByRole("searchbox", { name: "Search icons" })
    fireEvent.change(search, { target: { value: "crane" } })
    fireEvent.keyDown(search, { key: "Enter" })
    expect(onValueChange).toHaveBeenLastCalledWith("crane")
    await waitFor(() => expect(screen.queryByRole("searchbox")).toBeNull())
    expect(trigger.textContent).toContain("crane")
    expect(document.querySelector<HTMLInputElement>('input[name="icon"]')!.value).toBe("crane")
    fireEvent.click(trigger)
    fireEvent.click(await screen.findByRole("button", { name: "No icon" }))
    expect(onValueChange).toHaveBeenLastCalledWith(null)
  })
})
