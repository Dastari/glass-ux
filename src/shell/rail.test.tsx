// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { configureShortcuts } from "../ui/kbd/index.js"
import { TooltipProvider } from "../ui/tooltip/index.js"
import { Rail } from "./rail.js"
import { railOverflow, railSeparators, type RailFitChild, type RailFitEntry } from "./rail-fit.js"
import { TabBar } from "./tab-bar.js"
import { tabBarOverflow } from "./tab-bar-fit.js"

beforeAll(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} })
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }))
})
afterEach(() => {
  cleanup()
  configureShortcuts({ characterKeys: true })
})
afterAll(() => vi.unstubAllGlobals())

function Fixture({ onGo }: { onGo: () => void }) {
  return (
    <TooltipProvider>
      <Rail.Root aria-label="Main">
        <Rail.Item icon={<span />} label="Endpoints" shortcut="g e" onClick={onGo} />
      </Rail.Root>
    </TooltipProvider>
  )
}
const press = (key: string, init: KeyboardEventInit = {}) => act(() => void fireEvent.keyDown(document.body, { key, ...init }))

describe("Rail sequence shortcuts", () => {
  it("go to the item with 'g e'", () => {
    const go = vi.fn()
    render(<Fixture onGo={go} />)
    press("g")
    press("e")
    expect(go).toHaveBeenCalledTimes(1)
  })

  it("do nothing once the application switches single-character shortcuts off, and come back on", () => {
    const go = vi.fn()
    render(<Fixture onGo={go} />)
    act(() => configureShortcuts({ characterKeys: false }))
    press("g")
    press("e")
    expect(go).not.toHaveBeenCalled()
    act(() => configureShortcuts({ characterKeys: true }))
    press("g")
    press("e")
    expect(go).toHaveBeenCalledTimes(1)
  })

  it("ignore a sequence typed in a field", () => {
    const go = vi.fn()
    render(
      <>
        <Fixture onGo={go} />
        <input aria-label="Name" />
      </>,
    )
    const field = screen.getByRole("textbox", { name: "Name" })
    fireEvent.keyDown(field, { key: "g" })
    fireEvent.keyDown(field, { key: "e" })
    expect(go).not.toHaveBeenCalled()
  })
})

const entry = (id: string, more: Partial<RailFitEntry> = {}): RailFitEntry => ({ id, size: 40, foot: false, pinned: false, ...more })

describe("railOverflow", () => {
  const items = ["a", "b", "c", "d", "e"].map((id) => entry(id))

  it("hides nothing when everything fits, the gaps included", () => {
    expect(railOverflow({ room: 232, gap: 8, fixed: [], entries: items })).toEqual([])
  })

  it("makes room for More from the end of the main items", () => {
    // 3 items and More: 4 x 40 + 3 x 8.
    expect(railOverflow({ room: 184, gap: 8, fixed: [], entries: items })).toEqual(["d", "e"])
  })

  it("counts a spacer's gaps and other children's heights", () => {
    expect(railOverflow({ room: 232, gap: 8, fixed: [0], entries: items })).toEqual(["d", "e"])
    expect(railOverflow({ room: 232, gap: 8, fixed: [48], entries: items })).toEqual(["c", "d", "e"])
  })

  it("keeps a pinned item in place of the last one shown", () => {
    const entries = items.map((item) => (item.id === "e" ? { ...item, pinned: true } : item))
    expect(railOverflow({ room: 184, gap: 8, fixed: [], entries })).toEqual(["c", "d"])
  })

  it("keeps the foot items longest", () => {
    const entries = items.map((item) => (item.id === "e" ? { ...item, foot: true } : item))
    expect(railOverflow({ room: 136, gap: 8, fixed: [], entries })).toEqual(["b", "c", "d"])
  })

  it("hides everything when only More fits", () => {
    expect(railOverflow({ room: 40, gap: 8, fixed: [], entries: items })).toEqual(["a", "b", "c", "d", "e"])
  })
})

describe("Rail overflow", () => {
  const room = (height: number) => {
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(height)
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ height: 40 } as DOMRect)
  }
  afterEach(() => vi.restoreAllMocks())

  function Nav({ onGo, active }: { onGo: (label: string) => void; active?: string }) {
    return (
      <TooltipProvider>
        <Rail.Root aria-label="Main">
          {["One", "Two", "Three", "Four", "Five"].map((label) => (
            <Rail.Item key={label} icon={<span />} label={label} active={label === active} shortcut={label === "Five" ? "g f" : undefined} onClick={() => onGo(label)} />
          ))}
          <Rail.Spacer />
          <Rail.Item icon={<span />} label="Settings" onClick={() => onGo("Settings")} />
        </Rail.Root>
      </TooltipProvider>
    )
  }
  const entryOf = (name: string) => screen.getByRole("button", { name, hidden: true }).closest("li")!

  it("shows no More button when everything fits", () => {
    room(1000)
    render(<Nav onGo={() => {}} />)
    expect(screen.queryByRole("button", { name: "More" })).toBeNull()
  })

  it("puts More before the spacer and hides what does not fit, keeping the current section and the foot", () => {
    room(160)
    render(<Nav onGo={() => {}} active="Five" />)
    const more = screen.getByRole("button", { name: "More" }).closest("li")!
    expect(more.nextElementSibling).toHaveClass("fa-shell-rail-spacer")
    expect(entryOf("Five")).not.toHaveAttribute("data-overflowed")
    expect(entryOf("Settings")).not.toHaveAttribute("data-overflowed")
    expect(entryOf("One")).not.toHaveAttribute("data-overflowed")
    expect(entryOf("Two")).toHaveAttribute("data-overflowed")
  })

  it("a menu row uses the hidden item, once, and it joins the rail", async () => {
    room(160)
    const go = vi.fn()
    render(<Nav onGo={go} />)
    expect(entryOf("Three")).toHaveAttribute("data-overflowed")
    fireEvent.click(screen.getByRole("button", { name: "More" }))
    fireEvent.click(await screen.findByRole("menuitem", { name: "Three" }))
    expect(go).toHaveBeenCalledTimes(1)
    expect(go).toHaveBeenCalledWith("Three")
    expect(entryOf("Three")).not.toHaveAttribute("data-overflowed")
  })

  function Grouped({ margin }: { margin?: string }) {
    return (
      <TooltipProvider>
        <Rail.Root aria-label="Main">
          <Rail.Item icon={<span />} label="One" />
          <Rail.Item icon={<span />} label="Two" />
          <Rail.Separator />
          <Rail.Item icon={<span />} label="Three" className={margin} />
          <Rail.Item icon={<span />} label="Four" />
          <Rail.Separator />
          <Rail.Item icon={<span />} label="Five" />
          <Rail.Spacer />
          <Rail.Item icon={<span />} label="Settings" />
        </Rail.Root>
      </TooltipProvider>
    )
  }
  const separators = (container: HTMLElement) => [...container.querySelectorAll(".fa-shell-rail-separator")].map((line) => line.hasAttribute("data-overflowed"))

  it("hides a separator with its group, and uses its room for items (#20)", async () => {
    // Every child measures 40 here, separators included: One, Two, More and Settings fit in 200.
    // Three would bring its separator back, which does not fit.
    room(200)
    const { container } = render(<Grouped />)
    expect(entryOf("Two")).not.toHaveAttribute("data-overflowed")
    expect(entryOf("Three")).toHaveAttribute("data-overflowed")
    expect(separators(container)).toEqual([true, true])
    // More keeps the groups apart.
    fireEvent.click(screen.getByRole("button", { name: "More" }))
    const menu = await screen.findByRole("menu")
    expect([...menu.children].map((child) => child.getAttribute("role"))).toEqual(["menuitem", "menuitem", "separator", "menuitem"])
  })

  it("shows a separator while its group has an item in the rail", () => {
    // 280: One, Two, a separator, Three, More and Settings.
    room(280)
    const { container } = render(<Grouped />)
    expect(entryOf("Three")).not.toHaveAttribute("data-overflowed")
    expect(entryOf("Four")).toHaveAttribute("data-overflowed")
    expect(separators(container)).toEqual([false, true])
  })

  it("counts an entry's block margins", () => {
    room(1000)
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(320)
    const real = window.getComputedStyle
    vi.spyOn(window, "getComputedStyle").mockImplementation((element, pseudo) => {
      const style = real(element, pseudo)
      if (!(element instanceof HTMLLIElement && element.querySelector(".pushed"))) return style
      return new Proxy(style, { get: (target, key) => (key === "marginBlockStart" ? "24px" : Reflect.get(target, key)) })
    })
    // 6 items and 2 separators at 40 fill 320 exactly; 24 px of margin on one does not fit.
    render(<Grouped margin="pushed" />)
    expect(screen.getByRole("button", { name: "More" })).toBeTruthy()
  })

  it("a hidden item's shortcut still works", () => {
    room(160)
    const go = vi.fn()
    render(<Nav onGo={go} />)
    expect(entryOf("Five")).toHaveAttribute("data-overflowed")
    press("g")
    press("f")
    expect(go).toHaveBeenCalledWith("Five")
  })

  it("scrolls instead when asked: no More, and nothing hidden", () => {
    room(160)
    render(
      <TooltipProvider>
        <Rail.Root aria-label="Main" overflow="scroll">
          {["One", "Two", "Three", "Four", "Five", "Six"].map((label) => (
            <Rail.Item key={label} icon={<span />} label={label} />
          ))}
        </Rail.Root>
      </TooltipProvider>
    )
    expect(screen.queryByRole("button", { name: "More" })).toBeNull()
    expect(document.querySelectorAll("[data-overflowed]")).toHaveLength(0)
  })

  it("keeps its items when the rail has no height (the TabBar replaces it on phones)", () => {
    room(0)
    render(<Nav onGo={() => {}} />)
    expect(screen.queryByRole("button", { name: "More" })).toBeNull()
  })
})

describe("Rail labels", () => {
  afterEach(() => vi.restoreAllMocks())

  it("draws no text unless asked, and keeps the icon-only markup", () => {
    render(
      <TooltipProvider>
        <Rail.Root aria-label="Main">
          <Rail.Item icon={<svg data-testid="icon" />} label="Projects" />
        </Rail.Root>
      </TooltipProvider>,
    )
    const item = screen.getByRole("button", { name: "Projects" })
    expect(item).toHaveTextContent("")
    expect(screen.getByTestId("icon").parentElement).toBe(item)
    expect(screen.getByRole("navigation")).not.toHaveAttribute("data-labels")
  })

  it("draws the name under the icon with the same accessible name, the badge on the icon", () => {
    render(
      <TooltipProvider>
        <Rail.Root aria-label="Main" labels>
          <Rail.Item icon={<svg data-testid="icon" />} label="Projects" badge={<span data-testid="badge" />} />
        </Rail.Root>
      </TooltipProvider>,
    )
    expect(screen.getByRole("navigation")).toHaveAttribute("data-labels")
    const item = screen.getByRole("button", { name: "Projects" })
    expect(item).toHaveTextContent("Projects")
    const icon = screen.getByTestId("icon").parentElement!
    expect(icon).toHaveClass("fa-shell-rail-icon")
    expect(screen.getByTestId("badge").parentElement).toBe(icon)
  })

  it("labels More and still folds items into it by what they measure", () => {
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(170)
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ height: 52 } as DOMRect)
    render(
      <TooltipProvider>
        <Rail.Root aria-label="Main" labels>
          {["One", "Two", "Three", "Four", "Five"].map((label) => (
            <Rail.Item key={label} icon={<span />} label={label} />
          ))}
        </Rail.Root>
      </TooltipProvider>,
    )
    expect(screen.getByRole("button", { name: "More" })).toHaveTextContent("More")
    // jsdom has no styles, so no gap: three 52px rows fit 170, and More is one of them.
    const hidden = [...document.querySelectorAll("[data-overflowed]")].map((entry) => entry.textContent)
    expect(hidden).toEqual(["Three", "Four", "Five"])
  })

  it("shows the tooltip only for what the label does not say", () => {
    configureShortcuts({ characterKeys: true })
    render(
      <TooltipProvider>
        <Rail.Root aria-label="Main" labels>
          <Rail.Item icon={<span />} label="Plain" />
          <Rail.Item icon={<span />} label="Keyed" shortcut="g k" />
          <Rail.Item icon={<span />} label="Reasoned" disabledReason="Choose an organisation first" />
        </Rail.Root>
      </TooltipProvider>,
    )
    expect(screen.getByRole("button", { name: "Plain" })).toHaveAttribute("data-trigger-disabled")
    expect(screen.getByRole("button", { name: "Keyed" })).not.toHaveAttribute("data-trigger-disabled")
    expect(screen.getByRole("button", { name: "Reasoned" })).not.toHaveAttribute("data-trigger-disabled")
  })

  it("shows the tooltip when the name was cut", () => {
    vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(120)
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(72)
    render(
      <TooltipProvider>
        <Rail.Root aria-label="Main" labels>
          <Rail.Item icon={<span />} label="A very long destination name" />
        </Rail.Root>
      </TooltipProvider>,
    )
    expect(screen.getByRole("button", { name: "A very long destination name" })).not.toHaveAttribute("data-trigger-disabled")
  })
})

describe("railSeparators", () => {
  const order: RailFitChild[] = [
    { kind: "item", id: "a" },
    { kind: "separator", id: "s1" },
    { kind: "item", id: "b" },
    { kind: "separator", id: "s2" },
    { kind: "item", id: "c" },
    { kind: "spacer" },
    { kind: "separator", id: "s3" },
    { kind: "item", id: "d" },
  ]
  it("keeps every separator between shown groups", () => {
    expect(railSeparators(order, new Set())).toEqual(["s3"])
  })
  it("hides a separator whose group is hidden, so none meet", () => {
    expect(railSeparators(order, new Set(["b"]))).toEqual(["s1", "s3"])
    expect(railSeparators(order, new Set(["b", "c"]))).toEqual(["s1", "s2", "s3"])
  })
  it("hides a separator with nothing shown before it", () => {
    expect(railSeparators(order, new Set(["a"]))).toEqual(["s1", "s3"])
  })
})

describe("railOverflow with labelled heights", () => {
  it("fits by the measured height, and More takes the tallest item's", () => {
    const tall = ["a", "b", "c", "d"].map((id) => entry(id, { size: 52 }))
    // Everything: 4 x 52 + 3 x 6 = 226.
    expect(railOverflow({ room: 226, gap: 6, fixed: [], entries: tall })).toEqual([])
    // Three rows at 52 with two gaps is 168: two items and More.
    expect(railOverflow({ room: 168, gap: 6, fixed: [], entries: tall })).toEqual(["c", "d"])
  })
})

describe("tabBarOverflow", () => {
  const tabs = ["a", "b", "c", "d", "e", "f", "g"].map((id) => ({ id, pinned: false }))
  const fit = { room: 1000, gap: 2, tabMin: 64, maxItems: 5, fixed: 0, hasMore: false }

  it("hides nothing up to the limit", () => {
    expect(tabBarOverflow({ ...fit, entries: tabs.slice(0, 5) })).toEqual([])
  })

  it("keeps the limit with More counted, however wide the bar", () => {
    expect(tabBarOverflow({ ...fit, entries: tabs })).toEqual(["e", "f", "g"])
    expect(tabBarOverflow({ ...fit, maxItems: 7, entries: tabs })).toEqual([])
  })

  it("folds sooner when tabs would be too narrow", () => {
    // 3 x 64 + 2 x 2 = 196: two tabs and More.
    expect(tabBarOverflow({ ...fit, room: 196, entries: tabs })).toEqual(["c", "d", "e", "f", "g"])
  })

  it("keeps the current destination in place of the last one shown", () => {
    const entries = tabs.map((tab) => ({ ...tab, pinned: tab.id === "g" }))
    expect(tabBarOverflow({ ...fit, entries })).toEqual(["d", "e", "f"])
  })

  it("counts a More written by the host, needing no second one", () => {
    expect(tabBarOverflow({ ...fit, fixed: 1, hasMore: true, entries: tabs.slice(0, 4) })).toEqual([])
    expect(tabBarOverflow({ ...fit, fixed: 1, hasMore: true, entries: tabs.slice(0, 5) })).toEqual(["e"])
  })

  it("always keeps one tab beside More", () => {
    expect(tabBarOverflow({ ...fit, room: 40, entries: tabs })).toEqual(["b", "c", "d", "e", "f", "g"])
  })
})

describe("TabBar overflow", () => {
  afterEach(() => vi.restoreAllMocks())
  const wide = () => vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(1000)
  const LABELS = ["One", "Two", "Three", "Four", "Five", "Six", "Seven"]

  it("adds More when tabs do not fit, and a sheet row uses the hidden tab once", async () => {
    wide()
    const go = vi.fn()
    render(
      <TooltipProvider>
        <TabBar.Root aria-label="Main">
          {LABELS.map((label) => (
            <TabBar.Item key={label} icon={<span />} label={label} onClick={() => go(label)} />
          ))}
        </TabBar.Root>
      </TooltipProvider>
    )
    const six = screen.getByRole("button", { name: "Six", hidden: true }).closest("li")!
    expect(six).toHaveAttribute("data-overflowed")
    fireEvent.click(screen.getByRole("button", { name: "More" }))
    const dialog = await screen.findByRole("dialog")
    fireEvent.click(within(dialog).getByRole("button", { name: "Six" }))
    expect(go).toHaveBeenCalledTimes(1)
    expect(go).toHaveBeenCalledWith("Six")
    expect(six).not.toHaveAttribute("data-overflowed")
  })

  it("adds no More while everything fits, and joins a More written by the host", async () => {
    wide()
    const { unmount } = render(
      <TooltipProvider>
        <TabBar.Root aria-label="Main">
          {LABELS.slice(0, 5).map((label) => (
            <TabBar.Item key={label} icon={<span />} label={label} />
          ))}
        </TabBar.Root>
      </TooltipProvider>
    )
    expect(screen.queryByRole("button", { name: "More" })).toBeNull()
    unmount()
    render(
      <TooltipProvider>
        <TabBar.Root aria-label="Main">
          {LABELS.slice(0, 5).map((label) => (
            <TabBar.Item key={label} icon={<span />} label={label} />
          ))}
          <TabBar.More>
            <TabBar.MoreItem icon={<span />} label="Settings" />
          </TabBar.More>
        </TabBar.Root>
      </TooltipProvider>
    )
    expect(screen.getAllByRole("button", { name: "More" })).toHaveLength(1)
    fireEvent.click(screen.getByRole("button", { name: "More" }))
    const rows = within(await screen.findByRole("dialog")).getAllByRole("button").map((row) => row.textContent)
    expect(rows).toContain("Five")
    expect(rows.indexOf("Five")).toBeLessThan(rows.indexOf("Settings"))
  })
})
