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

const ticket: ActivityItem[] = [
  { id: "status", content: <>Sam changed the status to <b>In progress</b></>, at: "2026-03-12T09:40:00Z", icon: <svg data-icon="" /> },
  { id: "opened", content: "Priya opened the ticket", at: "2026-03-12T09:00:00Z" },
  {
    id: "post",
    content: <b>Priya Nair</b>,
    at: "2026-03-12T09:05:00Z",
    icon: <span className="fa-avatar" data-avatar="" />,
    detail: (
      <p>
        No labels since 08:42. <a href="#runbook">Runbook</a>
      </p>
    ),
  },
  { id: "sla", content: "First response due", at: "2026-03-12T09:05:00Z", tone: "warning" },
]
const ids = (container: HTMLElement, selector = ":scope > li") =>
  [...container.querySelector("ol")!.querySelectorAll(selector)].map((li) => li.querySelector("[data-id]")?.getAttribute("data-id"))

describe("order", () => {
  const tagged = (items: ActivityItem[]): ActivityItem[] =>
    items.map((item) => ({ ...item, content: <span data-id={item.id}>{item.id}</span>, children: item.children && tagged(item.children as ActivityItem[]) }))

  it("keeps the given order by default", () => {
    const { container } = render(<ActivityFeed aria-label="Ticket" items={tagged(ticket)} />)
    expect(ids(container)).toEqual(["status", "opened", "post", "sla"])
  })

  it("sorts oldest first, keeping the given order of events at the same time", () => {
    const { container } = render(<ActivityFeed aria-label="Ticket" items={tagged(ticket)} order="oldest" />)
    expect(ids(container)).toEqual(["opened", "post", "sla", "status"])
  })

  it("sorts newest first, still stable, with unparsable times last", () => {
    const items = tagged([{ id: "bad", content: "", at: "not a date" }, ...ticket])
    const { container } = render(<ActivityFeed aria-label="Ticket" items={items} order="newest" />)
    expect(ids(container)).toEqual(["status", "post", "sla", "opened", "bad"])
  })

  it("keeps branches under their parent, sorted among themselves", () => {
    const items = tagged([
      { id: "v1", content: "", at: "2026-03-01T00:00:00Z" },
      {
        id: "v2",
        content: "",
        at: "2026-03-02T00:00:00Z",
        children: [
          { id: "v2-a", content: "", at: "2026-03-01T12:00:00Z" },
          { id: "v2-b", content: "", at: "2026-03-03T00:00:00Z" },
        ],
      },
    ])
    const { container } = render(<ActivityFeed aria-label="History" items={items} order="newest" />)
    expect(ids(container)).toEqual(["v2", "v1"])
    const branch = container.querySelector(".fa-activity-branch")!
    expect([...branch.querySelectorAll("[data-id]")].map((element) => element.getAttribute("data-id"))).toEqual(["v2-b", "v2-a"])
  })

  it("orders a selectable feed's keyboard path the same way", () => {
    render(<ActivityFeed aria-label="Ticket" items={ticket} order="oldest" defaultSelectedId={null} />)
    const options = screen.getAllByRole("option")
    expect(options[0]!.textContent).toContain("Priya opened the ticket")
    options[0]!.focus()
    fireEvent.keyDown(document.activeElement!, { key: "End" })
    expect(document.activeElement!.textContent).toContain("In progress")
  })
})

describe("a timeline", () => {
  it("marks every row with the marker the rail stops at, and puts a node where there is none", () => {
    const { container } = render(<ActivityFeed aria-label="Ticket" items={ticket} variant="timeline" />)
    const list = screen.getByRole("list", { name: "Ticket" })
    expect(list.getAttribute("data-variant")).toBe("timeline")
    const rows = [...list.querySelectorAll(":scope > li")]
    expect(rows.map((row) => row.getAttribute("data-marker"))).toEqual(["icon", "node", "icon", "dot"])
    const node = rows[1]!.querySelector(".fa-activity-icon")!
    expect(node.getAttribute("aria-hidden")).toBe("true")
    expect(node.querySelector(".fa-activity-node")).toBeTruthy()
    expect(container.querySelectorAll(".fa-activity-line")).toHaveLength(4)
  })

  it("draws a branch as a rail of its own", () => {
    const { container } = render(<ActivityFeed aria-label="History" items={history} variant="timeline" />)
    const branch = container.querySelector("ol > li > ol.fa-activity-branch")!
    expect([...branch.children].map((row) => row.getAttribute("data-marker"))).toEqual(["node", "dot"])
  })

  it("keeps the empty state unchanged", () => {
    expect(renderToStaticMarkup(<ActivityFeed items={[]} variant="timeline" empty="No document activity" />)).toBe(EMPTY)
  })

  it("stays one listbox when selectable, rows and branches included", () => {
    render(<ActivityFeed aria-label="History" items={history} variant="timeline" defaultSelectedId="v2" />)
    const list = screen.getByRole("listbox", { name: "History" })
    expect(list.getAttribute("data-variant")).toBe("timeline")
    expect(within(list).getAllByRole("option")).toHaveLength(5)
    expect(within(list).getByRole("group", { name: /Version 2/ })).toBeTruthy()
  })
})

describe("a detail", () => {
  it("sits under the line on an inset surface, its links still links", () => {
    const { container } = render(<ActivityFeed aria-label="Ticket" items={ticket} variant="timeline" />)
    const row = container.querySelectorAll("ol > li")[2]!
    const detail = row.querySelector(".fa-activity-detail")!
    expect(detail.previousElementSibling?.classList.contains("fa-activity-line")).toBe(true)
    expect(detail.classList.contains("glass-inset")).toBe(true)
    expect(detail.getAttribute("data-radius")).toBe("tile")
    expect(detail.getAttribute("data-padding")).toBe("tile")
    expect(within(detail as HTMLElement).getByRole("link", { name: "Runbook" })).toBeTruthy()
  })

  it.each([
    ["card", "glass-card"],
    ["none", null],
  ] as const)("takes the %s surface", (surface, material) => {
    const { container } = render(<ActivityFeed aria-label="Ticket" items={ticket} detailSurface={surface} />)
    const detail = container.querySelector(".fa-activity-detail")!
    expect(detail.className.includes("glass-")).toBe(material !== null)
    if (material) expect(detail.classList.contains(material)).toBe(true)
  })

  it("leaves rows without a detail as they were in a plain feed", () => {
    const { container } = render(<ActivityFeed aria-label="Ticket" items={ticket} />)
    const rows = container.querySelectorAll("ol > li")
    expect(rows[0]!.querySelector(".fa-activity-line")).toBeNull()
    expect(rows[2]!.querySelector(".fa-activity-line")).toBeTruthy()
  })

  it("is inside a selectable row's option, naming it by its line and describing it", () => {
    render(<ActivityFeed aria-label="Ticket" items={ticket.map((item) => ({ ...item, detail: item.id === "post" ? "No labels since 08:42." : undefined }))} defaultSelectedId={null} />)
    const option = screen.getAllByRole("option")[2]!
    const line = document.getElementById(option.getAttribute("aria-labelledby")!)!
    const detail = document.getElementById(option.getAttribute("aria-describedby")!)!
    expect(option.contains(line) && option.contains(detail)).toBe(true)
    // The line's content and time are flex items, which browsers separate in the name.
    expect(line.querySelector(".fa-activity-content")!.textContent).toBe("Priya Nair")
    expect(line.querySelector("time")!.textContent).toBe("55 min ago")
    expect(detail.textContent).toBe("No labels since 08:42.")
    expect(screen.getAllByRole("option")[0]!.hasAttribute("aria-labelledby")).toBe(false)
  })
})

describe("inline time", () => {
  it("follows the sentence after a space, in a box that holds the separator", () => {
    const { container } = render(<ActivityFeed aria-label="Ticket" items={ticket.slice(0, 1)} timePlacement="inline" />)
    const line = container.querySelector(".fa-activity-line")!
    expect(line.getAttribute("data-placement")).toBe("inline")
    expect(line.textContent).toBe("Sam changed the status to In progress 20 min ago")
    const time = line.querySelector(".fa-activity-time > time")!
    expect(time.getAttribute("datetime")).toBe("2026-03-12T09:40:00.000Z")
  })

  it("keeps the time at the end of a timeline's line by default", () => {
    const { container } = render(<ActivityFeed aria-label="Ticket" items={ticket.slice(0, 1)} variant="timeline" />)
    const line = container.querySelector(".fa-activity-line")!
    expect(line.getAttribute("data-placement")).toBe("end")
    expect(line.lastElementChild?.classList.contains("fa-activity-time")).toBe(true)
  })
})
