// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { renderToStaticMarkup } from "react-dom/server"
import { useState } from "react"
import { ActivityFeed, type ActivityItem } from "./index.js"

const NOW = "2026-03-12T10:00:00Z"
const SSR = "<ol aria-label=\"Project activity\" data-x=\"1\" class=\"fa-activity-feed extra\"><li><span class=\"fa-activity-icon\" aria-hidden=\"true\"><svg data-icon=\"\"></svg></span><span class=\"fa-activity-content\">Mira reviewed the draft</span><time class=\"fa-dt-text\" dateTime=\"2026-03-12T08:00:00.000Z\" id=\"base-ui-_R_ft_\" data-base-ui-tooltip-trigger=\"\">just now</time></li><li><span class=\"fa-activity-content\">Avery <b>attached</b> a file</span><time class=\"fa-dt-text\" dateTime=\"2026-03-11T08:00:00.000Z\" id=\"base-ui-_R_fu_\" data-base-ui-tooltip-trigger=\"\">just now</time></li></ol>"
const EMPTY = "<ol class=\"fa-activity-feed\"><li><div class=\"fa-empty\" data-tone=\"neutral\" role=\"status\"><div class=\"fa-empty-body\"><span class=\"fa-tile-icon fa-empty-tile\" aria-hidden=\"true\"></span><span class=\"fa-empty-glyph\" aria-hidden=\"true\"></span><p class=\"fa-empty-text\">No document activity</p></div></div></li></ol>"
const CLIENT = "<ol aria-label=\"Project activity\" class=\"fa-activity-feed\"><li><span class=\"fa-activity-icon\" aria-hidden=\"true\"><svg data-icon=\"\"></svg></span><span class=\"fa-activity-content\">Mira reviewed the draft</span><time class=\"fa-dt-text\" datetime=\"2026-03-12T08:00:00.000Z\" id=\"base-ui-_r_2_\" data-base-ui-tooltip-trigger=\"\" tabindex=\"0\">2 h ago</time></li><li><span class=\"fa-activity-content\">Avery <b>attached</b> a file</span><time class=\"fa-dt-text\" datetime=\"2026-03-11T08:00:00.000Z\" id=\"base-ui-_r_5_\" data-base-ui-tooltip-trigger=\"\" tabindex=\"0\">yesterday</time></li></ol>"
const items: ActivityItem[] = [
  { id: "a", content: "Mira reviewed the draft", at: Date.parse("2026-03-12T08:00:00Z"), icon: <svg data-icon="" /> },
  { id: "b", content: <>Avery <b>attached</b> a file</>, at: new Date("2026-03-11T08:00:00Z") },
]
const history: ActivityItem[] = [
  { id: "v3", content: "Version 3", at: NOW, tone: "success", toneLabel: "Published" },
  {
    id: "v2",
    content: "Version 2",
    at: NOW,
    children: [
      { id: "v2-a", content: "Branch A", at: NOW },
      { id: "v2-b", content: "Branch B", at: NOW, tone: "warning" },
    ],
  },
  { id: "v1", content: "Version 1", at: NOW },
]

/** Generated ids depend on where the tree sits; everything else must match byte for byte. */
const stable = (html: string) => html.replace(/ id="base-ui-[^"]*"/g, ' id=""')

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  )
  vi.useFakeTimers({ now: new Date(NOW) })
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

// The HTML of a plain feed as rendered before tone, branches and selection existed.
describe("a plain feed", () => {
  it("renders the same server HTML", () => {
    expect(stable(renderToStaticMarkup(<ActivityFeed aria-label="Project activity" className="extra" data-x="1" items={items} />))).toBe(
      stable(SSR)
    )
  })

  it("renders the same empty state", () => {
    expect(renderToStaticMarkup(<ActivityFeed items={[]} empty="No document activity" />)).toBe(EMPTY)
  })

  it("renders the same client DOM", () => {
    expect(stable(render(<ActivityFeed aria-label="Project activity" items={items} />).container.innerHTML)).toBe(stable(CLIENT))
  })

  it("stays a list without roles or a tab stop of its own", () => {
    render(<ActivityFeed aria-label="Project activity" items={items} />)
    expect(screen.getByRole("list", { name: "Project activity" })).toBeTruthy()
    expect(screen.queryByRole("option")).toBeNull()
  })

  it("draws tone and branches without becoming a widget", () => {
    const { container } = render(<ActivityFeed aria-label="History" items={history} />)
    expect(screen.queryByRole("listbox")).toBeNull()
    expect(container.querySelector("ol ol.fa-activity-branch")?.children).toHaveLength(2)
    const markers = container.querySelectorAll(".fa-activity-icon")
    expect(markers[0]?.getAttribute("data-tone")).toBe("success")
    expect(markers[0]?.querySelector(".fa-status-dot")?.getAttribute("data-tone")).toBe("success")
    expect(screen.getByRole("img", { name: "Published" })).toBe(markers[0])
    expect(markers[1]?.getAttribute("aria-hidden")).toBe("true")
  })
})

describe("a selectable feed", () => {
  it("is one listbox with options, groups and a single tab stop", () => {
    render(<ActivityFeed aria-label="History" items={history} defaultSelectedId="v2" />)
    const list = screen.getByRole("listbox", { name: "History" })
    const options = within(list).getAllByRole("option")
    expect(options).toHaveLength(5)
    expect(options.filter((option) => option.tabIndex === 0)).toEqual([options[1]])
    expect(options[1]!.getAttribute("aria-selected")).toBe("true")
    expect(options[0]!.getAttribute("aria-selected")).toBe("false")
    const group = within(list).getByRole("group", { name: /Version 2/ })
    expect(within(group).getAllByRole("option")).toHaveLength(2)
    expect(options[1]!.contains(group)).toBe(false)
  })

  it("uses the first row as the tab stop with nothing selected", () => {
    render(<ActivityFeed aria-label="History" items={history} onSelectedIdChange={() => {}} />)
    expect(screen.getAllByRole("option")[0]!.tabIndex).toBe(0)
  })

  it("moves with the arrows, Home and End, through branches, without selecting", () => {
    const onSelectedIdChange = vi.fn()
    render(<ActivityFeed aria-label="History" items={history} defaultSelectedId={null} onSelectedIdChange={onSelectedIdChange} />)
    const options = screen.getAllByRole("option")
    options[0]!.focus()
    fireEvent.keyDown(document.activeElement!, { key: "ArrowDown" })
    fireEvent.keyDown(document.activeElement!, { key: "ArrowDown" })
    expect(document.activeElement).toBe(options[2])
    expect(options[2]!.tabIndex).toBe(0)
    expect(options[0]!.tabIndex).toBe(-1)
    fireEvent.keyDown(document.activeElement!, { key: "End" })
    expect(document.activeElement).toBe(options[4])
    fireEvent.keyDown(document.activeElement!, { key: "ArrowDown" })
    expect(document.activeElement).toBe(options[4])
    fireEvent.keyDown(document.activeElement!, { key: "Home" })
    expect(document.activeElement).toBe(options[0])
    fireEvent.keyDown(document.activeElement!, { key: "ArrowUp" })
    expect(document.activeElement).toBe(options[0])
    expect(onSelectedIdChange).not.toHaveBeenCalled()
  })

  it.each(["Enter", " "])("selects with %j and reports the details", (key) => {
    const onSelectedIdChange = vi.fn()
    render(<ActivityFeed aria-label="History" items={history} onSelectedIdChange={onSelectedIdChange} />)
    const branch = screen.getAllByRole("option")[3]!
    branch.focus()
    fireEvent.keyDown(branch, { key })
    expect(onSelectedIdChange).toHaveBeenCalledTimes(1)
    const [id, details] = onSelectedIdChange.mock.calls[0]!
    expect(id).toBe("v2-b")
    expect(details.reason).toBe("item-press")
    expect(details.event.type).toBe("keydown")
    expect(details.item.id).toBe("v2-b")
    expect(branch.getAttribute("aria-selected")).toBe("true")
  })

  it("selects on click and reports nothing for the selected row", () => {
    const onSelectedIdChange = vi.fn()
    render(<ActivityFeed aria-label="History" items={history} defaultSelectedId="v1" onSelectedIdChange={onSelectedIdChange} />)
    const options = screen.getAllByRole("option")
    fireEvent.click(options[4]!)
    expect(onSelectedIdChange).not.toHaveBeenCalled()
    fireEvent.click(options[0]!)
    expect(onSelectedIdChange).toHaveBeenCalledWith("v3", expect.objectContaining({ reason: "item-press" }))
  })

  it("follows a controlled id and ignores its own state", () => {
    function Host() {
      const [id, setId] = useState<string | null>("v3")
      return (
        <>
          <button onClick={() => setId(null)}>Clear</button>
          <ActivityFeed aria-label="History" items={history} selectedId={id} />
        </>
      )
    }
    render(<Host />)
    const options = screen.getAllByRole("option")
    fireEvent.click(options[1]!)
    expect(screen.getAllByRole("option")[0]!.getAttribute("aria-selected")).toBe("true")
    fireEvent.click(screen.getByRole("button", { name: "Clear" }))
    expect(screen.getAllByRole("option").every((option) => option.getAttribute("aria-selected") === "false")).toBe(true)
  })

  it("keeps a working tab stop when the focused row goes away", () => {
    const { rerender } = render(<ActivityFeed aria-label="History" items={history} defaultSelectedId={null} />)
    screen.getAllByRole("option")[4]!.focus()
    rerender(<ActivityFeed aria-label="History" items={history.slice(0, 1)} defaultSelectedId={null} />)
    expect(screen.getAllByRole("option")[0]!.tabIndex).toBe(0)
  })

  it("passes a caller's key handler and honours preventDefault", () => {
    const onKeyDown = vi.fn((event: { preventDefault: () => void }) => event.preventDefault())
    const onSelectedIdChange = vi.fn()
    render(<ActivityFeed aria-label="History" items={history} onKeyDown={onKeyDown} onSelectedIdChange={onSelectedIdChange} />)
    fireEvent.keyDown(screen.getAllByRole("option")[0]!, { key: "Enter" })
    expect(onKeyDown).toHaveBeenCalled()
    expect(onSelectedIdChange).not.toHaveBeenCalled()
  })

  it("does not make a tab stop of the time inside a row", () => {
    render(<ActivityFeed aria-label="History" items={history} defaultSelectedId="v1" />)
    expect(screen.getByRole("listbox").querySelector("time")?.hasAttribute("tabindex")).toBe(false)
  })

  it("falls back to the empty list, which holds no options", () => {
    render(<ActivityFeed aria-label="History" items={[]} defaultSelectedId={null} empty="No versions" />)
    expect(screen.queryByRole("listbox")).toBeNull()
    expect(screen.getByRole("list", { name: "History" })).toBeTruthy()
  })
})
