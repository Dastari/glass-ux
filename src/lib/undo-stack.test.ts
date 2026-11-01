import { describe, expect, it } from "vitest"
import { createUndoState, pushUndo, redoState, undoState } from "./undo-stack.js"

describe("undo stack", () => {
  it("steps back and forward, and a push drops what was undone", () => {
    let state = createUndoState("a")
    state = pushUndo(state, "b")
    state = pushUndo(state, "c")
    expect(state).toMatchObject({ past: ["a", "b"], present: "c", future: [] })
    state = undoState(undoState(state))
    expect(state).toMatchObject({ past: [], present: "a", future: ["b", "c"] })
    state = redoState(state)
    expect(state).toMatchObject({ past: ["a"], present: "b", future: ["c"] })
    expect(pushUndo(state, "d")).toMatchObject({ past: ["a", "b"], present: "d", future: [] })
  })

  it("returns the same state when there is nothing to do", () => {
    const state = createUndoState(1)
    expect(undoState(state)).toBe(state)
    expect(redoState(state)).toBe(state)
    expect(pushUndo(state, 1)).toBe(state)
  })

  it("keeps a value that is undefined or null", () => {
    let state = createUndoState<string | null | undefined>(null)
    state = pushUndo(state, undefined)
    state = pushUndo(state, "a")
    expect(undoState(state).present).toBeUndefined()
    expect(undoState(undoState(state)).present).toBeNull()
  })

  it("forgets the oldest values past the limit", () => {
    let state = createUndoState(0)
    for (let value = 1; value <= 5; value++) state = pushUndo(state, value, { limit: 2 })
    expect(state.past).toEqual([3, 4])
    expect(pushUndo(state, 9, { limit: 0 }).past).toEqual([])
  })

  it("coalesces a run of pushes into one step", () => {
    const coalesce = (_previous: string, _next: string, elapsed: number) => elapsed < 500
    let state = pushUndo(createUndoState(""), "a", { coalesce }, 1_000)
    state = pushUndo(state, "ab", { coalesce }, 1_200)
    state = pushUndo(state, "abc", { coalesce }, 1_400)
    expect(state).toMatchObject({ past: [""], present: "abc" })
    state = pushUndo(state, "abcd", { coalesce }, 3_000)
    expect(state.past).toEqual(["", "abc"])
    expect(undoState(state).present).toBe("abc")
  })

  it("never merges into a step after an undo", () => {
    const coalesce = () => true
    let state = pushUndo(createUndoState(1), 2, { coalesce }, 10)
    state = pushUndo(state, 3, { coalesce }, 20)
    state = undoState(state)
    expect(pushUndo(state, 9, { coalesce }, 21)).toMatchObject({ past: [1], present: 9 })
  })

  it("leaves the state it was given alone", () => {
    const state = pushUndo(createUndoState(1), 2)
    const frozen = structuredClone(state)
    pushUndo(state, 3)
    undoState(state)
    expect(state).toEqual(frozen)
  })
})
