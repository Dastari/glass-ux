import { describe, expect, it } from "vitest"
import { isSignatureEmpty, signatureToSvg, strokeOutline, type DrawnSignature, type SignatureStroke } from "./ink.js"
import { signatureSchema } from "./schema.js"

const line = (count: number, step: number, dt: number, p = 0.5): SignatureStroke =>
  Array.from({ length: count }, (_, index) => ({ x: 20 + index * step, y: 100 + Math.sin(index / 3) * 10, t: index * dt, p }))

/** The outline's thickness mid-stroke (x 35–45), away from the round ends. */
function spread(d: string) {
  const ys: number[] = []
  for (const [, command, args] of d.matchAll(/([MQLA])([^MQLAZ]*)/g)) {
    const numbers = args!.trim().split(/[ ,]+/).map(Number)
    // Arcs end on their last pair; the others are coordinate pairs.
    const pairs = command === "A" ? numbers.slice(5) : numbers
    for (let index = 1; index < pairs.length; index += 2) if (pairs[index - 1]! > 35 && pairs[index - 1]! < 45) ys.push(pairs[index]!)
  }
  return Math.max(...ys) - Math.min(...ys)
}

describe("signature ink", () => {
  it("draws a tap as a dot and a stroke as one closed outline", () => {
    expect(strokeOutline([])).toBe("")
    const tap = strokeOutline([{ x: 50, y: 50, t: 0, p: 0.5 }])
    expect(tap).toMatch(/^M[\d.]+ 50a/)
    expect(tap.endsWith("Z")).toBe(true)
    const stroke = strokeOutline(line(30, 4, 8))
    expect(stroke.startsWith("M")).toBe(true)
    expect(stroke.match(/A/g)).toHaveLength(2)
    expect(stroke.endsWith("Z")).toBe(true)
    expect(stroke).not.toMatch(/NaN|Infinity/)
  })

  it("thins with speed and swells with pen pressure", () => {
    const flat = (stroke: SignatureStroke) => stroke.map((point) => ({ ...point, y: 100 }))
    const slow = spread(strokeOutline(flat(line(20, 2, 16))))
    const fast = spread(strokeOutline(flat(line(20, 2, 1))))
    expect(fast).toBeLessThan(slow)
    const light = spread(strokeOutline(flat(line(20, 2, 16, 0.1))))
    const heavy = spread(strokeOutline(flat(line(20, 2, 16, 1))))
    expect(heavy).toBeGreaterThan(light)
  })

  it("survives repeated points and zero time steps", () => {
    const still = Array.from({ length: 5 }, () => ({ x: 10, y: 10, t: 0, p: 0.5 }))
    expect(strokeOutline(still)).not.toMatch(/NaN|Infinity/)
  })

  it("knows when nothing is signed", () => {
    expect(isSignatureEmpty(null)).toBe(true)
    expect(isSignatureEmpty({ kind: "typed", text: "  " })).toBe(true)
    expect(isSignatureEmpty({ kind: "typed", text: "Ana Lima" })).toBe(false)
    expect(isSignatureEmpty({ kind: "drawn", width: 600, height: 200, strokes: [] })).toBe(true)
    expect(isSignatureEmpty({ kind: "drawn", width: 600, height: 200, strokes: [line(3, 2, 8)] })).toBe(false)
  })
})

describe("signature export", () => {
  const drawn: DrawnSignature = { kind: "drawn", width: 600, height: 200, strokes: [line(10, 5, 8), line(4, 3, 8)] }

  it("writes a standalone SVG at the stored box or a requested width", () => {
    const svg = signatureToSvg(drawn)
    expect(svg).toMatch(/^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" width="600" height="200" viewBox="0 0 600 200">/)
    expect(svg.match(/<path /g)).toHaveLength(2)
    expect(svg).toContain('fill="#000"')
    const wide = signatureToSvg(drawn, { width: 1200, color: "#123456", background: "#fff" })
    expect(wide).toContain('width="1200" height="400"')
    expect(wide).toContain('<rect width="600" height="200" fill="#fff"/>')
    expect(wide).toContain('fill="#123456"')
  })

  it("writes a typed signature as escaped script text", () => {
    const svg = signatureToSvg({ kind: "typed", text: 'Ana <Lima> & "Co"' })
    expect(svg).toContain("<text ")
    expect(svg).toContain("Ana &#60;Lima&#62; &#38; &#34;Co&#34;")
    expect(svg).toContain("cursive")
  })
})

describe("signatureSchema", () => {
  it("allows empty unless required", () => {
    expect(signatureSchema().safeParse(null).success).toBe(true)
    expect(signatureSchema({ required: true }).safeParse(null).success).toBe(false)
    expect(signatureSchema({ required: true }).safeParse({ kind: "typed", text: "" }).success).toBe(false)
    expect(signatureSchema({ required: true }).safeParse({ kind: "typed", text: "Ana Lima" }).success).toBe(true)
    const result = signatureSchema({ required: true }).safeParse(null)
    expect(result.error?.issues[0]?.message).toBe("Add your signature")
    expect(signatureSchema().safeParse({ kind: "drawn" }).success).toBe(false)
  })
})
