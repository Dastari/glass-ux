import { describe, expect, it } from "vitest"
import { closedPath, nearestSpoke, radarFit, radarOutline, spokeLabel, spokePoint } from "./layout.js"

const close = (a: number, b: number) => expect(a).toBeCloseTo(b, 6)

describe("spokePoint", () => {
  it("starts at the top and runs clockwise", () => {
    const top = spokePoint(100, 100, 50, 0, 4, 1)
    close(top.x, 100)
    close(top.y, 50)
    const right = spokePoint(100, 100, 50, 1, 4, 1)
    close(right.x, 150)
    close(right.y, 100)
    const bottom = spokePoint(100, 100, 50, 2, 4, 1)
    close(bottom.y, 150)
  })

  it("scales along the spoke", () => {
    const half = spokePoint(0, 0, 100, 1, 4, 0.5)
    close(half.x, 50)
    expect(spokePoint(10, 20, 100, 3, 6, 0)).toEqual({ x: 10, y: 20 })
  })
})

describe("nearestSpoke", () => {
  it("finds the spoke by angle, wrapping past the last", () => {
    expect(nearestSpoke(0, -10, 4)).toBe(0)
    expect(nearestSpoke(10, 0, 4)).toBe(1)
    expect(nearestSpoke(0, 10, 4)).toBe(2)
    expect(nearestSpoke(-10, 0, 4)).toBe(3)
    // Just left of straight up belongs to the first spoke, not past the last.
    expect(nearestSpoke(-1, -10, 4)).toBe(0)
  })
})

describe("radarOutline", () => {
  const a = { x: 0, y: 0 }
  const b = { x: 10, y: 0 }
  const c = { x: 10, y: 10 }
  const d = { x: 0, y: 10 }

  it("closes a full ring", () => {
    expect(radarOutline([a, b, c])).toEqual({ closed: closedPath([a, b, c]), runs: [], lone: [] })
  })

  it("breaks at a gap, with the run wrapping past the last spoke", () => {
    const outline = radarOutline([a, null, b, c, d])
    expect(outline.closed).toBeNull()
    expect(outline.runs).toEqual(["M10,0L10,10L0,10L0,0"])
    expect(outline.lone).toEqual([])
  })

  it("keeps a reading alone between gaps as a point", () => {
    const outline = radarOutline([a, null, b, c, null])
    expect(outline.runs).toEqual(["M10,0L10,10"])
    expect(outline.lone).toEqual([a])
  })

  it("draws nothing without readings", () => {
    expect(radarOutline([null, null])).toEqual({ closed: null, runs: [], lone: [] })
  })
})

describe("spokeLabel", () => {
  it("stands each label off the ring", () => {
    expect(spokeLabel(0, 4)).toEqual({ anchor: "middle", baseline: "bottom" })
    expect(spokeLabel(1, 4)).toEqual({ anchor: "start", baseline: "middle" })
    expect(spokeLabel(2, 4)).toEqual({ anchor: "middle", baseline: "top" })
    expect(spokeLabel(3, 4)).toEqual({ anchor: "end", baseline: "middle" })
  })
})

describe("radarFit", () => {
  const base = { count: 6, labelHeight: 16, gap: 6, minRadius: 48, pad: 5 }

  it("leaves room for labels on every side", () => {
    const fit = radarFit({ ...base, width: 600, height: 400, labelWidth: 80 })
    expect(fit.radius).toBeCloseTo(400 / 2 - 5 - 16 - 6)
    expect(fit.labelWidth).toBe(80)
    expect(fit.cx).toBe(300)
    expect(fit.cy).toBe(200)
  })

  it("narrows the labels before shrinking the ring past its minimum", () => {
    const fit = radarFit({ ...base, width: 240, height: 300, labelWidth: 120 })
    expect(fit.radius).toBeGreaterThanOrEqual(48)
    expect(fit.labelWidth).toBeLessThan(120)
    // Label, gap and ring stay inside the box.
    expect(fit.radius * Math.sin(Math.PI / 3) + 6 + fit.labelWidth).toBeLessThanOrEqual(240 / 2 - 5 + 1e-6)
  })

  it("fits a ring without labels to the box", () => {
    expect(radarFit({ ...base, count: 4, width: 100, height: 60, labelWidth: 0, labelHeight: 0, gap: 0, minRadius: 0 }).radius).toBe(25)
  })
})
