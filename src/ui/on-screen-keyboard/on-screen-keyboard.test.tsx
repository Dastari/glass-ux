// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { useRef, useState } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { OnScreenKeyboard } from "./on-screen-keyboard.js"
import { defineKeyboardLayout } from "./layouts.js"

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const key = (name: string) => screen.getByRole("button", { name })
const tap = (name: string) => fireEvent.click(key(name))
const live = () => document.querySelector('[aria-live="polite"]')?.textContent ?? ""

describe("OnScreenKeyboard", () => {
  it("is a named group with one tab stop and described instructions", () => {
    render(<OnScreenKeyboard layout="qwerty" />)
    const group = screen.getByRole("group", { name: "English keyboard" })
    expect(group.getAttribute("aria-describedby")).toBeTruthy()
    const stops = group.querySelectorAll('[data-osk-key][tabindex="0"]')
    expect(stops).toHaveLength(1)
    expect(key("q").getAttribute("lang")).toBe("en")
    expect(key("Shift").getAttribute("aria-pressed")).toBe("false")
    expect(key("Space")).toBeTruthy()
    expect(key("Backspace")).toBeTruthy()
    expect(key("Enter")).toBeTruthy()
    expect(group.getAttribute("data-print")).toBe("hide")
  })

  it("edits its own value: uncontrolled, with one-shot shift and caps lock", () => {
    const onValueChange = vi.fn()
    render(<OnScreenKeyboard layout="qwerty" onValueChange={onValueChange} />)
    tap("Shift")
    expect(key("Shift").getAttribute("aria-pressed")).toBe("true")
    tap("H")
    tap("i")
    expect(onValueChange).toHaveBeenLastCalledWith("Hi", expect.objectContaining({ source: "keyboard", layer: "default" }))
    tap("Space")
    tap("Backspace")
    expect(onValueChange).toHaveBeenLastCalledWith("Hi", expect.anything())
    // Two quick presses lock.
    tap("Shift")
    tap("Shift")
    expect(key("Caps Lock").getAttribute("aria-pressed")).toBe("true")
    expect(live()).toBe("Caps Lock on")
    tap("A")
    tap("B")
    expect(onValueChange).toHaveBeenLastCalledWith("HiAB", expect.anything())
    tap("Caps Lock")
    expect(live()).toBe("Caps Lock off")
  })

  it("follows a controlled value", () => {
    function Controlled() {
      const [value, setValue] = useState("ab")
      return (
        <>
          <output>{value}</output>
          <OnScreenKeyboard layout="qwerty" value={value} onValueChange={(next) => setValue(next.toUpperCase())} />
        </>
      )
    }
    render(<Controlled />)
    tap("c")
    expect(screen.getByRole("status").textContent).toBe("ABC")
    tap("Backspace")
    expect(screen.getByRole("status").textContent).toBe("AB")
  })

  it("switches layers in place and announces them", () => {
    render(<OnScreenKeyboard layout="qwerty" />)
    const before = document.querySelectorAll("[data-osk-key]").length
    tap("Symbols")
    expect(live()).toBe("Symbols keys")
    expect(key("1")).toBeTruthy()
    tap("More symbols")
    expect(key("€")).toBeTruthy()
    tap("Letters")
    expect(key("q")).toBeTruthy()
    expect(document.querySelectorAll("[data-osk-key]").length).toBe(before)
    expect(document.querySelector(".fa-osk")?.getAttribute("style")).toContain("--_rows: 4")
  })

  it("cycles layouts with the globe key only when there are several", () => {
    const onLayoutChange = vi.fn()
    const { rerender } = render(<OnScreenKeyboard layouts={["qwerty", "arabic", "kana"]} onLayoutChange={onLayoutChange} />)
    tap("Switch to العربية")
    expect(onLayoutChange).toHaveBeenLastCalledWith(expect.objectContaining({ id: "arabic" }))
    expect(screen.getByRole("group", { name: "العربية keyboard" })).toBeTruthy()
    expect(live()).toBe("العربية keyboard")
    expect(document.querySelector(".fa-osk-grid")?.getAttribute("dir")).toBe("ltr")
    tap("Switch to 日本語 かな")
    expect(document.querySelector(".fa-osk-grid")?.getAttribute("dir")).toBeNull()
    rerender(<OnScreenKeyboard layout="qwerty" />)
    expect(screen.queryByRole("button", { name: /Switch to/ })).toBeNull()
  })

  it("lets onKeyPress prevent an edit", () => {
    const onValueChange = vi.fn()
    render(
      <OnScreenKeyboard
        layout="numeric"
        onValueChange={onValueChange}
        onKeyPress={(pressed, details) => {
          if (pressed.text === "5") details.preventDefault()
        }}
      />,
    )
    tap("5")
    expect(onValueChange).not.toHaveBeenCalled()
    tap("6")
    expect(onValueChange).toHaveBeenLastCalledWith("6", expect.anything())
  })

  it("types into a controlled input target without taking its focus", () => {
    function Linked() {
      const ref = useRef<HTMLInputElement>(null)
      const [value, setValue] = useState("")
      return (
        <>
          <input ref={ref} aria-label="Search" enterKeyHint="search" value={value} onChange={(event) => setValue(event.target.value)} />
          <OnScreenKeyboard layout="qwerty" target={ref} />
        </>
      )
    }
    render(<Linked />)
    const input = screen.getByLabelText("Search") as HTMLInputElement
    input.focus()
    const q = key("q")
    const down = fireEvent.pointerDown(q, { button: 0, pointerId: 1 })
    expect(down).toBe(false)
    expect(fireEvent.mouseDown(q)).toBe(false)
    fireEvent.pointerUp(q, { button: 0, pointerId: 1 })
    fireEvent.click(q)
    expect(input.value).toBe("q")
    expect(document.activeElement).toBe(input)
    // Enter follows the target's enterkeyhint.
    expect(key("Search").getAttribute("data-role")).toBe("accent")
  })

  it("submits an input target's form on Enter unless onEnter prevents it", () => {
    const submit = vi.fn((event: React.FormEvent) => event.preventDefault())
    function Form({ prevent }: { prevent: boolean }) {
      const ref = useRef<HTMLInputElement>(null)
      return (
        <form onSubmit={submit}>
          <input ref={ref} aria-label="Code" defaultValue="" />
          <OnScreenKeyboard layout="qwerty" target={ref} onEnter={(details) => prevent && details.preventDefault()} />
        </form>
      )
    }
    const { rerender } = render(<Form prevent={false} />)
    tap("Enter")
    expect(submit).toHaveBeenCalledTimes(1)
    rerender(<Form prevent />)
    tap("Enter")
    expect(submit).toHaveBeenCalledTimes(1)
  })

  it("composes Hangul", () => {
    const onValueChange = vi.fn()
    render(<OnScreenKeyboard layout="hangul" onValueChange={onValueChange} />)
    for (const jamo of ["ㅎ", "ㅏ", "ㄴ", "ㄱ", "ㅡ", "ㄹ"]) tap(jamo)
    expect(onValueChange).toHaveBeenLastCalledWith("한글", expect.anything())
    tap("Backspace")
    expect(onValueChange).toHaveBeenLastCalledWith("한그", expect.anything())
    tap("Shift")
    tap("ㅆ")
    expect(onValueChange).toHaveBeenLastCalledWith("한긌", expect.anything())
  })

  it("applies kana marks and switches script", () => {
    const onValueChange = vi.fn()
    render(<OnScreenKeyboard layout="kana" onValueChange={onValueChange} />)
    tap("か")
    tap("Dakuten")
    expect(onValueChange).toHaveBeenLastCalledWith("が", expect.anything())
    tap("Katakana")
    expect(live()).toBe("Katakana")
    tap("カ")
    expect(onValueChange).toHaveBeenLastCalledWith("がカ", expect.anything())
    tap("Hiragana")
    expect(key("か")).toBeTruthy()
  })

  it("captures physical typing while focus is on a key", () => {
    const onValueChange = vi.fn()
    render(<OnScreenKeyboard layout="qwerty" onValueChange={onValueChange} />)
    const q = key("q")
    q.focus()
    fireEvent.keyDown(q, { key: "x" })
    fireEvent.keyDown(q, { key: "y" })
    fireEvent.keyDown(q, { key: "Backspace" })
    expect(onValueChange).toHaveBeenLastCalledWith("x", expect.objectContaining({ source: "typing" }))
    // Enter presses the focused key, on release.
    fireEvent.keyDown(q, { key: "Enter" })
    fireEvent.keyUp(q, { key: "Enter" })
    expect(onValueChange).toHaveBeenLastCalledWith("xq", expect.objectContaining({ source: "keyboard" }))
  })

  it("opens alternates by holding Enter and picks one", () => {
    vi.useFakeTimers()
    const onValueChange = vi.fn()
    render(<OnScreenKeyboard layout="azerty" onValueChange={onValueChange} />)
    const e = key("e")
    e.focus()
    fireEvent.keyDown(e, { key: "Enter" })
    act(() => vi.advanceTimersByTime(600))
    fireEvent.keyUp(e, { key: "Enter" })
    const list = screen.getByRole("listbox", { name: "Alternatives for e" })
    expect(onValueChange).not.toHaveBeenCalled()
    fireEvent.keyDown(list, { key: "ArrowRight" })
    expect(screen.getByRole("option", { name: "è" }).getAttribute("aria-selected")).toBe("true")
    fireEvent.keyDown(list, { key: "Enter" })
    expect(onValueChange).toHaveBeenLastCalledWith("è", expect.objectContaining({ source: "alternate" }))
    expect(screen.queryByRole("listbox")).toBeNull()
  })

  it("opens alternates by press and hold with the pointer", () => {
    vi.useFakeTimers()
    const onValueChange = vi.fn()
    render(<OnScreenKeyboard layout="phone" onValueChange={onValueChange} />)
    const zero = key("0")
    fireEvent.pointerDown(zero, { button: 0, pointerId: 3 })
    act(() => vi.advanceTimersByTime(600))
    expect(screen.getByRole("option", { name: "+" })).toBeTruthy()
    fireEvent.click(screen.getByRole("option", { name: "+" }))
    expect(onValueChange).toHaveBeenLastCalledWith("+", expect.anything())
  })

  it("offers a hide key with onHide and calls onEscape", () => {
    const onHide = vi.fn()
    const onEscape = vi.fn()
    render(<OnScreenKeyboard layout="qwerty" onHide={onHide} onEscape={onEscape} />)
    tap("Hide keyboard")
    expect(onHide).toHaveBeenCalled()
    fireEvent.keyDown(key("q"), { key: "Escape" })
    expect(onEscape).toHaveBeenCalled()
  })

  it("lays keys on a proportional grid and keeps gaps out of the tab order", () => {
    render(<OnScreenKeyboard layout="pin" />)
    expect(document.querySelector(".fa-osk")?.getAttribute("data-variant")).toBe("grid")
    expect(document.querySelectorAll(".fa-osk-gap")).toHaveLength(1)
    expect((key("Backspace") as HTMLElement).style.gridColumn).toBe("9 / span 4")
    expect(key("1").getAttribute("data-preview")).toBeNull()
  })

  it("accepts custom layouts and disables every key", () => {
    const hex = defineKeyboardLayout({ id: "hex", label: "Hex", locale: "en", arrangement: "reading", columns: 4, layers: { default: [["A", "B", "C", "D"]] } })
    render(<OnScreenKeyboard layout={hex} disabled />)
    expect((key("A") as HTMLButtonElement).disabled).toBe(true)
  })
})
