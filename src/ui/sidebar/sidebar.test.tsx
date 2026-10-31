// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { useState, type ReactNode } from "react"
import { StorageScopeContext } from "../../lib/storage-scope.js"
import {
  Sidebar,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  normaliseSidebarPrefs,
  sidebarBootScript,
  sidebarStorageKey,
  useSidebar,
  type SidebarCollapsible,
  type SidebarProviderProps,
} from "./index.js"

let phone = false
function stubMedia() {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("<") ? phone : true,
    media: query,
    addEventListener() {},
    removeEventListener() {},
  }))
}

beforeAll(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  )
})
beforeEach(() => {
  phone = false
  stubMedia()
  localStorage.clear()
})
afterEach(cleanup)
afterAll(() => vi.unstubAllGlobals())

const pane = () => document.querySelector<HTMLElement>(".fa-sidebar")!

function App({
  collapsible = "offcanvas",
  provider,
  search = false,
  children,
}: {
  collapsible?: SidebarCollapsible
  provider?: Partial<SidebarProviderProps>
  search?: boolean
  children?: ReactNode
}) {
  const [query, setQuery] = useState("")
  return (
    <SidebarProvider {...provider}>
      <Sidebar collapsible={collapsible} resizable aria-label="Workspace">
        <Sidebar.Header icon={<span>N</span>} title="Northwind" />
        {search ? <Sidebar.Search value={query} onValueChange={setQuery} /> : null}
        <Sidebar.Content>
          <Sidebar.Group id="projects" collapsible>
            <Sidebar.GroupLabel>Projects</Sidebar.GroupLabel>
            <Sidebar.GroupContent>
              <Sidebar.Menu>
                <Sidebar.MenuItem>
                  <Sidebar.MenuButton icon={<svg />} href="#inbox" active>
                    Inbox
                  </Sidebar.MenuButton>
                  <Sidebar.MenuBadge value={1204} />
                  <Sidebar.MenuAction showOnHover />
                </Sidebar.MenuItem>
                <Sidebar.MenuItem>
                  <Sidebar.MenuButton icon={<svg />}>Reports</Sidebar.MenuButton>
                  <Sidebar.MenuSub id="reports" defaultOpen>
                    <Sidebar.MenuSubItem>
                      <Sidebar.MenuSubButton href="#weekly">Weekly</Sidebar.MenuSubButton>
                    </Sidebar.MenuSubItem>
                  </Sidebar.MenuSub>
                </Sidebar.MenuItem>
              </Sidebar.Menu>
            </Sidebar.GroupContent>
          </Sidebar.Group>
        </Sidebar.Content>
        <Sidebar.Rail />
      </Sidebar>
      <SidebarInset>
        <SidebarTrigger />
        <p>Content</p>
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}

describe("open state", () => {
  it("toggles uncontrolled from the trigger, and reports it on aria-expanded", () => {
    render(<App />)
    const trigger = screen.getByRole("button", { name: "Toggle sidebar" })
    expect(pane()).toHaveAttribute("data-state", "expanded")
    expect(trigger).toHaveAttribute("aria-expanded", "true")
    expect(trigger).toHaveAttribute("aria-controls", document.querySelector(".fa-sidebar-pane")!.id)
    fireEvent.click(trigger)
    expect(pane()).toHaveAttribute("data-state", "collapsed")
    expect(trigger).toHaveAttribute("aria-expanded", "false")
    // Off canvas, the collapsed pane is inert.
    expect(document.querySelector(".fa-sidebar-pane")).toHaveAttribute("inert")
  })

  it("starts collapsed with defaultOpen false", () => {
    render(<App provider={{ defaultOpen: false }} />)
    expect(pane()).toHaveAttribute("data-state", "collapsed")
  })

  it("follows a controlled open prop and reports why it should change", () => {
    const onOpenChange = vi.fn()
    const { rerender } = render(<App provider={{ open: true, onOpenChange }} />)
    fireEvent.click(screen.getByRole("button", { name: "Toggle sidebar" }))
    expect(onOpenChange).toHaveBeenCalledWith(false, expect.objectContaining({ reason: "trigger" }))
    expect(pane()).toHaveAttribute("data-state", "expanded")
    rerender(<App provider={{ open: false, onOpenChange }} />)
    expect(pane()).toHaveAttribute("data-state", "collapsed")
  })

  it("exposes state and controls through useSidebar", () => {
    let api: ReturnType<typeof useSidebar> | null = null
    function Probe() {
      api = useSidebar()
      return null
    }
    render(
      <App collapsible="icon">
        <Probe />
      </App>
    )
    expect(api!).toMatchObject({ state: "expanded", open: true, isMobile: false, side: "start", collapsible: "icon" })
    act(() => api!.toggle())
    expect(api!.state).toBe("collapsed")
    act(() => api!.setOpen(true))
    expect(pane()).toHaveAttribute("data-state", "expanded")
  })
})

describe("shortcut", () => {
  it("toggles with Ctrl+B, but not in rich text or a custom text box", () => {
    render(
      <App>
        <div contentEditable suppressContentEditableWarning data-testid="editor">
          Text
        </div>
        <div role="textbox" tabIndex={0} data-testid="custom" />
      </App>
    )
    fireEvent.keyDown(window, { key: "b", ctrlKey: true })
    expect(pane()).toHaveAttribute("data-state", "collapsed")
    fireEvent.keyDown(screen.getByTestId("editor"), { key: "b", ctrlKey: true })
    fireEvent.keyDown(screen.getByTestId("custom"), { key: "b", ctrlKey: true })
    expect(pane()).toHaveAttribute("data-state", "collapsed")
    fireEvent.keyDown(document.body, { key: "b", ctrlKey: true })
    expect(pane()).toHaveAttribute("data-state", "expanded")
  })

  it("shows the shortcut on the trigger, and can be switched off", () => {
    const { unmount } = render(<App />)
    expect(screen.getByRole("button", { name: "Toggle sidebar" })).toHaveAttribute("aria-keyshortcuts", "Control+B")
    unmount()
    render(<App provider={{ shortcut: false }} />)
    expect(screen.getByRole("button", { name: "Toggle sidebar" })).not.toHaveAttribute("aria-keyshortcuts")
    fireEvent.keyDown(window, { key: "b", ctrlKey: true })
    expect(pane()).toHaveAttribute("data-state", "expanded")
  })
})

describe("persistence", () => {
  it("remembers the open state, width and groups, and restores them", () => {
    const { unmount } = render(<App provider={{ storageKey: "test.sidebar" }} />)
    fireEvent.click(screen.getByRole("button", { name: "Projects" }))
    const rail = screen.getByRole("separator", { name: "Resize sidebar" })
    fireEvent.keyDown(rail, { key: "End" })
    fireEvent.click(screen.getByRole("button", { name: "Toggle sidebar" }))
    expect(normaliseSidebarPrefs(JSON.parse(localStorage.getItem("test.sidebar")!))).toEqual({
      open: false,
      width: 28,
      groups: { projects: false },
    })
    unmount()
    render(<App provider={{ storageKey: "test.sidebar" }} />)
    expect(pane()).toHaveAttribute("data-state", "collapsed")
    expect(pane().style.getPropertyValue("--fa-sidebar-width")).toBe("28rem")
    expect(screen.getByRole("button", { name: "Projects", hidden: true })).toHaveAttribute("aria-expanded", "false")
  })

  it("namespaces the key by the storage scope", () => {
    render(
      <StorageScopeContext.Provider value="window:mail">
        <App provider={{ storageKey: "test.sidebar" }} />
      </StorageScopeContext.Provider>
    )
    fireEvent.click(screen.getByRole("button", { name: "Toggle sidebar" }))
    expect(localStorage.getItem("test.sidebar")).toBeNull()
    expect(JSON.parse(localStorage.getItem(sidebarStorageKey("test.sidebar", "window:mail"))!)).toMatchObject({ open: false })
  })

  it("persists nothing without a storage key", () => {
    render(<App />)
    fireEvent.click(screen.getByRole("button", { name: "Toggle sidebar" }))
    expect(localStorage.length).toBe(0)
  })

  it("boots the remembered state onto the sidebar before React runs", () => {
    localStorage.setItem("boot.sidebar", JSON.stringify({ open: false, width: 19.5 }))
    const element = document.createElement("div")
    element.setAttribute("data-state", "expanded")
    element.setAttribute("data-resizable", "")
    const script = document.createElement("script")
    element.append(script)
    Object.defineProperty(document, "currentScript", { configurable: true, get: () => script })
    phone = true
    stubMedia()
    new Function(sidebarBootScript("boot.sidebar", { mobileQuery: "(width < 48rem)" }))()
    expect(element.getAttribute("data-state")).toBe("collapsed")
    expect(element.hasAttribute("data-mobile")).toBe(true)
    expect(element.style.getPropertyValue("--fa-sidebar-width")).toBe("19.5rem")
    // A controlled sidebar keeps the server's state; the width still applies.
    element.setAttribute("data-state", "expanded")
    new Function(sidebarBootScript("boot.sidebar", { applyOpen: false }))()
    expect(element.getAttribute("data-state")).toBe("expanded")
    Reflect.deleteProperty(document, "currentScript")
  })
})

describe("icon mode", () => {
  it("keeps every name, adds label tooltips, and moves counts onto the icon", () => {
    render(<App collapsible="icon" />)
    const inbox = screen.getByRole("link", { name: "Inbox" })
    expect(inbox).not.toHaveAttribute("data-base-ui-tooltip-trigger")
    expect(inbox).toHaveAttribute("aria-current", "page")
    expect(inbox).toHaveAttribute("aria-describedby", document.querySelector(".fa-sidebar-menu-badge")!.id)
    fireEvent.click(screen.getByRole("button", { name: "Collapse sidebar" }))
    expect(pane()).toHaveAttribute("data-state", "collapsed")
    expect(screen.getByRole("link", { name: "Inbox" })).toHaveAttribute("data-base-ui-tooltip-trigger")
    expect(document.querySelector(".fa-sidebar-menu-badge")).toHaveAttribute("data-overlay")
    // Header toggle becomes the expand control; the pane stays focusable (not inert).
    expect(screen.getByRole("button", { name: "Expand sidebar" })).toBeInTheDocument()
    expect(document.querySelector(".fa-sidebar-pane")).not.toHaveAttribute("inert")
  })

  it("turns a sub-menu's disclosure into a flyout menu trigger", async () => {
    render(<App collapsible="icon" />)
    const reports = screen.getByRole("button", { name: "Reports" })
    expect(reports).toHaveAttribute("aria-expanded", "true")
    expect(reports).toHaveAttribute("aria-controls", document.querySelector(".fa-sidebar-menu-sub-panel")!.id)
    fireEvent.click(reports)
    expect(reports).toHaveAttribute("aria-expanded", "false")
    fireEvent.click(screen.getByRole("button", { name: "Collapse sidebar" }))
    // The flyout's menu parts load after an icon-mode sidebar with sub-menus mounts.
    await waitFor(() => expect(screen.getByRole("button", { name: "Reports" })).toHaveAttribute("aria-haspopup", "menu"))
    const trigger = screen.getByRole("button", { name: "Reports" })
    fireEvent.click(trigger)
    const menu = screen.getByRole("menu")
    expect(within(menu).getByText("Reports")).toBeInTheDocument()
    expect(within(menu).getByRole("menuitem", { name: "Weekly" })).toHaveAttribute("href", "#weekly")
  })

  it("remembers a sub-menu by its id", () => {
    const { unmount } = render(<App provider={{ storageKey: "sub.sidebar" }} />)
    fireEvent.click(screen.getByRole("button", { name: "Reports" }))
    expect(JSON.parse(localStorage.getItem("sub.sidebar")!).groups).toMatchObject({ reports: false })
    unmount()
    render(<App provider={{ storageKey: "sub.sidebar" }} />)
    expect(screen.getByRole("button", { name: "Reports" })).toHaveAttribute("aria-expanded", "false")
  })
})

describe("focus on collapse", () => {
  it("moves focus from an off-canvas sidebar to the trigger", () => {
    render(<App />)
    const inbox = screen.getByRole("link", { name: "Inbox" })
    inbox.focus()
    fireEvent.keyDown(inbox, { key: "b", ctrlKey: true })
    expect(pane()).toHaveAttribute("data-state", "collapsed")
    expect(screen.getByRole("button", { name: "Toggle sidebar" })).toHaveFocus()
  })

  it("in icon mode keeps focus on a button that stays, and moves it off parts that hide", () => {
    render(<App collapsible="icon" search />)
    const inbox = screen.getByRole("link", { name: "Inbox" })
    inbox.focus()
    fireEvent.keyDown(inbox, { key: "b", ctrlKey: true })
    expect(inbox).toHaveFocus()
    fireEvent.keyDown(inbox, { key: "b", ctrlKey: true })
    expect(pane()).toHaveAttribute("data-state", "expanded")

    const field = screen.getByRole("searchbox", { name: "Filter navigation" })
    field.focus()
    act(() => {
      fireEvent.keyDown(document.body, { key: "b", ctrlKey: true })
    })
    // The field was focused when the shortcut came from elsewhere: it hides, so focus moves
    // to the icon-mode filter button in its place.
    expect(pane()).toHaveAttribute("data-state", "collapsed")
    expect(screen.getByRole("button", { name: "Filter navigation" })).toHaveFocus()

    fireEvent.click(screen.getByRole("button", { name: "Expand sidebar" }))
    screen.getByRole("link", { name: "Weekly" }).focus()
    fireEvent.click(screen.getByRole("button", { name: "Toggle sidebar" }))
    expect(screen.getByRole("button", { name: "Reports" })).toHaveFocus()
  })
})

describe("phone", () => {
  it("renders a sheet from the trigger and closes it when a destination is chosen", async () => {
    phone = true
    stubMedia()
    render(<App />)
    expect(pane()).toHaveAttribute("data-mobile")
    expect(document.querySelector(".fa-sidebar-pane")).toBeNull()
    const trigger = screen.getByRole("button", { name: "Toggle sidebar" })
    expect(trigger).toHaveAttribute("aria-expanded", "false")
    fireEvent.click(trigger)
    // The sheet's module loads when the phone layout first applies.
    const sheet = await screen.findByRole("dialog", { name: "Workspace" })
    expect(within(sheet).getByRole("navigation", { name: "Workspace" })).toBeInTheDocument()
    expect(trigger).toHaveAttribute("aria-expanded", "true")
    // Ctrl+B toggles the sheet on phones too.
    fireEvent.click(within(sheet).getByRole("link", { name: "Inbox" }))
    expect(trigger).toHaveAttribute("aria-expanded", "false")
  })
})

describe("rows with more than a label", () => {
  function Rows({ query = "", fill = false }: { query?: string; fill?: boolean }) {
    return (
      <SidebarProvider>
        <Sidebar collapsible="icon" aria-label="Workspace">
          <Sidebar.Content fill={fill}>
            <Sidebar.Group>
              <Sidebar.GroupLabel count={3}>Projects</Sidebar.GroupLabel>
              <Sidebar.Menu>
                <Sidebar.MenuItem>
                  <Sidebar.MenuButton icon={<svg />} detail="Avery Chen" count={1204}>
                    <Sidebar.Match text="Atlas redesign" query={query} />
                  </Sidebar.MenuButton>
                </Sidebar.MenuItem>
                <Sidebar.MenuItem>
                  <Sidebar.MenuButton face={<span data-testid="face">Northwind Traders</span>}>Northwind</Sidebar.MenuButton>
                </Sidebar.MenuItem>
              </Sidebar.Menu>
            </Sidebar.Group>
            <div data-testid="tree" />
          </Sidebar.Content>
        </Sidebar>
        <SidebarInset />
      </SidebarProvider>
    )
  }

  it("reads a detail line and a quiet count as part of the row's name", () => {
    render(<Rows />)
    const row = screen.getByRole("button", { name: /Atlas redesign/ })
    expect(row).toHaveTextContent("Atlas redesignAvery Chen1,204")
    expect(row).toHaveAttribute("data-detail")
    expect(row.querySelector(".fa-sidebar-menu-detail")).toHaveTextContent("Avery Chen")
    expect(row.querySelector(".fa-sidebar-menu-count")).toHaveTextContent("1,204")
  })

  it("draws a face instead of the icon and label, keeping the label for the icon-mode tooltip", () => {
    render(<Rows />)
    const row = screen.getByRole("button", { name: "Northwind Traders" })
    expect(within(row).getByTestId("face")).toBeInTheDocument()
    expect(row.querySelector(".fa-sidebar-menu-label")).toBeNull()
    expect(row).toHaveAttribute("data-detail")
  })

  it("marks a filter's matches in a label", () => {
    render(<Rows query="red" />)
    const row = screen.getByRole("button", { name: /Atlas redesign/ })
    expect(row.querySelector("mark")).toHaveTextContent("red")
    expect(row.querySelector(".fa-sidebar-menu-label")).toHaveTextContent("Atlas redesign")
  })

  it("counts a group's items after its label", () => {
    render(<Rows />)
    expect(screen.getByRole("group", { name: "Projects3" }).querySelector(".fa-sidebar-group-count")).toHaveTextContent("3")
  })

  it("lets the last child fill and scroll itself when the content fills", () => {
    const { unmount } = render(<Rows />)
    const content = document.querySelector(".fa-sidebar-content")!
    expect(content).toHaveAttribute("data-scroll-container")
    expect(content).not.toHaveAttribute("data-fill")
    unmount()
    render(<Rows fill />)
    expect(document.querySelector(".fa-sidebar-content")).toHaveAttribute("data-fill")
    expect(document.querySelector(".fa-sidebar-content")).not.toHaveAttribute("data-scroll-container")
  })
})
