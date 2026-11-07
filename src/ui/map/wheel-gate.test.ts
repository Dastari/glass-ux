import { describe, expect, it } from "vitest"
import { createWheelGate } from "./wheel-gate.js"

describe("wheel gate", () => {
  it("zooms when the wheel starts over the map", () => {
    const gate = createWheelGate(400)
    expect(gate.over(1000)).toBe(true)
    expect(gate.over(1016)).toBe(true)
  })
  it("lets a scroll that began elsewhere carry on across the map", () => {
    const gate = createWheelGate(400)
    gate.elsewhere(1000)
    expect(gate.over(1100)).toBe(false)
    // Each event renews the scroll, however long it spends crossing the map.
    expect(gate.over(1400)).toBe(false)
    expect(gate.over(1700)).toBe(false)
  })
  it("zooms once the wheel has settled on the map", () => {
    const gate = createWheelGate(400)
    gate.elsewhere(1000)
    expect(gate.over(1100)).toBe(false)
    expect(gate.over(1500)).toBe(true)
  })
  it("takes a scroll elsewhere as a new one, even after zooming", () => {
    const gate = createWheelGate(400)
    expect(gate.over(1000)).toBe(true)
    gate.elsewhere(1100)
    expect(gate.over(1200)).toBe(false)
  })
})
