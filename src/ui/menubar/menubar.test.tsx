// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { defineActions } from "../actions/index.js"
import { KeymapProvider, useKeymap } from "../keymap/index.js"
import { Menubar, MenubarSkeleton, useMenubarActions, type MenubarEntry, type MenubarMenu } from "./index.js"

afterEach(cleanup)

const MENUS: MenubarMenu[] = [
  { id: "file", label: "File", items: [{ id: "save", label: "Save", shortcut: "mod+s" }] },
  { id: "edit", label: "Edit", items: [{ id: "undo", label: "Undo" }] },
]

const trigger = (name: string) => screen.getByRole("menuitem", { name })

describe("Menubar", () => {
  it("is a named menubar of triggers, with one tab stop", () => {
    render(<Menubar aria-label="Application" menus={MENUS} />)
    expect(screen.getByRole("menubar", { name: "Application" })).toBeTruthy()
    expect(trigger("File").getAttribute("aria-haspopup")).toBe("menu")
    expect([trigger("File"), trigger("Edit")].filter((item) => item.tabIndex === 0)).toHaveLength(1)
  })

  it("opens uncontrolled from defaultOpenMenu and reports changes", async () => {
    const change = vi.fn()
    render(<Menubar aria-label="Application" menus={MENUS} defaultOpenMenu="file" onOpenMenuChange={change} />)
    expect(await screen.findByRole("menuitem", { name: /^Save/ })).toBeTruthy()
    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" })
    await waitFor(() => expect(change).toHaveBeenCalledWith(null))
  })

  it("follows openMenu when controlled, reporting only what the person does", async () => {
    const change = vi.fn()
    const { rerender } = render(<Menubar aria-label="Application" menus={MENUS} openMenu="edit" onOpenMenuChange={change} />)
    expect(await screen.findByRole("menuitem", { name: "Undo" })).toBeTruthy()
    rerender(<Menubar aria-label="Application" menus={MENUS} openMenu="file" onOpenMenuChange={change} />)
    expect(await screen.findByRole("menuitem", { name: /^Save/ })).toBeTruthy()
    expect(change).not.toHaveBeenCalled()
  })

  it("drops skipped rows and a separator with nothing on one side", async () => {
    const items: (MenubarEntry | false | null)[] = [
      { kind: "separator", id: "a" },
      { id: "one", label: "One" },
      false,
      { kind: "separator", id: "b" },
      { kind: "separator", id: "c" },
      null,
      { id: "two", label: "Two" },
      { kind: "separator", id: "d" },
    ]
    render(<Menubar aria-label="Application" menus={[{ id: "m", label: "Menu A", items }]} defaultOpenMenu="m" />)
    await screen.findByRole("menuitem", { name: "One" })
    expect(document.querySelectorAll(".fa-popup-separator")).toHaveLength(1)
  })

  it("says so when a menu has no rows", async () => {
    render(<Menubar aria-label="Application" menus={[{ id: "m", label: "Menu A", items: [] }]} defaultOpenMenu="m" labels={{ empty: "Nothing yet" }} />)
    expect(await screen.findByRole("menuitem", { name: "Nothing yet" })).toBeTruthy()
  })

  it("runs a command after the menu closes, row first, then onCommand", async () => {
    const order: string[] = []
    const menus: MenubarMenu[] = [{ id: "m", label: "Menu A", items: [{ id: "go", label: "Go", onSelect: () => order.push("row") }] }]
    render(<Menubar aria-label="Application" menus={menus} defaultOpenMenu="m" onCommand={(id) => order.push(`command:${id}`)} />)
    fireEvent.click(await screen.findByRole("menuitem", { name: "Go" }))
    expect(order).toEqual([])
    await waitFor(() => expect(order).toEqual(["row", "command:go"]))
  })

  it("does not run a disabled row, and describes it", async () => {
    const select = vi.fn()
    const menus: MenubarMenu[] = [
      {
        id: "m",
        label: "Menu A",
        items: [
          { id: "go", label: "Go", disabledReason: "Nothing selected", onSelect: select },
          { kind: "check", id: "c", label: "Toggle", checked: false, onCheckedChange: select, disabledReason: "Read only" },
          { kind: "radio", id: "r", label: "Size", value: "s", onValueChange: select, options: [{ value: "s", label: "Small" }, { value: "l", label: "Large", disabledReason: "Too large" }] },
        ],
      },
    ]
    render(<Menubar aria-label="Application" menus={menus} defaultOpenMenu="m" />)
    const go = await screen.findByRole("menuitem", { name: "Go" })
    expect(go.getAttribute("aria-disabled")).toBe("true")
    fireEvent.click(go)
    expect(document.getElementById(go.getAttribute("aria-describedby")!)!.textContent).toBe("Nothing selected")
    const toggle = screen.getByRole("menuitemcheckbox", { name: "Toggle" })
    expect(document.getElementById(toggle.getAttribute("aria-describedby")!)!.textContent).toBe("Read only")
    fireEvent.click(toggle)
    const large = screen.getByRole("menuitemradio", { name: "Large" })
    expect(document.getElementById(large.getAttribute("aria-describedby")!)!.textContent).toBe("Too large")
    fireEvent.click(large)
    await new Promise((resolve) => setTimeout(resolve, 5))
    expect(select).not.toHaveBeenCalled()
  })

  it("toggles and choices report and leave the menu open", async () => {
    const checked = vi.fn()
    const chosen = vi.fn()
    const menus: MenubarMenu[] = [
      {
        id: "m",
        label: "Menu A",
        items: [
          { kind: "check", id: "c", label: "Toggle", checked: false, onCheckedChange: checked },
          { kind: "radio", id: "r", label: "Size", value: "s", onValueChange: chosen, options: [{ value: "s", label: "Small" }, { value: "l", label: "Large" }] },
        ],
      },
    ]
    render(<Menubar aria-label="Application" menus={menus} defaultOpenMenu="m" />)
    fireEvent.click(await screen.findByRole("menuitemcheckbox", { name: "Toggle" }))
    expect(checked).toHaveBeenCalledWith(true)
    fireEvent.click(screen.getByRole("menuitemradio", { name: "Large" }))
    expect(chosen.mock.calls[0]![0]).toBe("l")
    expect(screen.getByRole("group", { name: "Size" })).toBeTruthy()
    expect(screen.getByRole("menuitemcheckbox", { name: "Toggle" })).toBeTruthy()
  })

  it("collapses on request, keeping every menu a row of the one menu", async () => {
    render(<Menubar aria-label="Application" menus={MENUS} collapse="always" defaultOpenMenu="any" labels={{ menu: "All menus" }} />)
    expect(trigger("All menus")).toBeTruthy()
    expect(screen.getByRole("menubar", { name: "Application" })).toBeTruthy()
    expect(await screen.findByRole("menuitem", { name: "File" })).toBeTruthy()
    expect(screen.getByRole("menuitem", { name: "Edit" }).getAttribute("aria-haspopup")).toBe("menu")
  })
})

describe("Menubar loaded rows", () => {
  const deferred = () => {
    let resolve!: (entries: MenubarEntry[]) => void
    let reject!: (error: Error) => void
    const promise = new Promise<MenubarEntry[]>((done, fail) => {
      resolve = done
      reject = fail
    })
    return { promise, resolve, reject }
  }

  it("reserves rows while loading, then shows what arrived", async () => {
    const { promise, resolve } = deferred()
    render(<Menubar aria-label="Application" menus={[{ id: "m", label: "Menu A", loadingRows: 3, loadItems: () => promise }]} defaultOpenMenu="m" />)
    expect(await screen.findByRole("menuitem", { name: "Loading" })).toBeTruthy()
    expect(document.querySelectorAll(".fa-item[data-loading]")).toHaveLength(3)
    await act(async () => resolve([{ id: "one", label: "One" }]))
    expect(screen.getByRole("menuitem", { name: "One" })).toBeTruthy()
    expect(document.querySelectorAll(".fa-item[data-loading]")).toHaveLength(0)
  })

  it("takes rows returned at once, with no placeholder to replace", async () => {
    render(<Menubar aria-label="Application" menus={[{ id: "m", label: "Menu A", loadItems: () => [{ id: "one", label: "One" }] }]} defaultOpenMenu="m" />)
    expect(await screen.findByRole("menuitem", { name: "One" })).toBeTruthy()
    expect(document.querySelector(".fa-item[data-loading]")).toBeNull()
  })

  it("shows a failure without the raw message, announces it, and retries in place", async () => {
    const first = deferred()
    const load = vi.fn().mockReturnValueOnce(first.promise).mockResolvedValueOnce([{ id: "one", label: "One" }])
    render(<Menubar aria-label="Application" menus={[{ id: "m", label: "Menu A", loadItems: load }]} defaultOpenMenu="m" />)
    await screen.findByRole("menuitem", { name: "Loading" })
    await act(async () => first.reject(new Error("503 from upstream")))
    const failure = document.querySelector(".fa-menubar-failure")!
    expect(failure.textContent).toBe("These items could not be loaded.")
    expect(document.body.textContent).not.toContain("503")
    expect(document.querySelector('.fa-menubar-box [aria-live="polite"]')!.textContent).toBe("These items could not be loaded.")
    await act(async () => fireEvent.click(screen.getByRole("menuitem", { name: "Try again" })))
    expect(await screen.findByRole("menuitem", { name: "One" })).toBeTruthy()
    expect(document.querySelector('.fa-menubar-box [aria-live="polite"]')!.textContent).toBe("")
    expect(load).toHaveBeenCalledTimes(2)
  })

  it("lets the host word a failure and an empty result", async () => {
    const menus: MenubarMenu[] = [
      { id: "a", label: "Menu A", loadError: (error) => `Offline: ${(error as Error).message}`, loadItems: () => Promise.reject(new Error("try later")) },
      { id: "b", label: "Menu B", emptyLabel: "Nothing recent", loadItems: () => [] },
    ]
    const { rerender } = render(<Menubar aria-label="Application" menus={menus} openMenu="a" />)
    await waitFor(() => expect(document.querySelector(".fa-menubar-failure")?.textContent).toBe("Offline: try later"))
    rerender(<Menubar aria-label="Application" menus={menus} openMenu="b" />)
    expect(await screen.findByRole("menuitem", { name: "Nothing recent" })).toBeTruthy()
  })

  it("aborts when the menu closes, and a late answer changes nothing", async () => {
    const { promise, resolve } = deferred()
    let signal: AbortSignal | undefined
    const menus: MenubarMenu[] = [{ id: "m", label: "Menu A", loadItems: (context) => ((signal = context.signal), promise) }]
    const { rerender } = render(<Menubar aria-label="Application" menus={menus} openMenu="m" />)
    await screen.findByRole("menuitem", { name: "Loading" })
    rerender(<Menubar aria-label="Application" menus={menus} openMenu={null} />)
    await waitFor(() => expect(signal!.aborted).toBe(true))
    await act(async () => resolve([{ id: "one", label: "One" }]))
    expect(screen.queryByRole("menuitem", { name: "One" })).toBeNull()
  })

  it("does not load again when the host re-renders with a new function", async () => {
    const load = vi.fn(() => [{ id: "one", label: "One" }])
    const menus = (): MenubarMenu[] => [{ id: "m", label: "Menu A", loadItems: () => load() }]
    const { rerender } = render(<Menubar aria-label="Application" menus={menus()} defaultOpenMenu="m" />)
    await screen.findByRole("menuitem", { name: "One" })
    rerender(<Menubar aria-label="Application" menus={menus()} defaultOpenMenu="m" />)
    expect(load).toHaveBeenCalledTimes(1)
  })
})

describe("Menubar shortcuts", () => {
  const withKeymap = (keymap?: Record<string, string[]>) =>
    function Wrapper({ children }: { children: ReactNode }) {
      return <KeymapProvider keymap={keymap}>{children}</KeymapProvider>
    }

  it("shows keys with no KeymapProvider, registering nothing", async () => {
    render(<Menubar aria-label="Application" menus={MENUS} defaultOpenMenu="file" />)
    const save = await screen.findByRole("menuitem", { name: /^Save/ })
    expect(save.querySelector(".fa-kbd")).toBeTruthy()
  })

  it("adds no command to the dispatcher, and shows a rebinding by command id", async () => {
    const seen: number[] = []
    function Probe() {
      seen.push(useKeymap().commands.length)
      return null
    }
    const menus: MenubarMenu[] = [{ id: "m", label: "Menu A", items: [{ id: "save", label: "Save", commandId: "doc.save", shortcut: "mod+s" }, { id: "fold", label: "Fold", shortcut: "mod+k mod+0" }] }]
    render(
      <>
        <Menubar aria-label="Application" menus={menus} defaultOpenMenu="m" />
        <Probe />
      </>,
      { wrapper: withKeymap({ "doc.save": ["alt+s"] }) }
    )
    const save = await screen.findByRole("menuitem", { name: /^Save/ })
    expect(save.querySelector(".fa-kbd")!.textContent).toMatch(/Alt|⌥/)
    expect(screen.getByRole("menuitem", { name: /^Fold/ }).querySelectorAll("kbd, .fa-kbd-step").length).toBeGreaterThan(0)
    expect(seen.every((count) => count === 0)).toBe(true)
  })

  it("shows a scoped single key even while single-key shortcuts are off", async () => {
    const { configureShortcuts } = await import("../kbd/index.js")
    configureShortcuts({ characterKeys: false })
    try {
      const menus: MenubarMenu[] = [{ id: "m", label: "Menu A", items: [{ id: "a", label: "Scoped", shortcut: "b", shortcutScoped: true }, { id: "b", label: "Global", shortcut: "g" }] }]
      render(<Menubar aria-label="Application" menus={menus} defaultOpenMenu="m" />)
      expect((await screen.findByRole("menuitem", { name: /^Scoped/ })).querySelector(".fa-kbd")).toBeTruthy()
      expect(screen.getByRole("menuitem", { name: "Global" }).querySelector(".fa-kbd")).toBeNull()
    } finally {
      configureShortcuts({ characterKeys: true })
    }
  })
})

describe("useMenubarActions", () => {
  interface Doc {
    name: string
  }
  const run = vi.fn()
  const set = defineActions<Doc>("doc", [
    { id: "save", label: "Save", group: "manage", shortcut: "mod+s", run },
    { id: "hidden", label: "Hidden", group: "manage", visible: () => false, run },
    { id: "share", label: "Share", group: "manage", children: [{ id: "link", label: "Copy link", group: "manage", disabledReason: () => "Offline", run }] },
    { id: "delete", label: "Delete", group: "danger", run },
  ])
  const targets = [{ name: "One" }]

  it("reads the one definition: ids, keys, reasons, tones and submenus", () => {
    const { result } = renderHook(() => useMenubarActions(set, targets))
    expect(result.current.item("hidden")).toBeNull()
    expect(result.current.item("save")).toMatchObject({ id: "save", commandId: "doc.save", shortcut: "mod+s" })
    expect(result.current.item("delete")).toMatchObject({ tone: "danger" })
    expect(result.current.item("share")).toMatchObject({ kind: "submenu", items: [{ id: "link", disabledReason: "Offline" }] })
    expect(result.current.item("link")).toMatchObject({ id: "link", commandId: "doc.share.link" })
    expect(result.current.all.map((entry) => (entry as { kind: string }).kind)).toEqual(["group", "separator", "group"])
  })

  it("runs through the action runner", async () => {
    const { result } = renderHook(() => useMenubarActions(set, targets))
    const menus: MenubarMenu[] = [{ id: "m", label: "Menu A", items: [result.current.item("save")] }]
    render(<Menubar aria-label="Application" menus={menus} defaultOpenMenu="m" />)
    fireEvent.click(await screen.findByRole("menuitem", { name: /^Save/ }))
    await waitFor(() => expect(run).toHaveBeenCalledOnce())
    expect(run.mock.calls[0]![0]).toEqual(targets)
    expect(run.mock.calls[0]![1]).toMatchObject({ surface: "menu" })
  })
})

describe("MenubarSkeleton", () => {
  it("is hidden from assistive technology and stands in for each menu", () => {
    const { container } = render(<MenubarSkeleton labels={["File", "Edit"]} />)
    const root = container.firstElementChild!
    expect(root.getAttribute("aria-hidden")).toBe("true")
    expect(root.hasAttribute("inert")).toBe(true)
    expect(root.querySelectorAll(".fa-btn")).toHaveLength(2)
    expect(screen.queryByRole("menubar")).toBeNull()
  })
})
