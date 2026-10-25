import { describe, expect, it } from "vitest"
import { fullyVisible, nextStep, spotlightPath } from "./geometry.js"

const VIEW = { width: 800, height: 600 }

describe("spotlightPath", () => {
  it("cuts a padded, rounded hole around the target", () => {
    const path = spotlightPath(VIEW, { x: 100, y: 50, width: 200, height: 40 }, 8, 12)
    expect(path.startsWith("M0 0H800V600H0Z")).toBe(true)
    expect(path).toContain("M104 42H296")
    expect(path).toContain("A12 12 0 0 1 308 54")
  })

  it("keeps the hole inside the viewport and the radius within half the hole", () => {
    const path = spotlightPath(VIEW, { x: -20, y: 590, width: 40, height: 40 }, 8, 50)
    expect(path).toContain("M0 0H800V600H0ZM9 582H19")
    expect(path).toContain("A9 9")
  })

  it("has the same commands with no target (a point at the centre)", () => {
    const empty = spotlightPath(VIEW, null, 8, 12)
    const full = spotlightPath(VIEW, { x: 1, y: 1, width: 50, height: 50 }, 8, 12)
    expect(empty.replace(/[\d.]+/g, "#")).toBe(full.replace(/[\d.]+/g, "#"))
    expect(empty).toContain("M400 300H400")
  })
})

describe("step helpers", () => {
  it("knows when a target needs scrolling into view", () => {
    expect(fullyVisible({ x: 10, y: 10, width: 100, height: 20 }, VIEW)).toBe(true)
    expect(fullyVisible({ x: 10, y: 590, width: 100, height: 20 }, VIEW)).toBe(false)
  })

  it("skips missing steps in either direction", () => {
    expect(nextStep(5, 1, 1, new Set([2, 3]))).toBe(4)
    expect(nextStep(5, 4, -1, new Set([3, 2, 1, 0]))).toBe(-1)
    expect(nextStep(5, 4, 1, new Set())).toBe(-1)
  })
})
