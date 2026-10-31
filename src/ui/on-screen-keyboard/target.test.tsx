// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react"
import { useState } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { applyKey } from "./edit.js"
import { isKeyboardTarget, readTarget, resolveTarget, submitFromTarget, writeTarget, type KeyboardTargetElement } from "./target.js"

afterEach(cleanup)

function typeKey(element: KeyboardTargetElement, key: Parameters<typeof applyKey>[1]) {
  const state = readTarget(element)
  const result = applyKey(state, key, { maxLength: state.maxLength, readOnly: state.readOnly, multiline: state.multiline })
  if (result) writeTarget(element, result, state)
}

describe("keyboard targets", () => {
  it("updates a React-controlled input and keeps the caret", () => {
    const changes: string[] = []
    function Controlled() {
      const [value, setValue] = useState("helo")
      return (
        <input
          aria-label="Name"
          value={value}
          onChange={(event) => {
            changes.push(event.target.value)
            setValue(event.target.value)
          }}
        />
      )
    }
    const { getByLabelText } = render(<Controlled />)
    const input = getByLabelText("Name") as HTMLInputElement
    input.setSelectionRange(3, 3)
    act(() => typeKey(input, "l"))
    expect(changes).toEqual(["hello"])
    expect(input.value).toBe("hello")
    expect(input.selectionStart).toBe(4)
    act(() => typeKey(input, { action: "backspace" }))
    expect(input.value).toBe("helo")
    expect(input.selectionStart).toBe(3)
  })

  it("keeps a controlled input's value when the application refuses the change", () => {
    function Refusing() {
      return <input aria-label="Fixed" value="fixed" onChange={() => {}} />
    }
    const { getByLabelText } = render(<Refusing />)
    const input = getByLabelText("Fixed") as HTMLInputElement
    act(() => typeKey(input, "x"))
    expect(input.value).toBe("fixed")
  })

  it("fires a bubbling input event with the edit's input type", () => {
    const input = document.createElement("input")
    document.body.append(input)
    const events: Array<{ type: string; inputType?: string; data?: string | null }> = []
    document.body.addEventListener("input", (event) => events.push({ type: event.type, inputType: (event as InputEvent).inputType, data: (event as InputEvent).data }))
    typeKey(input, "a")
    typeKey(input, { action: "backspace" })
    expect(events).toEqual([
      { type: "input", inputType: "insertText", data: "a" },
      { type: "input", inputType: "deleteContentBackward", data: null },
    ])
    input.remove()
  })

  it("appends to inputs without a caret API and respects maxLength and readOnly", () => {
    const email = document.createElement("input")
    email.type = "email"
    email.value = "ada@example"
    typeKey(email, ".com")
    expect(email.value).toBe("ada@example.com")

    const limited = document.createElement("input")
    limited.maxLength = 3
    limited.value = "ab"
    typeKey(limited, ".com")
    expect(limited.value).toBe("ab.")

    const fixed = document.createElement("input")
    fixed.readOnly = true
    fixed.value = "kept"
    expect(readTarget(fixed).readOnly).toBe(true)
    typeKey(fixed, "x")
    expect(fixed.value).toBe("kept")
  })

  it("reads textareas as multi-line and their enterkeyhint", () => {
    const area = document.createElement("textarea")
    area.value = "one"
    area.setAttribute("enterkeyhint", "send")
    const state = readTarget(area)
    expect(state.multiline).toBe(true)
    expect(state.enterKeyHint).toBe("send")
    typeKey(area, { action: "enter" })
    expect(area.value).toBe("one\n")
  })

  it("recognises targets and resolves refs", () => {
    const input = document.createElement("input")
    const checkbox = document.createElement("input")
    checkbox.type = "checkbox"
    expect(isKeyboardTarget(input)).toBe(true)
    expect(isKeyboardTarget(checkbox)).toBe(false)
    expect(isKeyboardTarget(document.createElement("div"))).toBe(false)
    expect(resolveTarget({ current: input })).toBe(input)
    expect(resolveTarget(input)).toBe(input)
    expect(resolveTarget({ current: checkbox })).toBeNull()
    expect(resolveTarget(null)).toBeNull()
  })

  it("submits an input's form after an Enter keydown nobody prevented", () => {
    const form = document.createElement("form")
    const input = document.createElement("input")
    form.append(input)
    document.body.append(form)
    const submit = vi.fn((event: Event) => event.preventDefault())
    form.addEventListener("submit", submit)
    submitFromTarget(input)
    expect(submit).toHaveBeenCalledTimes(1)

    const stop = (event: KeyboardEvent) => event.preventDefault()
    input.addEventListener("keydown", stop)
    submitFromTarget(input)
    expect(submit).toHaveBeenCalledTimes(1)
    form.remove()
  })
})
