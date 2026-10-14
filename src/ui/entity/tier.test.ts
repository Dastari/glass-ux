import { describe, expect, it } from "vitest"
import { selectEntityTier } from "./tier.js"

/** The container lab's boxes (R7.5), in rem at 16px. */
const LAB = {
  row: [600 / 16, 40 / 16],
  header: [360 / 16, 56 / 16],
  tile: [280 / 16, 180 / 16],
  pane: [720 / 16, 480 / 16],
  tall: [240 / 16, 640 / 16],
  free: [420 / 16, 220 / 16],
} as const

describe("selectEntityTier", () => {
  it("picks a tier for every container-lab box on both axes", () => {
    expect(selectEntityTier(...LAB.row)).toBe("row")
    expect(selectEntityTier(...LAB.header)).toBe("compact")
    expect(selectEntityTier(...LAB.tile)).toBe("compact")
    expect(selectEntityTier(...LAB.pane)).toBe("header")
    expect(selectEntityTier(...LAB.tall)).toBe("compact")
    expect(selectEntityTier(...LAB.free)).toBe("compact")
  })

  it("steps down by height: header, compact, row, chip, icon", () => {
    expect(selectEntityTier(60, 6)).toBe("header")
    expect(selectEntityTier(60, 4)).toBe("compact")
    expect(selectEntityTier(60, 2.5)).toBe("row")
    expect(selectEntityTier(60, 1.5)).toBe("chip")
    expect(selectEntityTier(60, 1)).toBe("icon")
  })

  it("steps down by width: header, compact, icon", () => {
    expect(selectEntityTier(48, 20)).toBe("header")
    expect(selectEntityTier(20, 20)).toBe("compact")
    expect(selectEntityTier(6, 20)).toBe("icon")
  })

  it("decides a flowing box (no height) by width alone", () => {
    expect(selectEntityTier(48, null)).toBe("header")
    expect(selectEntityTier(22, null)).toBe("compact")
    expect(selectEntityTier(5, null)).toBe("icon")
  })
})
