// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { useMemo, useState } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { defineActions, ActionProvider, useActionShortcuts } from "../actions/index.js"
import { Kbd, configureShortcuts, canonicalShortcut, formatShortcut, isChord, shortcutFromEvent, shortcutSteps } from "../kbd/index.js"
import { findConflicts, KeymapProvider, normaliseKeymap, ShortcutHelpDialog, useKeymap, useShortcutCommands, type Keymap, type ShortcutCommand } from "./index.js"

beforeEach(() => {
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener: () => undefined, removeEventListener: () => undefined }))
})
afterEach(() => {
  cleanup()
  configureShortcuts({ characterKeys: true })
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

function Commands({ commands }: { commands: ShortcutCommand[] }) {
  useShortcutCommands(useMemo(() => commands, [commands]))
  return (
    <div>
      <input aria-label="Field" />
      <div contentEditable suppressContentEditableWarning data-testid="rich" />
      <button>Target</button>
    </div>
  )
}

const press = (key: string, init: KeyboardEventInit = {}, target: Element = document.body) => {
  fireEvent.keyDown(target, { key, ...init })
}

describe("chord parsing", () => {
  it("splits steps, formats them and leaves single shortcuts alone", () => {
    expect(shortcutSteps("mod+k mod+s")).toEqual(["mod+k", "mod+s"])
    expect(shortcutSteps("mod + k")).toEqual(["mod+k"])
    expect(isChord("g e")).toBe(true)
    expect(isChord("mod+shift+k")).toBe(false)
    expect(formatShortcut("mod+k mod+s", "other")).toBe("Ctrl+K Ctrl+S")
    expect(formatShortcut("mod+k mod+s", "mac")).toBe("⌘K ⌘S")
    expect(formatShortcut("mod+shift+r", "other")).toBe("Ctrl+Shift+R")
    expect(canonicalShortcut("shift+cmd+K", "other")).toBe(canonicalShortcut("ctrl+shift+k", "other"))
  })

  it("writes a press portably", () => {
    expect(shortcutFromEvent({ key: "k", ctrlKey: true, metaKey: false, altKey: false, shiftKey: false }, "other")).toBe("mod+k")
    expect(shortcutFromEvent({ key: "k", ctrlKey: false, metaKey: true, altKey: false, shiftKey: true }, "mac")).toBe("shift+mod+k")
    expect(shortcutFromEvent({ key: "?", ctrlKey: false, metaKey: false, altKey: false, shiftKey: true }, "other")).toBe("?")
    expect(shortcutFromEvent({ key: "Control", ctrlKey: true, metaKey: false, altKey: false, shiftKey: false }, "other")).toBeNull()
  })

  it("Kbd shows each step of a chord and keeps one combination's markup", () => {
    const view = render(<Kbd keys="mod+k mod+s" />)
    expect(view.container.querySelector("[data-chord]")).not.toBeNull()
    expect(view.container.querySelectorAll(".fa-kbd-step")).toHaveLength(2)
    expect(view.container.querySelectorAll(".fa-kbd-key")).toHaveLength(4)
    view.rerender(<Kbd keys="mod+k" />)
    expect(view.container.querySelector("[data-chord]")).toBeNull()
    expect(view.container.querySelector(".fa-kbd-step")).toBeNull()
  })
})

describe("conflicts", () => {
  it("finds the same keys, a chord's prefix and browser keys, and respects contexts", () => {
    const found = findConflicts(
      [
        { id: "a", keys: ["mod+s"] },
        { id: "b", keys: ["ctrl+s"] },
        { id: "c", keys: ["mod+k"] },
        { id: "d", keys: ["mod+k mod+s"] },
        { id: "e", keys: ["mod+w"] },
        { id: "f", context: "list", keys: ["enter"] },
        { id: "g", context: "editor", keys: ["enter"] },
      ],
      "other"
    )
    expect(found.map((conflict) => [conflict.kind, conflict.commands])).toEqual([
      ["same", ["a", "b"]],
      ["prefix", ["c", "d"]],
      ["reserved", ["e"]],
    ])
  })

  it("normalises stored keymaps", () => {
    expect(normaliseKeymap({ a: ["mod+s"], b: [], c: "mod+k", d: [1], e: [""] })).toEqual({ a: ["mod+s"], b: [] })
    expect(normaliseKeymap(null)).toEqual({})
    expect(normaliseKeymap([])).toEqual({})
  })
})

describe("dispatcher", () => {
  it("runs a plain shortcut, and not in text entry unless the binding asks", () => {
    const save = vi.fn()
    const find = vi.fn()
    const rich = vi.fn()
    render(
      <KeymapProvider>
        <Commands
          commands={[
            { id: "save", label: "Save", keys: "mod+s", run: save },
            { id: "find", label: "Find", keys: "mod+f", textEntry: "inputs", run: find },
            { id: "rich", label: "Rich", keys: "mod+g", textEntry: "all", run: rich },
          ]}
        />
      </KeymapProvider>
    )
    const field = screen.getByRole("textbox", { name: "Field" })
    const editor = screen.getByTestId("rich")
    press("s", { ctrlKey: true }, field)
    expect(save).not.toHaveBeenCalled()
    press("s", { ctrlKey: true })
    expect(save).toHaveBeenCalledTimes(1)
    press("f", { ctrlKey: true }, field)
    expect(find).toHaveBeenCalledTimes(1)
    press("g", { ctrlKey: true }, field)
    expect(rich).toHaveBeenCalledTimes(1)
    press("f", { ctrlKey: true }, editor)
    expect(find).toHaveBeenCalledTimes(1)
    press("g", { ctrlKey: true }, editor)
    expect(rich).toHaveBeenCalledTimes(2)
  })

  it("leaves a key that a widget handled first", () => {
    const save = vi.fn()
    render(
      <KeymapProvider>
        <Commands commands={[{ id: "save", label: "Save", keys: "mod+s", textEntry: "all", run: save }]} />
        <button onKeyDown={(event) => event.preventDefault()}>Handled</button>
      </KeymapProvider>
    )
    press("s", { ctrlKey: true }, screen.getByRole("button", { name: "Handled" }))
    expect(save).not.toHaveBeenCalled()
  })

  it("waits for a chord's next step, shows it, runs it and times out", () => {
    vi.useFakeTimers()
    const save = vi.fn()
    render(
      <KeymapProvider chordTimeout={1000}>
        <Commands commands={[{ id: "save", label: "Save all", keys: "mod+k mod+s", run: save }]} />
      </KeymapProvider>
    )
    press("k", { ctrlKey: true })
    expect(document.querySelector("[data-pending]")).not.toBeNull()
    expect(document.querySelector(".fa-keymap-announcer")).toHaveTextContent("Ctrl+K pressed. Waiting for the next key.")
    press("Control", { ctrlKey: true })
    press("s", { ctrlKey: true })
    expect(save).toHaveBeenCalledTimes(1)
    expect(document.querySelector("[data-pending]")).toBeNull()

    press("k", { ctrlKey: true })
    act(() => void vi.advanceTimersByTime(1100))
    expect(document.querySelector("[data-pending]")).toBeNull()
    press("s", { ctrlKey: true })
    expect(save).toHaveBeenCalledTimes(1)
  })

  it("Escape or another key ends a chord without reaching the page", () => {
    const save = vi.fn()
    const other = vi.fn()
    render(
      <KeymapProvider>
        <Commands
          commands={[
            { id: "save", label: "Save all", keys: "mod+k mod+s", run: save },
            { id: "other", label: "Other", keys: "x", run: other },
          ]}
        />
      </KeymapProvider>
    )
    const outer = vi.fn()
    document.addEventListener("keydown", outer)
    press("k", { ctrlKey: true })
    outer.mockClear()
    press("Escape")
    expect(outer).not.toHaveBeenCalled()
    expect(document.querySelector("[data-pending]")).toBeNull()
    press("k", { ctrlKey: true })
    press("x")
    expect(other).not.toHaveBeenCalled()
    expect(save).not.toHaveBeenCalled()
    document.removeEventListener("keydown", outer)
  })

  it("obeys configureShortcuts, when and disabledReason", () => {
    const run = vi.fn()
    const view = (command: Partial<ShortcutCommand>) => (
      <KeymapProvider>
        <Commands commands={[{ id: "go", label: "Go", keys: "g e", run, ...command }]} />
      </KeymapProvider>
    )
    const first = render(view({}))
    configureShortcuts({ characterKeys: false })
    press("g")
    expect(document.querySelector("[data-pending]")).toBeNull()
    configureShortcuts({ characterKeys: true })
    press("g")
    press("e")
    expect(run).toHaveBeenCalledTimes(1)
    first.unmount()
    render(view({ keys: "x", when: () => false }))
    press("x")
    cleanup()
    render(view({ keys: "x", disabledReason: "No document" }))
    press("x")
    expect(run).toHaveBeenCalledTimes(1)
  })

  it("follows a controlled keymap and an unbound command", () => {
    const run = vi.fn()
    const commands = [{ id: "go", label: "Go", keys: "mod+g", run }]
    const view = render(
      <KeymapProvider keymap={{ go: ["mod+j"] }}>
        <Commands commands={commands} />
      </KeymapProvider>
    )
    press("g", { ctrlKey: true })
    expect(run).not.toHaveBeenCalled()
    press("j", { ctrlKey: true })
    expect(run).toHaveBeenCalledTimes(1)
    view.rerender(
      <KeymapProvider keymap={{ go: [] }}>
        <Commands commands={commands} />
      </KeymapProvider>
    )
    press("j", { ctrlKey: true })
    expect(run).toHaveBeenCalledTimes(1)
  })
})

describe("actions", () => {
  it("registers an action's shortcut from its definition, with a stable id", () => {
    const run = vi.fn()
    const set = defineActions<{ id: string }>("site", [{ id: "restart", label: "Restart", group: "manage", shortcut: "mod+shift+r", run }])
    const onKeymapChange = vi.fn()
    function Host() {
      const targets = useMemo(() => [{ id: "a" }], [])
      useActionShortcuts(set, targets, "Sites")
      const keymap = useKeymap()
      return <button onClick={() => keymap.rebind("site.restart", ["mod+j"])}>Rebind {keymap.keysFor("site.restart").join()}</button>
    }
    render(
      <KeymapProvider onKeymapChange={onKeymapChange}>
        <ActionProvider navigate={() => undefined}>
          <Host />
        </ActionProvider>
      </KeymapProvider>
    )
    press("r", { ctrlKey: true, shiftKey: true })
    expect(run).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole("button", { name: /Rebind/ }))
    expect(onKeymapChange).toHaveBeenCalledWith({ "site.restart": ["mod+j"] })
    press("j", { ctrlKey: true })
    expect(run).toHaveBeenCalledTimes(2)
  })
})

describe("ShortcutHelpDialog", () => {
  function Help({ onKeymap }: { onKeymap?: (keymap: Keymap) => void }) {
    const [keymap, setKeymap] = useState<Keymap>({})
    return (
      <KeymapProvider
        keymap={keymap}
        onKeymapChange={(next) => {
          setKeymap(next)
          onKeymap?.(next)
        }}
      >
        <Commands
          commands={[
            { id: "save", label: "Save", group: "File", keys: "mod+s", run: () => undefined },
            { id: "open", label: "Open", group: "File", keys: "mod+o", keywords: ["load"], run: () => undefined },
            { id: "all", label: "Save all", group: "View", keys: "mod+k mod+s", run: () => undefined },
          ]}
        />
        <ShortcutHelpDialog defaultOpen rebind />
      </KeymapProvider>
    )
  }

  it("lists groups, searches and shows the keys with Kbd", () => {
    render(<Help />)
    const dialog = screen.getByRole("dialog", { name: "Keyboard shortcuts" })
    expect(within(dialog).getByRole("region", { name: "File" })).toBeInTheDocument()
    expect(dialog.querySelector('[data-command="all"] [data-chord]')).not.toBeNull()
    fireEvent.change(within(dialog).getByRole("searchbox", { name: "Search shortcuts" }), { target: { value: "load" } })
    expect(dialog.querySelector('[data-command="open"]')).not.toBeNull()
    expect(dialog.querySelector('[data-command="save"]')).toBeNull()
    fireEvent.change(within(dialog).getByRole("searchbox", { name: "Search shortcuts" }), { target: { value: "nothing" } })
    expect(dialog).toHaveTextContent("No shortcuts match “nothing”")
  })

  it("records a new shortcut, warns of a clash and takes it from the other command", () => {
    const onKeymap = vi.fn()
    render(<Help onKeymap={onKeymap} />)
    const dialog = screen.getByRole("dialog")
    fireEvent.click(within(dialog).getByRole("button", { name: "Change the shortcut for Open" }))
    const input = within(dialog).getByRole("textbox", { name: "New shortcut for Open" })
    fireEvent.keyDown(input, { key: "s", ctrlKey: true })
    expect(input).toHaveValue("Ctrl+S")
    expect(dialog).toHaveTextContent("Also assigned to Save. Saving removes it there.")
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }))
    expect(onKeymap).toHaveBeenCalledWith({ open: ["mod+s"], save: [] })
  })

  it("Escape cancels recording and leaves the dialog open; the browser's keys cannot be saved", () => {
    render(<Help />)
    const dialog = screen.getByRole("dialog")
    fireEvent.click(within(dialog).getByRole("button", { name: "Change the shortcut for Open" }))
    const input = within(dialog).getByRole("textbox", { name: "New shortcut for Open" })
    fireEvent.keyDown(input, { key: "w", ctrlKey: true })
    expect(within(dialog).getByRole("button", { name: "Save" })).toBeDisabled()
    fireEvent.keyDown(input, { key: "Escape" })
    expect(within(dialog).queryByRole("textbox", { name: "New shortcut for Open" })).toBeNull()
    expect(screen.getByRole("dialog")).toBeInTheDocument()
  })
})
