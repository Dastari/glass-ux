import { describe, expect, it } from "vitest"
import { comboLine } from "./combo-marks.js"

const at = (index: number) => 10 + index * 20
const y = (value: number) => 100 - value

describe("comboLine", () => {
  it("draws one path over a full run, ending at the last reading", () => {
    const line = comboLine("a", 2, undefined, [1, 2, 3], 3, at, y)
    expect(line.paths).toHaveLength(1)
    expect(line.lone).toEqual([])
    expect(line.end).toEqual({ x: 50, y: 97 })
    expect(line.points).toEqual([{ x: 10, y: 99 }, { x: 30, y: 98 }, { x: 50, y: 97 }])
  })

  it("breaks at a gap and keeps a reading alone between gaps as a dot", () => {
    const line = comboLine("a", 1, undefined, [1, 2, null, 4, null, 6, 7], 7, at, y)
    expect(line.paths).toHaveLength(2)
    expect(line.lone).toEqual([{ x: 70, y: 96 }])
    expect(line.points[2]).toBeNull()
  })

  it("has no end without readings, and pads short data with gaps", () => {
    expect(comboLine("a", 1, undefined, [null, null], 2, at, y)).toMatchObject({ paths: [], lone: [], end: null })
    expect(comboLine("a", 1, undefined, [5], 3, at, y).points).toEqual([{ x: 10, y: 95 }, null, null])
  })
})
