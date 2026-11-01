// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react"
import { expect, it } from "vitest"
import { useUndoStack } from "./index.js"

it("pushes, undoes and redoes, keeping one identity for its functions", () => {
  const { result } = renderHook(() => useUndoStack(1))
  const { push, undo } = result.current
  expect(result.current).toMatchObject({ value: 1, canUndo: false, canRedo: false })
  act(() => push(2))
  act(() => push((value) => value + 1))
  expect(result.current).toMatchObject({ value: 3, past: [1, 2], canUndo: true })
  act(() => undo())
  expect(result.current).toMatchObject({ value: 2, future: [3], canRedo: true })
  act(() => result.current.redo())
  expect(result.current.value).toBe(3)
  expect(result.current.push).toBe(push)
})

it("builds on earlier calls in one event, and resets", () => {
  const { result } = renderHook(() => useUndoStack(0, { limit: 1 }))
  act(() => {
    result.current.push((value) => value + 1)
    result.current.push((value) => value + 1)
  })
  expect(result.current).toMatchObject({ value: 2, past: [1] })
  act(() => result.current.reset(9))
  expect(result.current).toMatchObject({ value: 9, past: [], future: [], canUndo: false })
})

it("uses the latest coalesce rule", () => {
  const { result, rerender } = renderHook(({ merge }) => useUndoStack("a", { coalesce: () => merge }), { initialProps: { merge: false } })
  act(() => result.current.push("b"))
  rerender({ merge: true })
  act(() => result.current.push("c"))
  expect(result.current).toMatchObject({ value: "c", past: ["a"] })
})
