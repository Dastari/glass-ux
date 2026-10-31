// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, renderHook, screen } from "@testing-library/react"
import { useRef } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { KeyboardDrawer } from "./keyboard-drawer.js"
import { KeyboardPopover } from "./keyboard-popover.js"
import { KeyboardTarget, OnScreenKeyboardProvider, useOnScreenKeyboard, type OnScreenKeyboardProviderProps } from "./keyboard-provider.js"
import { KeyboardToggle } from "./keyboard-toggle.js"

let coarse = false
beforeEach(() => {
  coarse = false
  window.matchMedia = ((query: string) => ({
    get matches() {
      return query === "(pointer: coarse)" ? coarse : false
    },
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
  globalThis.matchMedia = window.matchMedia
})
afterEach(() => {
  cleanup()
  document.documentElement.style.removeProperty("--keyboard-inset-height")
})

/** Let focus settle: the provider decides about focus leaving after a frame. */
const frame = () => act(() => new Promise<void>((resolve) => setTimeout(resolve, 40)))
const keyboard = () => screen.queryByRole("group", { name: /keyboard$/ })
const field = (name: string) => screen.getByLabelText(name) as HTMLInputElement

function Form(props: Omit<OnScreenKeyboardProviderProps, "children"> & { targetDisabled?: boolean }) {
  const { targetDisabled, ...provider } = props
  return (
    <OnScreenKeyboardProvider {...provider}>
      <KeyboardTarget disabled={targetDisabled}>
        <input aria-label="Name" />
        <input aria-label="Code" inputMode="decimal" />
        <input aria-label="Locked" readOnly />
        <input aria-label="Off" disabled />
        <KeyboardToggle />
      </KeyboardTarget>
      <button type="button">Elsewhere</button>
      <input aria-label="Unlinked" />
    </OnScreenKeyboardProvider>
  )
}

describe("OnScreenKeyboardProvider show=focus", () => {
  it("opens on focus, retargets between linked inputs and closes when focus leaves both", async () => {
    const onOpenChange = vi.fn()
    render(<Form show="focus" onOpenChange={onOpenChange} />)
    expect(keyboard()).toBeNull()
    act(() => field("Name").focus())
    expect(keyboard()).not.toBeNull()
    expect(onOpenChange).toHaveBeenLastCalledWith(true, expect.objectContaining({ reason: "focus", target: field("Name") }))

    act(() => field("Code").focus())
    await frame()
    // Still open, now with the number pad the input asks for, and no close in between.
    expect(keyboard()).not.toBeNull()
    expect(document.querySelector(".fa-osk")?.getAttribute("data-layout")).toBe("decimal")
    expect(onOpenChange).toHaveBeenCalledTimes(1)

    act(() => screen.getByRole("button", { name: "Elsewhere" }).focus())
    await frame()
    expect(onOpenChange).toHaveBeenLastCalledWith(false, expect.objectContaining({ reason: "focus-out" }))
    // Focus stays where the person put it.
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Elsewhere" }))
  })

  it("keeps the keyboard open while focus is on its keys", async () => {
    render(<Form show="focus" />)
    act(() => field("Name").focus())
    const key = screen.getByRole("button", { name: "q" })
    act(() => key.focus())
    await frame()
    expect(keyboard()).not.toBeNull()
  })

  it("closes when focus moves to an input outside every KeyboardTarget", async () => {
    render(<Form show="focus" />)
    act(() => field("Name").focus())
    act(() => field("Unlinked").focus())
    await frame()
    expect(document.querySelector(".fa-osk-drawer")?.hasAttribute("data-ending-style")).toBe(true)
  })

  it("ignores disabled and read-only inputs and disabled targets", () => {
    const { unmount } = render(<Form show="focus" />)
    act(() => field("Locked").focus())
    expect(keyboard()).toBeNull()
    unmount()
    render(<Form show="focus" targetDisabled />)
    act(() => field("Name").focus())
    expect(keyboard()).toBeNull()
  })

  it("closes on Escape in the input and on the hide key, leaving focus in the input", () => {
    const onOpenChange = vi.fn()
    render(<Form show="focus" onOpenChange={onOpenChange} />)
    act(() => field("Name").focus())
    fireEvent.keyDown(field("Name"), { key: "Escape" })
    expect(onOpenChange).toHaveBeenLastCalledWith(false, expect.objectContaining({ reason: "escape-key" }))
    expect(document.activeElement).toBe(field("Name"))
    // Tapping the focused input brings it back.
    fireEvent.click(field("Name"))
    expect(onOpenChange).toHaveBeenLastCalledWith(true, expect.objectContaining({ reason: "focus" }))
    fireEvent.click(screen.getByRole("button", { name: "Hide keyboard" }))
    expect(onOpenChange).toHaveBeenLastCalledWith(false, expect.objectContaining({ reason: "hide-key" }))
  })
})

describe("replaceNative", () => {
  it("sets inputmode none while serving and restores the previous value", async () => {
    render(<Form show="focus" replaceNative="always" />)
    act(() => field("Name").focus())
    expect(field("Name").getAttribute("inputmode")).toBe("none")
    act(() => field("Code").focus())
    expect(field("Name").hasAttribute("inputmode")).toBe(false)
    expect(field("Code").getAttribute("inputmode")).toBe("none")
    act(() => screen.getByRole("button", { name: "Elsewhere" }).focus())
    await frame()
    expect(field("Code").getAttribute("inputmode")).toBe("decimal")
  })

  it("touch: only under a coarse pointer", () => {
    const { unmount } = render(<Form show="focus" />)
    act(() => field("Name").focus())
    expect(field("Name").hasAttribute("inputmode")).toBe(false)
    unmount()
    coarse = true
    render(<Form show="focus" />)
    act(() => field("Name").focus())
    expect(field("Name").getAttribute("inputmode")).toBe("none")
  })

  it("touch: suppresses before a tap focuses the input", () => {
    coarse = true
    render(<Form show="focus" />)
    fireEvent.pointerDown(field("Code"), { button: 0 })
    expect(field("Code").getAttribute("inputmode")).toBe("none")
  })

  it("never: leaves inputmode alone", () => {
    coarse = true
    render(<Form show="focus" replaceNative="never" />)
    act(() => field("Code").focus())
    expect(keyboard()).not.toBeNull()
    expect(field("Code").getAttribute("inputmode")).toBe("decimal")
  })

  it("restores inputmode when the provider unmounts", () => {
    const { unmount } = render(<Form show="focus" replaceNative="always" />)
    const input = field("Code")
    act(() => input.focus())
    unmount()
    expect(input.getAttribute("inputmode")).toBe("decimal")
  })
})

describe("show=manual and the controller", () => {
  it("does not open on focus; open() serves the focused input and close() keeps focus", () => {
    let controller: ReturnType<typeof useOnScreenKeyboard> | null = null
    function Probe() {
      controller = useOnScreenKeyboard()
      return null
    }
    render(
      <OnScreenKeyboardProvider>
        <KeyboardTarget>
          <input aria-label="Manual" />
        </KeyboardTarget>
        <Probe />
      </OnScreenKeyboardProvider>,
    )
    act(() => field("Manual").focus())
    expect(keyboard()).toBeNull()
    act(() => controller?.open())
    expect(controller?.isOpen).toBe(true)
    expect(controller?.target).toBe(field("Manual"))
    act(() => controller?.close())
    expect(controller?.isOpen).toBe(false)
    expect(controller?.target).toBeNull()
    expect(document.activeElement).toBe(field("Manual"))
  })

  it("open() ignores read-only targets and focuses the target it opens for", () => {
    let controller: ReturnType<typeof useOnScreenKeyboard> | null = null
    function Probe() {
      controller = useOnScreenKeyboard()
      return null
    }
    render(
      <OnScreenKeyboardProvider>
        <KeyboardTarget>
          <input aria-label="Locked" readOnly />
          <input aria-label="Name" />
        </KeyboardTarget>
        <Probe />
      </OnScreenKeyboardProvider>,
    )
    act(() => controller?.open(field("Locked")))
    expect(controller?.isOpen).toBe(false)
    act(() => controller?.toggle())
    expect(controller?.target).toBe(field("Name"))
    expect(document.activeElement).toBe(field("Name"))
  })

  it("is an inert controller outside a provider", () => {
    const { result } = renderHook(() => useOnScreenKeyboard())
    expect(result.current.isOpen).toBe(false)
    expect(result.current.target).toBeNull()
    expect(() => {
      result.current.open()
      result.current.toggle()
      result.current.close()
    }).not.toThrow()
  })
})

describe("KeyboardToggle", () => {
  it("toggles for its target without taking focus, with a pressed state", () => {
    render(<Form />)
    const toggle = screen.getByRole("button", { name: "On-screen keyboard" })
    expect(toggle.getAttribute("aria-pressed")).toBe("false")
    act(() => field("Code").focus())
    // Pointer presses keep focus in the input.
    expect(fireEvent.mouseDown(toggle, { button: 0 })).toBe(false)
    expect(fireEvent.pointerDown(toggle, { button: 0 })).toBe(false)
    fireEvent.click(toggle)
    expect(toggle.getAttribute("aria-pressed")).toBe("true")
    expect(keyboard()).not.toBeNull()
    expect(document.activeElement).toBe(field("Code"))
    fireEvent.click(toggle)
    expect(toggle.getAttribute("aria-pressed")).toBe("false")
    expect(document.activeElement).toBe(field("Code"))
  })

  it("opens for the first input of its KeyboardTarget and focuses it when reached by Tab", () => {
    render(<Form />)
    const toggle = screen.getByRole("button", { name: "On-screen keyboard" })
    act(() => toggle.focus())
    fireEvent.click(toggle)
    expect(document.activeElement).toBe(field("Name"))
  })

  it("renders nothing outside a provider", () => {
    render(<KeyboardToggle />)
    expect(screen.queryByRole("button")).toBeNull()
  })
})

describe("KeyboardDrawer", () => {
  it("sets --keyboard-inset-height on its scroll root while open and removes it after", () => {
    function Drawer({ open }: { open: boolean }) {
      const root = useRef<HTMLDivElement>(null)
      const input = useRef<HTMLInputElement>(null)
      return (
        <div ref={root} data-testid="root">
          <input ref={input} aria-label="Name" />
          <KeyboardDrawer open={open} target={input} scrollRoot={root} />
        </div>
      )
    }
    const { rerender } = render(<Drawer open />)
    const root = screen.getByTestId("root")
    expect(root.style.getPropertyValue("--keyboard-inset-height")).toBe("0px")
    expect(document.querySelector(".fa-osk-drawer")?.classList.contains("glass-overlay")).toBe(true)
    rerender(<Drawer open={false} />)
    expect(root.style.getPropertyValue("--keyboard-inset-height")).toBe("")
  })

  it("closes on Escape on its keys when uncontrolled", () => {
    const onOpenChange = vi.fn()
    render(<KeyboardDrawer defaultOpen onOpenChange={onOpenChange} layout="qwerty" />)
    fireEvent.keyDown(screen.getByRole("button", { name: "q" }), { key: "Escape" })
    expect(onOpenChange).toHaveBeenCalledWith(false, expect.objectContaining({ reason: "escape-key" }))
    expect(document.querySelector(".fa-osk-drawer")?.hasAttribute("data-ending-style")).toBe(true)
  })
})

describe("hide key in containers", () => {
  it("takes a number pad's blank cell and never adds a column to a grid", () => {
    const { unmount } = render(<KeyboardDrawer defaultOpen layout="pin" />)
    const hide = screen.getByRole("button", { name: "Hide keyboard" })
    // The blank bottom-left cell of the PIN pad: the grid keeps its three columns.
    expect(hide.style.gridColumn).toBe("1 / span 4")
    expect(document.querySelector(".fa-osk")?.getAttribute("style")).toContain("--_cols: 12")
    unmount()
    render(<KeyboardDrawer defaultOpen layout="numeric" />)
    expect(screen.queryByRole("button", { name: "Hide keyboard" })).toBeNull()
    expect(document.querySelector(".fa-osk")?.getAttribute("style")).toContain("--_cols: 12")
  })

  it("sits at the end of a typing layout's bottom row", () => {
    render(<KeyboardDrawer defaultOpen layout="qwerty" />)
    const hide = screen.getByRole("button", { name: "Hide keyboard" })
    expect(hide.style.gridRow).toBe("4")
  })
})

describe("KeyboardPopover", () => {
  it("is a named non-modal popup that leaves focus in the target", async () => {
    function Search() {
      const input = useRef<HTMLInputElement>(null)
      return (
        <>
          <input ref={input} aria-label="Search" />
          <KeyboardPopover defaultOpen target={input} layout="qwerty" />
        </>
      )
    }
    render(<Search />)
    act(() => field("Search").focus())
    await frame()
    expect(screen.getByRole("dialog", { name: "On-screen keyboard" })).toBeTruthy()
    expect(document.activeElement).toBe(field("Search"))
    fireEvent.click(screen.getByRole("button", { name: "q" }))
    expect(field("Search").value).toBe("q")
    expect(document.activeElement).toBe(field("Search"))
  })
})
