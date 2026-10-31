import { describe, expect, it } from "vitest"
import { nextKeyIndex, rowEdgeIndex, type KeyRect } from "./navigation.js"

// Builds rects from rows of key widths (in units of 10px, rows 10px high, centred like a keyboard).
function keyboard(rows: number[][], unit = 10): KeyRect[] {
  const widest = Math.max(...rows.map((row) => row.reduce((a, b) => a + b, 0)))
  const rects: KeyRect[] = []
  rows.forEach((row, r) => {
    let x = ((widest - row.reduce((a, b) => a + b, 0)) * unit) / 2
    for (const width of row) {
      rects.push({ left: x, top: r * unit, right: x + width * unit, bottom: (r + 1) * unit })
      x += width * unit
    }
  })
  return rects
}

// q w e r t y u i o p / a s d f g h j k l / ⇧ z x c v b n m ⌫ / ?123 , 🌐 space . ⏎
const qwerty = keyboard([
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1.5, 1, 1, 1, 1, 1, 1, 1, 1.5],
  [1.5, 1, 1, 4, 1, 1.5],
])
const Q = 0
const P = 9
const A = 10
const L = 18
const SHIFT = 19
const V = 23
const B = 24
const BACKSPACE = 27
const SYMBOLS = 28
const SPACE = 31
const ENTER = 33

describe("nextKeyIndex", () => {
  it("moves along a row and stops at its edges", () => {
    expect(nextKeyIndex(qwerty, Q, "right")).toBe(1)
    expect(nextKeyIndex(qwerty, 1, "left")).toBe(Q)
    expect(nextKeyIndex(qwerty, Q, "left")).toBeNull()
    expect(nextKeyIndex(qwerty, P, "right")).toBeNull()
  })

  it("moves to the best aligned key of the next row", () => {
    // q (0–10) down lands on a (5–15), the nearest key.
    expect(nextKeyIndex(qwerty, Q, "down")).toBe(A)
    expect(nextKeyIndex(qwerty, P, "down")).toBe(L)
    expect(nextKeyIndex(qwerty, A, "down")).toBe(SHIFT)
    expect(nextKeyIndex(qwerty, L, "down")).toBe(BACKSPACE)
    expect(nextKeyIndex(qwerty, V, "down")).toBe(SPACE)
    expect(nextKeyIndex(qwerty, SPACE, "up")).toBe(V)
    expect(nextKeyIndex(qwerty, BACKSPACE, "down")).toBe(ENTER)
    expect(nextKeyIndex(qwerty, SHIFT, "down")).toBe(SYMBOLS)
  })

  it("keeps the column across a wide key", () => {
    const column = (qwerty[B] as KeyRect).left + 5
    const down = nextKeyIndex(qwerty, B, "down", { column })
    expect(down).toBe(SPACE)
    expect(nextKeyIndex(qwerty, SPACE, "up", { column })).toBe(B)
  })

  it("reports the edge, or wraps", () => {
    expect(nextKeyIndex(qwerty, Q, "up")).toBeNull()
    expect(nextKeyIndex(qwerty, SPACE, "down")).toBeNull()
    expect(nextKeyIndex(qwerty, P, "right", { wrap: true })).toBe(Q)
    expect(nextKeyIndex(qwerty, Q, "left", { wrap: true })).toBe(P)
    expect(nextKeyIndex(qwerty, SPACE, "down", { wrap: true })).toBe(5)
    expect(nextKeyIndex(qwerty, 4, "up", { wrap: true })).toBe(SPACE)
  })

  it("navigates a grid with a wide first row", () => {
    // ␣ ⌫ / a b c d e f / g h i j k l
    const grid = keyboard([[3, 3], [1, 1, 1, 1, 1, 1], [1, 1, 1, 1, 1, 1]])
    // The key under the middle of the wide key.
    expect(nextKeyIndex(grid, 0, "down")).toBe(3)
    expect(nextKeyIndex(grid, 1, "down")).toBe(6)
    expect(nextKeyIndex(grid, 0, "down", { column: 5 })).toBe(2)
    expect(nextKeyIndex(grid, 4, "up")).toBe(0)
    expect(nextKeyIndex(grid, 5, "up")).toBe(1)
    expect(nextKeyIndex(grid, 13, "down")).toBeNull()
  })

  it("follows the boxes as drawn, so right-to-left rows behave as they look", () => {
    // A row drawn right to left: index 0 is on the right.
    const rtl: KeyRect[] = [0, 1, 2].map((index) => ({ left: 20 - index * 10, top: 0, right: 30 - index * 10, bottom: 10 }))
    expect(nextKeyIndex(rtl, 0, "left")).toBe(1)
    expect(nextKeyIndex(rtl, 0, "right")).toBeNull()
  })

  it("starts at the first key when the origin is unknown", () => {
    expect(nextKeyIndex(qwerty, -1, "down")).toBe(0)
    expect(nextKeyIndex([], 0, "down")).toBeNull()
  })
})

describe("rowEdgeIndex", () => {
  it("finds the ends of the row on screen", () => {
    expect(rowEdgeIndex(qwerty, 4, "start")).toBe(Q)
    expect(rowEdgeIndex(qwerty, 4, "end")).toBe(P)
    expect(rowEdgeIndex(qwerty, SPACE, "end")).toBe(ENTER)
    expect(rowEdgeIndex(qwerty, 4, "start", true)).toBe(P)
  })
})
