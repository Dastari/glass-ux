import { describe, expect, it } from "vitest"
import { cameraTransform, containCamera, pinchCamera, spread, wheelPixels, wheelZoom, zoomAround } from "./pan-zoom.js"

describe("pan and zoom geometry", () => {
  it("zooms around a point, which stays put", () => {
    const camera = zoomAround({ x: 10, y: 20, k: 1 }, 2, { x: 110, y: 120 }, 0.25, 4)
    expect(camera).toEqual({ k: 2, x: -90, y: -80 })
    // The content point under (110, 120) is (100, 100) before and after.
    expect((110 - camera.x) / camera.k).toBe(100)
  })

  it("stops at the limits without drifting", () => {
    expect(zoomAround({ x: 0, y: 0, k: 4 }, 2, { x: 50, y: 50 }, 0.25, 4)).toEqual({ k: 4, x: 0, y: 0 })
    expect(zoomAround({ x: 0, y: 0, k: 1 }, 0.01, { x: 0, y: 0 }, 0.25, 4).k).toBe(0.25)
  })

  it("carries a pinch with the fingers' midpoint", () => {
    const from = spread({ x: 0, y: 0 }, { x: 100, y: 0 })
    const to = spread({ x: 50, y: 100 }, { x: 250, y: 100 })
    expect(pinchCamera({ x: 0, y: 0, k: 1 }, from, to, 0.25, 4)).toEqual({ k: 2, x: 50, y: 100 })
    expect(pinchCamera({ x: 0, y: 0, k: 1 }, from, { ...to, distance: 100_000 }, 0.25, 4).k).toBe(4)
  })

  it("reads wheels in any unit", () => {
    expect(wheelPixels(3, 0, 800)).toBe(3)
    expect(wheelPixels(3, 1, 800)).toBe(48)
    expect(wheelPixels(1, 2, 800)).toBe(800)
    expect(wheelZoom(100, false)).toBeLessThan(1)
    expect(wheelZoom(-100, false)).toBeGreaterThan(1)
    expect(wheelZoom(10, true)).toBeCloseTo(Math.exp(-0.1))
  })

  it("centres small content and keeps large content covering the stage", () => {
    const stage = { width: 400, height: 300 }
    const content = { width: 200, height: 100 }
    expect(containCamera({ x: -500, y: 900, k: 1 }, content, stage)).toEqual({ k: 1, x: 100, y: 100 })
    expect(containCamera({ x: 50, y: -900, k: 4 }, content, stage)).toEqual({ k: 4, x: 0, y: -100 })
  })

  it("writes a transform", () => {
    expect(cameraTransform({ x: 1, y: 2, k: 3 })).toBe("translate3d(1px, 2px, 0) scale(3)")
  })
})
