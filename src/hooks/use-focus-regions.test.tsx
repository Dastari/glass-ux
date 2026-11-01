// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { useRef, type ReactNode } from "react"
import { useFocusRegions, type FocusRegionOptions } from "./index.js"

afterEach(cleanup)

function Harness({ children, ...options }: FocusRegionOptions & { children: ReactNode }) {
  useFocusRegions(options)
  return <>{children}</>
}

const Three = (props: { middle?: ReactNode }) => (
  <>
    <nav data-focus-region aria-label="One">
      <button>First</button>
      <button>Second</button>
    </nav>
    <section data-focus-region aria-label="Two">
      {props.middle ?? <textarea aria-label="Editor" />}
    </section>
    <aside data-focus-region aria-label="Three">
      <button>Third</button>
    </aside>
  </>
)

const press = (shiftKey = false) => {
  const target = document.activeElement ?? document.body
  let notPrevented = true
  act(() => {
    notPrevented = fireEvent.keyDown(target, { key: "F6", shiftKey })
  })
  return !notPrevented
}
const name = () => document.activeElement?.getAttribute("aria-label") ?? document.activeElement?.textContent

describe("useFocusRegions", () => {
  it("goes round the regions, from a text field too, and cancels the browser's F6", () => {
    render(<Harness><Three /></Harness>)
    screen.getByRole("button", { name: "First" }).focus()
    expect(press()).toBe(true)
    expect(name()).toBe("Editor")
    expect(press()).toBe(true)
    expect(name()).toBe("Third")
    press()
    expect(name()).toBe("First")
    press(true)
    expect(name()).toBe("Third")
  })

  it("starts at the ends from the page body", () => {
    render(<Harness><Three /></Harness>)
    press()
    expect(name()).toBe("First")
    ;(document.activeElement as HTMLElement).blur()
    press(true)
    expect(name()).toBe("Third")
  })

  it("returns to where focus last was in a region", () => {
    render(<Harness><Three /></Harness>)
    screen.getByRole("button", { name: "Second" }).focus()
    press()
    press(true)
    expect(name()).toBe("Second")
  })

  it("focuses a region with no control, once, without changing its tab order", () => {
    render(<Harness><Three middle={<p>Read only</p>} /></Harness>)
    screen.getByRole("button", { name: "First" }).focus()
    press()
    const region = screen.getByRole("region", { name: "Two" })
    expect(document.activeElement).toBe(region)
    expect(region.tabIndex).toBe(-1)
  })

  it.each([
    ["inert", { inert: true }],
    ["hidden", { hidden: true }],
    ["aria-hidden", { "aria-hidden": true }],
    ["display none", { style: { display: "none" } }],
  ])("skips a region that is %s", (_, props) => {
    render(
      <Harness>
        <nav data-focus-region><button>First</button></nav>
        <section data-focus-region {...props}><button>Skipped</button></section>
        <aside data-focus-region><button>Third</button></aside>
      </Harness>
    )
    screen.getByRole("button", { name: "First" }).focus()
    press()
    expect(name()).toBe("Third")
  })

  it("skips a disabled or hidden control inside a region", () => {
    render(
      <Harness>
        <nav data-focus-region><button>First</button></nav>
        <section data-focus-region>
          <button disabled>Off</button>
          <button tabIndex={-1}>Roving</button>
          <button style={{ display: "none" }}>Hidden</button>
          <a href="#x">Link</a>
        </section>
      </Harness>
    )
    screen.getByRole("button", { name: "First" }).focus()
    press()
    expect(name()).toBe("Link")
  })

  it.each([
    ["a native modal role", <div key="m" role="dialog" aria-modal="true"><button>Inside</button></div>],
    ["an alert dialog", <div key="m" role="alertdialog"><button>Inside</button></div>],
  ])("leaves the key alone while %s is open", (_, modal) => {
    render(<Harness><Three />{modal}</Harness>)
    screen.getByRole("button", { name: "Inside" }).focus()
    expect(press()).toBe(false)
    expect(name()).toBe("Inside")
  })

  it("leaves the key to the browser with fewer than two regions", () => {
    render(<Harness><nav data-focus-region><button>Only</button></nav></Harness>)
    screen.getByRole("button", { name: "Only" }).focus()
    expect(press()).toBe(false)
  })

  it("uses the outermost landmarks when nothing is marked", () => {
    render(
      <Harness>
        <header><nav><button>Crumbs</button></nav></header>
        <main><button>Content</button></main>
      </Harness>
    )
    screen.getByRole("button", { name: "Crumbs" }).focus()
    press()
    expect(name()).toBe("Content")
    press()
    expect(name()).toBe("Crumbs")
  })

  it("does nothing when disabled", () => {
    render(<Harness enabled={false}><Three /></Harness>)
    screen.getByRole("button", { name: "First" }).focus()
    expect(press()).toBe(false)
    expect(name()).toBe("First")
  })

  it("respects a handler that kept F6 for itself", () => {
    render(<Harness><Three middle={<input aria-label="Terminal" onKeyDown={(event) => event.preventDefault()} />} /></Harness>)
    screen.getByRole("textbox", { name: "Terminal" }).focus()
    press()
    expect(name()).toBe("Terminal")
  })

  it("stays inside its scope", () => {
    function Scoped() {
      const scope = useRef<HTMLDivElement>(null)
      useFocusRegions({ scope })
      return (
        <>
          <button>Outside</button>
          <div ref={scope}>
            <Three />
          </div>
        </>
      )
    }
    render(<Scoped />)
    screen.getByRole("button", { name: "Outside" }).focus()
    expect(press()).toBe(false)
    screen.getByRole("button", { name: "First" }).focus()
    expect(press()).toBe(true)
    expect(name()).toBe("Editor")
  })

  it("moves out of a nested region from the inner one", () => {
    render(
      <Harness>
        <main data-focus-region>
          <button>Main</button>
          <div data-focus-region><button>Inner</button></div>
        </main>
        <aside data-focus-region><button>Side</button></aside>
      </Harness>
    )
    screen.getByRole("button", { name: "Inner" }).focus()
    press()
    expect(name()).toBe("Side")
  })

  it("returns the keys for aria-keyshortcuts", () => {
    const spy = vi.fn()
    function Reader() {
      spy(useFocusRegions())
      return null
    }
    render(<Reader />)
    expect(spy).toHaveBeenCalledWith("F6 Shift+F6")
  })

  it("takes a custom selector", () => {
    render(
      <Harness selector=".pane">
        <div className="pane"><button>Left</button></div>
        <div className="pane"><button>Right</button></div>
      </Harness>
    )
    screen.getByRole("button", { name: "Left" }).focus()
    press()
    expect(name()).toBe("Right")
  })
})
