// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { useState } from "react"
import { EntityResolverProvider } from "../entity-chip/index.js"
import type { EntityRef } from "../types.js"
import { Composer, type ComposerProps } from "./composer.js"

const people: EntityRef[] = [
  { kind: "person", id: "mira", label: "Mira Rowan" },
  { kind: "person", id: "avery", label: "Avery Quinn" },
  { kind: "person", id: "noor", label: "Noor Haddad" },
]

const commands = [
  { id: "summarise", description: "Summarise this conversation" },
  { id: "search", description: "Search the workspace", insert: "/search for " },
  { id: "translate", description: "Translate the last reply" },
]

const resolver = {
  kinds: {},
  search: (query: string) => people.filter((person) => person.label.toLowerCase().includes(query.toLowerCase())),
}

beforeEach(() => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
  )
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  )
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function Harness(props: ComposerProps) {
  const [context, setContext] = useState<EntityRef[]>([])
  return (
    <EntityResolverProvider resolver={resolver}>
      <Composer commands={commands} context={context} onContextChange={setContext} {...props} />
      <output data-testid="context">{context.map((entity) => entity.id).join(",")}</output>
    </EntityResolverProvider>
  )
}

const text = () => screen.getByRole<HTMLTextAreaElement>("textbox")

async function type(value: string) {
  const element = text()
  element.focus()
  await act(async () => {
    fireEvent.change(element, { target: { value, selectionStart: value.length } })
  })
}

async function press(key: string, init: KeyboardEventInit = {}) {
  await act(async () => {
    fireEvent.keyDown(text(), { key, ...init })
  })
}

describe("Composer menus", () => {
  it("keeps the textarea's popup semantics and leaves focus in the text", async () => {
    render(<Harness />)
    const element = text()
    expect(element.getAttribute("aria-haspopup")).toBe("listbox")
    expect(element.getAttribute("aria-autocomplete")).toBe("list")
    expect(element.getAttribute("aria-controls")).toBeNull()
    expect(element.getAttribute("aria-activedescendant")).toBeNull()
    expect(element.getAttribute("role")).toBeNull()

    await type("/s")
    const list = await screen.findByRole("listbox", { name: "Commands" })
    const options = within(list).getAllByRole("option")
    expect(options.map((option) => option.textContent)).toEqual(["/summariseSummarise this conversation", "/searchSearch the workspace"])
    expect(options[0]!.getAttribute("aria-selected")).toBe("true")
    expect(options[0]!.hasAttribute("data-highlighted")).toBe(true)
    expect(options[0]!.className).toBe("fa-item fa-ai-option")
    expect(list.className).toBe("fa-ai-options")
    expect(element.getAttribute("aria-controls")).toBe(list.id)
    expect(element.getAttribute("aria-activedescendant")).toBe(options[0]!.id)
    expect(options[0]!.id).toBe(`${list.id}-0`)
    expect(document.activeElement).toBe(element)
    expect(list.closest(".fa-ai-menu")?.getAttribute("role")).toBe("dialog")
    expect(list.closest(".fa-ai-menu")?.getAttribute("aria-label")).toBe("Commands")
    expect(list.closest(".fa-ai-menu")?.getAttribute("data-size")).toBe("md")
  })

  it("wraps with the arrow keys and picks with Enter or Tab", async () => {
    const onValueChange = vi.fn()
    render(<Harness onValueChange={onValueChange} />)
    await type("/s")
    await press("ArrowUp")
    let options = screen.getAllByRole("option")
    expect(options[1]!.getAttribute("aria-selected")).toBe("true")
    expect(text().getAttribute("aria-activedescendant")).toBe(options[1]!.id)
    await press("ArrowDown")
    options = screen.getAllByRole("option")
    expect(options[0]!.getAttribute("aria-selected")).toBe("true")
    await press("ArrowDown")
    await press("Tab")
    expect(onValueChange).toHaveBeenLastCalledWith("/search for ")
    expect(screen.queryByRole("listbox")).toBeNull()
    expect(text().value).toBe("/search for ")

    await type("/su")
    await press("Enter")
    expect(text().value).toBe("/summarise ")
  })

  it("moves the highlight on pointer move and picks on click without taking focus", async () => {
    render(<Harness />)
    await type("/")
    const options = screen.getAllByRole("option")
    await act(async () => {
      fireEvent.pointerMove(options[2]!)
    })
    expect(screen.getAllByRole("option")[2]!.getAttribute("aria-selected")).toBe("true")
    const down = fireEvent.mouseDown(options[2]!)
    expect(down).toBe(false)
    await act(async () => {
      fireEvent.click(options[2]!)
    })
    expect(text().value).toBe("/translate ")
    expect(document.activeElement).toBe(text())
  })

  it("resets the highlight when the text changes", async () => {
    render(<Harness />)
    await type("/")
    await press("ArrowDown")
    await type("/s")
    expect(screen.getAllByRole("option")[0]!.getAttribute("aria-selected")).toBe("true")
  })

  it("shows an empty line for no commands and lets Enter send", async () => {
    const onSend = vi.fn()
    render(<Harness onSend={onSend} />)
    await type("/zz")
    expect(screen.getByText("No commands match")).toBeTruthy()
    expect(screen.queryByRole("listbox")).toBeNull()
    expect(text().getAttribute("aria-activedescendant")).toBeNull()
    await press("Enter")
    expect(onSend).toHaveBeenCalledWith("/zz")
  })

  it("closes on Escape before stopping a run, then stops", async () => {
    const onStop = vi.fn()
    render(<Harness run="running" onStop={onStop} />)
    await type("/s")
    expect(screen.queryByRole("listbox")).not.toBeNull()
    await press("Escape")
    expect(onStop).not.toHaveBeenCalled()
    expect(screen.queryByRole("listbox")).toBeNull()
    await press("Escape")
    expect(onStop).toHaveBeenCalledTimes(1)
  })

  it("closes when the text loses focus", async () => {
    render(<Harness />)
    await type("/s")
    await act(async () => {
      fireEvent.blur(text())
    })
    expect(screen.queryByRole("listbox")).toBeNull()
  })

  it("ignores keys during composition", async () => {
    render(<Harness />)
    await type("/s")
    await press("ArrowDown", { isComposing: true })
    expect(screen.getAllByRole("option")[0]!.getAttribute("aria-selected")).toBe("true")
  })

  it("mentions an entity: the query, the replaced text and the context", async () => {
    render(<Harness />)
    await type("Ask @r")
    const list = await screen.findByRole("listbox")
    expect(list.getAttribute("aria-multiselectable")).toBe("true")
    expect(screen.getByText("Mention", { selector: ".fa-popup-group-label" })).toBeTruthy()
    expect(within(list).getAllByRole("option")).toHaveLength(3)
    expect(within(list).getAllByRole("option")[0]!.getAttribute("aria-selected")).toBe("false")
    expect(within(list).getAllByRole("option")[0]!.hasAttribute("data-highlighted")).toBe(true)
    await press("ArrowDown")
    await press("Enter")
    expect(text().value).toBe("Ask @Avery Quinn ")
    expect(screen.getByTestId("context").textContent).toBe("avery")
    expect(screen.queryByRole("listbox")).toBeNull()
  })

  it("says what to do with an empty mention", async () => {
    render(<Harness />)
    await type("@")
    expect(screen.getByRole("listbox")).toBeTruthy()
    await type("@zz")
    const empty = screen.getByText('Nothing matches "zz"')
    expect(empty.getAttribute("role")).toBe("status")
    await press("Escape")
    expect(screen.queryByText('Nothing matches "zz"')).toBeNull()
  })

  it("keeps no more than six mentions", async () => {
    const many = Array.from({ length: 9 }, (_, index) => ({ kind: "person", id: `p${index}`, label: `Person ${index}` }))
    render(
      <EntityResolverProvider resolver={{ kinds: {}, search: () => many }}>
        <Composer context={[]} onContextChange={() => {}} />
      </EntityResolverProvider>
    )
    await type("@")
    expect(screen.getAllByRole("option")).toHaveLength(6)
  })

  it("edits the last prompt only when no menu is open", async () => {
    const onEditLast = vi.fn()
    render(<Harness onEditLast={onEditLast} />)
    await press("ArrowUp")
    expect(onEditLast).toHaveBeenCalledTimes(1)
  })

  it("opens no slash menu without commands and no mention menu without a resolver", async () => {
    render(<Composer />)
    await type("/s")
    expect(screen.queryByRole("dialog")).toBeNull()
    await type("@m")
    expect(screen.queryByRole("dialog")).toBeNull()
  })
})
