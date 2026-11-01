import { describe, expect, it } from "vitest"
import { fitScale, nextStop, turnedBox, turnView, UNTURNED, viewTransform, zoomStops } from "./geometry.js"

describe("lightbox geometry", () => {
  it("fits the whole picture and never scales one up to fit", () => {
    expect(fitScale({ width: 1600, height: 1000 }, { width: 800, height: 800 })).toBe(0.5)
    expect(fitScale({ width: 1000, height: 1600 }, { width: 800, height: 800 })).toBe(0.5)
    expect(fitScale({ width: 200, height: 100 }, { width: 800, height: 800 })).toBe(1)
  })

  it("treats a stage with no size yet as no limit", () => {
    expect(fitScale({ width: 1600, height: 1000 }, { width: 0, height: 0 })).toBe(1)
    expect(fitScale({ width: 1600, height: 1000 }, { width: 800, height: 0 })).toBe(0.5)
  })

  it("counts a turn in the fit: a quarter turn swaps the sides", () => {
    const box = { width: 1600, height: 1000 }
    expect(turnedBox(box, 1)).toEqual({ width: 1000, height: 1600 })
    expect(turnedBox(box, -1)).toEqual({ width: 1000, height: 1600 })
    expect(turnedBox(box, 2)).toEqual(box)
    expect(fitScale(turnedBox(box, 1), { width: 1600, height: 800 })).toBe(0.5)
  })

  it("stops at fit, the steps, actual size and the limit", () => {
    expect(zoomStops(0.25, [1.5, 2, 3], 4)).toEqual([0.25, 0.375, 0.5, 0.75, 1, 4])
  })

  it("drops actual size when a step all but lands on it, so + does not stall", () => {
    expect(zoomStops(0.66, [1.5, 2, 3], 4)).toEqual([0.66, 0.99, 1.32, 1.98, 4])
  })

  it("never lists a stop past the limit", () => {
    expect(Math.max(...zoomStops(0.5, [1.5, 2, 3, 10], 1.2))).toBe(1.2)
    expect(zoomStops(1, [1.5], 1)).toEqual([1])
  })

  it("keeps a small picture's fit when the limit is below it", () => {
    expect(zoomStops(0.8, [2], 0.5)).toEqual([0.8])
  })

  it("steps to the next stop in each direction and rests at the ends", () => {
    const stops = [0.25, 0.5, 1, 4]
    expect(nextStop(stops, 0.25, 1)).toBe(0.5)
    expect(nextStop(stops, 0.7, 1)).toBe(1)
    expect(nextStop(stops, 0.7, -1)).toBe(0.5)
    expect(nextStop(stops, 4, 1)).toBe(4)
    expect(nextStop(stops, 0.25, -1)).toBe(0.25)
  })

  it("turns the way asked after a single flip", () => {
    expect(turnView(UNTURNED, 1).turns).toBe(1)
    expect(turnView({ ...UNTURNED, flipX: true }, 1).turns).toBe(-1)
    expect(turnView({ ...UNTURNED, flipX: true, flipY: true }, 1).turns).toBe(1)
  })

  it("turns the picture first, then flips along the screen's axes", () => {
    expect(viewTransform({ turns: 1, flipX: true, flipY: false })).toBe("scale(-1, 1) rotate(90deg)")
  })
})
