#!/usr/bin/env node
/**
 * Generate public/canvas/silk.svg: two twisting ribbons of hairlines used as a CSS mask
 * on the canvas (see .canvas-silk in glass.css). Only alpha matters; colour comes from the
 * --silk role so the same file works in light and dark.
 */
import { writeFileSync, mkdirSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const W = 1600
const H = 1000
const f = (n) => +n.toFixed(1)

/** Catmull-Rom through points → cubic Bézier path. */
function smooth(points) {
  let d = `M${f(points[0][0])} ${f(points[0][1])}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] ?? p2
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += `C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`
  }
  return d
}

function ribbon({ lines, y0, slope, amp, freq, phase, spread, twist }) {
  const out = []
  for (let i = 0; i < lines; i++) {
    const t = i / (lines - 1) - 0.5
    const pts = []
    for (let x = -120; x <= W + 120; x += 60) {
      const fold = Math.cos(x * twist + phase)
      const y = y0 + slope * x + amp * Math.sin(x * freq + phase + t * 0.9) + t * spread * (0.35 + 0.65 * fold)
      pts.push([x, y])
    }
    const edge = 1 - Math.abs(t) * 2
    const opacity = 0.06 + 0.5 * Math.pow(edge, 1.6)
    out.push(`<path d="${smooth(pts)}" stroke-opacity="${opacity.toFixed(3)}"/>`)
  }
  return out.join("")
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" fill="none" stroke="#fff" stroke-width="1.1">
<g>${ribbon({ lines: 34, y0: 980, slope: -0.42, amp: 70, freq: 0.0042, phase: 0.4, spread: 260, twist: 0.0031 })}</g>
<g>${ribbon({ lines: 22, y0: 120, slope: 0.12, amp: 46, freq: 0.0036, phase: 2.1, spread: 170, twist: 0.0024 })}</g>
</svg>
`
const out = join(dirname(fileURLToPath(import.meta.url)), "..", "public/canvas/silk.svg")
mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, svg)
console.log(`canvas: wrote ${out} (${(svg.length / 1024).toFixed(1)} KB)`)
