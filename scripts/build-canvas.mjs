#!/usr/bin/env node
/**
 * Generate the canvas artwork in src/assets/canvas/. Every file is an alpha mask: only
 * opacity matters, and the colour comes from the background's overlay fill (glass.css), so
 * one file works in every palette and in light and dark. Output is deterministic.
 *
 *   node scripts/build-canvas.mjs [--only silk,skyline] [--out DIR]
 */
import { writeFileSync, mkdirSync, readdirSync, readFileSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const W = 1600
const H = 1000
const f = (n) => +n.toFixed(1)

/** Mulberry32: a small seeded generator, so every build draws the same city and forest. */
function random(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

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

/** A smooth ridge sampled across the width (plus bleed) and closed down to the bottom edge. */
function ridge(fn, { step = 40, bottom = H + 10 } = {}) {
  const pts = []
  for (let x = -80; x <= W + 80; x += step) pts.push([x, fn(x)])
  return `${smooth(pts)}L${W + 80} ${bottom}L-80 ${bottom}Z`
}

const open = (aspect = "xMidYMid slice", attrs = "") =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="${aspect}"${attrs}>`

// ── Silk: two twisting ribbons of hairlines ────────────────────────────────────────

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

function silk() {
  return `${open("xMidYMid slice", ` fill="none" stroke="#fff" stroke-width="1.1"`)}
<g>${ribbon({ lines: 34, y0: 980, slope: -0.42, amp: 70, freq: 0.0042, phase: 0.4, spread: 260, twist: 0.0031 })}</g>
<g>${ribbon({ lines: 22, y0: 120, slope: 0.12, amp: 46, freq: 0.0036, phase: 2.1, spread: 170, twist: 0.0024 })}</g>
</svg>
`
}

// ── Pixels: a dissolve of square cells, densest in two corners ─────────────────────

function pixels() {
  const rand = random(7)
  const cell = 40
  const size = 34
  const levels = [0.12, 0.24, 0.42, 0.68]
  const paths = levels.map(() => [])
  const field = (x, y) => {
    const a = Math.hypot((x - W) / 900, (y + 60) / 620) // top right
    const b = Math.hypot((x + 40) / 760, (y - H - 40) / 560) // bottom left
    return Math.max(1 - a, 1 - b * 1.05)
  }
  for (let y = 0; y < H; y += cell) {
    for (let x = 0; x < W; x += cell) {
      const v = field(x + cell / 2, y + cell / 2) + (rand() - 0.5) * 0.5
      if (v < 0.12) continue
      const level = Math.min(levels.length - 1, Math.floor((v - 0.12) * 5.2))
      const inset = (cell - size) / 2
      paths[level].push(`M${x + inset} ${y + inset}h${size}v${size}h-${size}z`)
    }
  }
  return `${open()}
${paths.map((d, i) => (d.length ? `<path fill="#fff" fill-opacity="${levels[i]}" d="${d.join("")}"/>` : "")).join("\n")}
</svg>
`
}

// ── Waves: layered swells rising from the bottom, and a thin crest at the top ──────

function waves() {
  const layers = [
    { base: 610, amp: 46, k: 0.0034, phase: 0.6, amp2: 18, k2: 0.0091, o: 0.16 },
    { base: 690, amp: 52, k: 0.0029, phase: 2.2, amp2: 16, k2: 0.0083, o: 0.24 },
    { base: 770, amp: 40, k: 0.0039, phase: 4.1, amp2: 14, k2: 0.011, o: 0.34 },
    { base: 850, amp: 34, k: 0.0033, phase: 1.3, amp2: 12, k2: 0.0097, o: 0.46 },
    { base: 925, amp: 26, k: 0.0042, phase: 3.4, amp2: 10, k2: 0.012, o: 0.6 },
  ]
  const swell = layers
    .map(({ base, amp, k, phase, amp2, k2, o }) => {
      const d = ridge((x) => base + amp * Math.sin(x * k + phase) + amp2 * Math.sin(x * k2 + phase * 1.7))
      return `<path fill="#fff" fill-opacity="${o}" d="${d}"/>`
    })
    .join("\n")
  const crest = [0, 1, 2]
    .map((i) => {
      const pts = []
      for (let x = -80; x <= W + 80; x += 40) pts.push([x, 120 + i * 26 + 38 * Math.sin(x * 0.0031 + 1.1 + i * 0.35) + 0.08 * x * (1 - i * 0.2)])
      return `<path fill="none" stroke="#fff" stroke-width="1.2" stroke-opacity="${(0.32 - i * 0.08).toFixed(2)}" d="${smooth(pts)}"/>`
    })
    .join("")
  return `${open("xMidYMax slice")}
${swell}
${crest}
</svg>
`
}

// ── Currents: parallel hairlines bent by a slow flow field ─────────────────────────

function currents() {
  const lines = 46
  const out = []
  for (let i = 0; i < lines; i++) {
    const y0 = -60 + (i / (lines - 1)) * (H + 120)
    const pts = []
    for (let x = -120; x <= W + 120; x += 50) {
      const bend =
        70 * Math.sin(x * 0.0024 + y0 * 0.004) +
        38 * Math.sin(x * 0.0051 - y0 * 0.0062 + 1.7) +
        22 * Math.cos(y0 * 0.011 + x * 0.0013)
      pts.push([x, y0 + bend])
    }
    const glow = 0.5 + 0.5 * Math.sin(i * 0.33 + 0.8)
    out.push(`<path d="${smooth(pts)}" stroke-opacity="${(0.08 + 0.42 * glow ** 2).toFixed(3)}"/>`)
  }
  return `${open("xMidYMid slice", ` fill="none" stroke="#fff" stroke-width="1.1"`)}
${out.join("")}
</svg>
`
}

// ── Skyline: three depths of towers, the nearest with lit windows cut out ──────────

/** One building outline as path data: a body with an optional stepped, spired or domed top. */
function building(x, w, h, ground, rand, { windows = false } = {}) {
  const top = ground - h
  let d = ""
  const roll = rand()
  if (roll < 0.18 && w > 50) {
    // stepped crown
    const s = w * 0.18
    d = `M${f(x)} ${ground}V${f(top + 26)}H${f(x + s)}V${f(top + 12)}H${f(x + 2 * s)}V${f(top)}H${f(x + w - 2 * s)}V${f(top + 12)}H${f(x + w - s)}V${f(top + 26)}H${f(x + w)}V${ground}Z`
  } else if (roll < 0.3) {
    // spire
    const cx = x + w / 2
    d = `M${f(x)} ${ground}V${f(top)}H${f(cx - 3)}V${f(top - h * 0.18)}H${f(cx + 3)}V${f(top)}H${f(x + w)}V${ground}Z`
  } else if (roll < 0.38 && w > 40) {
    // dome
    const r = w / 2
    d = `M${f(x)} ${ground}V${f(top + r)}A${f(r)} ${f(r)} 0 0 1 ${f(x + w)} ${f(top + r)}V${ground}Z`
  } else if (roll < 0.5) {
    // slanted roof
    d = `M${f(x)} ${ground}V${f(top + 22)}L${f(x + w)} ${f(top)}V${ground}Z`
  } else {
    d = `M${f(x)} ${ground}V${f(top)}H${f(x + w)}V${ground}Z`
  }
  if (windows && w >= 30) {
    const gap = 9
    const ww = 4
    const wh = 6
    const cols = Math.floor((w - 10) / gap)
    const left = x + (w - (cols - 1) * gap - ww) / 2
    for (let y = top + 40; y < ground - 18; y += 15) {
      for (let c = 0; c < cols; c++) {
        if (rand() < 0.62) continue
        d += `M${f(left + c * gap)} ${f(y)}h${ww}v${wh}h-${ww}z`
      }
    }
  }
  return d
}

function city(rand, { ground, minH, maxH, minW, maxW, gap, windows, from = -40, to = W + 40 }) {
  let d = ""
  for (let x = from; x < to; ) {
    const w = minW + rand() * (maxW - minW)
    // Taller towers cluster around two centres, so the skyline has a downtown.
    const centre = Math.max(Math.exp(-(((x - 520) / 260) ** 2)), 0.8 * Math.exp(-(((x - 1180) / 200) ** 2)))
    const h = minH + (maxH - minH) * (0.25 + 0.75 * centre) * (0.55 + 0.45 * rand())
    d += building(x, w, h, ground, rand, { windows })
    x += w + gap * rand()
  }
  return d
}

function skyline() {
  const rand = random(21)
  const far = city(rand, { ground: 1010, minH: 180, maxH: 470, minW: 34, maxW: 70, gap: 6, windows: false })
  const mid = city(rand, { ground: 1010, minH: 110, maxH: 340, minW: 46, maxW: 96, gap: 14, windows: false })
  const near = city(rand, { ground: 1010, minH: 60, maxH: 230, minW: 60, maxW: 130, gap: 22, windows: true })
  return `${open("xMidYMax slice")}
<path fill="#fff" fill-opacity="0.2" d="${far}"/>
<path fill="#fff" fill-opacity="0.38" d="${mid}"/>
<path fill="#fff" fill-opacity="0.66" fill-rule="evenodd" d="${near}"/>
</svg>
`
}

// ── Harbour: a skyline on the waterline, broken up in its reflection ───────────────

function harbour() {
  const rand = random(5)
  const water = 720
  const back = city(rand, { ground: water, minH: 140, maxH: 400, minW: 30, maxW: 64, gap: 5, windows: false })
  const front = city(rand, { ground: water, minH: 40, maxH: 320, minW: 44, maxW: 104, gap: 16, windows: true })
  // The reflection: the front row mirrored about the waterline, cut into ripples.
  let clip = ""
  for (let y = water + 4, i = 0; y < H + 20; i++) {
    const band = 7 + i * 0.9
    const wobble = (i % 2 ? 1 : -1) * (6 + i * 0.6)
    clip += `<rect x="${f(-40 + wobble)}" y="${f(y)}" width="${W + 80}" height="${f(band)}"/>`
    y += band + 4 + i * 0.7
  }
  return `${open("xMidYMax slice")}
<defs><clipPath id="r">${clip}</clipPath></defs>
<path fill="#fff" fill-opacity="0.22" d="${back}"/>
<path fill="#fff" fill-opacity="0.56" fill-rule="evenodd" d="${front}"/>
<g clip-path="url(#r)" fill="#fff"><path fill-opacity="0.1" transform="matrix(1 0 0 -0.62 0 ${f(water * 1.62)})" d="${back}"/><path fill-opacity="0.22" transform="matrix(1 0 0 -0.62 0 ${f(water * 1.62)})" d="${front}"/></g>
<path fill="none" stroke="#fff" stroke-opacity="0.4" stroke-width="1.5" d="M-40 ${water + 1}H${W + 40}"/>
</svg>
`
}

// ── Forest: mountain ridges behind rows of pines ───────────────────────────────────

function pine(x, ground, h) {
  const w = h * 0.42
  const trunk = h * 0.07
  // A short trunk under three overlapping tiers; the lowest tier sweeps down almost to the ground.
  let d = `M${f(x - w * 0.06)} ${f(ground)}V${f(ground - trunk * 2)}H${f(x + w * 0.06)}V${f(ground)}Z`
  const tiers = [
    [0, 0.5, 1],
    [0.3, 0.76, 0.78],
    [0.56, 1, 0.55],
  ]
  for (const [from, to, spread] of tiers) {
    const yb = ground - trunk - (h - trunk) * from
    const yt = ground - trunk - (h - trunk) * to
    d += `M${f(x - (w / 2) * spread)} ${f(yb)}L${f(x)} ${f(yt)}L${f(x + (w / 2) * spread)} ${f(yb)}Z`
  }
  return d
}

function forest() {
  const rand = random(13)
  const mountains = [
    { o: 0.12, fn: (x) => 430 - 170 * Math.exp(-(((x - 1120) / 300) ** 2)) - 90 * Math.exp(-(((x - 420) / 240) ** 2)) + 18 * Math.sin(x * 0.02) },
    { o: 0.2, fn: (x) => 560 - 120 * Math.exp(-(((x - 760) / 260) ** 2)) - 60 * Math.exp(-(((x - 1450) / 200) ** 2)) + 12 * Math.sin(x * 0.027 + 1) },
  ]
  const rows = [
    { o: 0.3, line: (x) => 700 + 30 * Math.sin(x * 0.0025 + 0.4), h: [70, 120], step: 26 },
    { o: 0.46, line: (x) => 810 + 36 * Math.sin(x * 0.0021 + 2.1), h: [110, 180], step: 40 },
    { o: 0.68, line: (x) => 930 + 30 * Math.sin(x * 0.0029 + 4.3), h: [170, 280], step: 64 },
  ]
  const out = mountains.map(({ o, fn }) => `<path fill="#fff" fill-opacity="${o}" d="${ridge(fn, { step: 20 })}"/>`)
  for (const { o, line, h, step } of rows) {
    let d = ridge(line)
    for (let x = -40; x < W + 40; x += step * (0.6 + rand() * 0.8)) {
      const height = h[0] + rand() * (h[1] - h[0])
      // Sunk by its trunk, so the lowest branches meet the ridge.
      d += pine(x, line(x) + height * 0.07 + 3, height)
    }
    out.push(`<path fill="#fff" fill-opacity="${o}" d="${d}"/>`)
  }
  return `${open("xMidYMax slice")}
${out.join("\n")}
</svg>
`
}

// ── Hills: rolling meadows with round trees on the ridges, and a low sun ───────────

function tree(x, ground, h, rand) {
  const r = h * 0.3
  const trunkW = Math.max(3, h * 0.06)
  let d = `M${f(x - trunkW / 2)} ${f(ground)}V${f(ground - h * 0.5)}H${f(x + trunkW / 2)}V${f(ground)}Z`
  // A canopy of three overlapping circles.
  const blobs = [
    [0, -h + r, r],
    [-r * 0.7, -h + r * 1.7, r * 0.8],
    [r * 0.7, -h + r * 1.6, r * 0.85],
  ]
  for (const [dx, dy, br] of blobs) {
    const cx = x + dx + (rand() - 0.5) * r * 0.2
    const cy = ground + dy
    d += `M${f(cx - br)} ${f(cy)}a${f(br)} ${f(br)} 0 1 0 ${f(2 * br)} 0a${f(br)} ${f(br)} 0 1 0 ${f(-2 * br)} 0Z`
  }
  return d
}

function hills() {
  const rand = random(3)
  const layers = [
    { o: 0.14, fn: (x) => 560 + 70 * Math.sin(x * 0.0021 + 0.3) + 30 * Math.sin(x * 0.0055 + 1.2), trees: 0 },
    { o: 0.24, fn: (x) => 660 + 60 * Math.sin(x * 0.0026 + 2.4) + 24 * Math.sin(x * 0.0061), trees: 7 },
    { o: 0.38, fn: (x) => 780 + 54 * Math.sin(x * 0.0019 + 4.4) + 20 * Math.sin(x * 0.0071 + 2), trees: 5 },
    { o: 0.58, fn: (x) => 900 + 40 * Math.sin(x * 0.0024 + 1.1) + 16 * Math.sin(x * 0.0066 + 3), trees: 3 },
  ]
  const out = []
  layers.forEach(({ o, fn, trees }, i) => {
    let d = ridge(fn, { step: 30 })
    for (let t = 0; t < trees; t++) {
      const x = 80 + ((t + rand() * 0.8) / trees) * (W - 160)
      const h = 40 + i * 34 + rand() * 30
      d += tree(x, fn(x) + 4, h, rand)
    }
    out.push(`<path fill="#fff" fill-opacity="${o}" d="${d}"/>`)
  })
  return `${open("xMidYMax slice")}
${out.join("\n")}
</svg>
`
}

// ── Circuit: chips in two corners, their pins fanning out as traces that end in vias ──

/**
 * One side of a chip's pins as traces: out from the pin, a 45° fan that spreads them from
 * `pitch` to `spread`, then straight on to a via. Pins further from the side's centre bend
 * further, so neighbouring traces never cross.
 */
function fan(rand, { x, y, dir, side, pins, pitch, spread, reach }) {
  // dir: the outward unit vector; side: the unit vector along the chip's edge.
  let d = ""
  let vias = ""
  const mid = (pins - 1) / 2
  const jog = { at: reach * (0.18 + 0.2 * rand()), size: 20 + 40 * rand(), sign: rand() < 0.5 ? -1 : 1 }
  for (let i = 0; i < pins; i++) {
    const o = i - mid
    const start = [x + side[0] * o * pitch, y + side[1] * o * pitch]
    const stub = 14
    const a = [start[0] + dir[0] * stub, start[1] + dir[1] * stub]
    const shift = Math.abs(o) * (spread - pitch)
    const s = Math.sign(o)
    const b = [a[0] + dir[0] * shift + side[0] * s * shift, a[1] + dir[1] * shift + side[1] * s * shift]
    const run = reach * (0.35 + 0.65 * rand())
    let path = `M${f(start[0])} ${f(start[1])}L${f(a[0])} ${f(a[1])}L${f(b[0])} ${f(b[1])}`
    let c
    if (run > jog.at + jog.size + 20) {
      // Every long trace on this side jogs at the same distance by the same amount, so they stay parallel.
      const j1 = [b[0] + dir[0] * jog.at, b[1] + dir[1] * jog.at]
      const j2 = [j1[0] + dir[0] * jog.size + side[0] * jog.sign * jog.size, j1[1] + dir[1] * jog.size + side[1] * jog.sign * jog.size]
      const rest = run - jog.at - jog.size
      c = [j2[0] + dir[0] * rest, j2[1] + dir[1] * rest]
      path += `L${f(j1[0])} ${f(j1[1])}L${f(j2[0])} ${f(j2[1])}`
    } else c = [b[0] + dir[0] * run, b[1] + dir[1] * run]
    d += `${path}L${f(c[0])} ${f(c[1])}`
    vias += `M${f(c[0] + 3.5)} ${f(c[1])}a3.5 3.5 0 1 0 -7 0a3.5 3.5 0 1 0 7 0Z`
  }
  return { d, vias }
}

function chip(rand, cx, cy, size, reach) {
  const h = size / 2
  const pins = Math.floor(size / 12)
  const pitch = 12
  const sides = [
    { x: cx + h, y: cy, dir: [1, 0], side: [0, 1] },
    { x: cx - h, y: cy, dir: [-1, 0], side: [0, 1] },
    { x: cx, y: cy - h, dir: [0, -1], side: [1, 0] },
    { x: cx, y: cy + h, dir: [0, 1], side: [1, 0] },
  ]
  let traces = ""
  let vias = ""
  for (const s of sides) {
    const out = fan(rand, { ...s, pins, pitch, spread: 22, reach })
    traces += out.d
    vias += out.vias
  }
  const body = `M${cx - h + 8} ${cy - h}H${cx + h - 8}A8 8 0 0 1 ${cx + h} ${cy - h + 8}V${cy + h - 8}A8 8 0 0 1 ${cx + h - 8} ${cy + h}H${cx - h + 8}A8 8 0 0 1 ${cx - h} ${cy + h - 8}V${cy - h + 8}A8 8 0 0 1 ${cx - h + 8} ${cy - h}Z`
  const die = `M${cx - h * 0.45} ${cy - h * 0.45}h${f(h * 0.9)}v${f(h * 0.9)}h${f(-h * 0.9)}Z`
  return { traces, vias, body, die }
}

function circuit() {
  const rand = random(11)
  const chips = [chip(rand, 1360, 210, 132, 420), chip(rand, 250, 820, 156, 460), chip(rand, 1180, 860, 72, 220)]
  const traces = chips.map((c) => c.traces).join("")
  const vias = chips.map((c) => c.vias).join("")
  return `${open()}
<path fill="none" stroke="#fff" stroke-opacity="0.42" stroke-width="1.6" stroke-linejoin="round" d="${traces}"/>
<path fill="none" stroke="#fff" stroke-opacity="0.6" stroke-width="1.6" d="${vias}"/>
${chips.map((c) => `<path fill="#fff" fill-opacity="0.22" d="${c.body}"/><path fill="none" stroke="#fff" stroke-opacity="0.6" stroke-width="1.6" d="${c.body}${c.die}"/>`).join("")}
</svg>
`
}

// ── Network: a dot-matrix world, with arcs between hubs ────────────────────────────

/** Ray-casting test against one GeoJSON polygon (outer ring and holes). */
function inPolygon([x, y], rings) {
  let inside = false
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i]
      const [xj, yj] = ring[j]
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
    }
  }
  return inside
}

/** Land cells of a lon/lat grid, from the self-hosted Natural Earth regions in public/geo. */
function landGrid(step) {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..", "public/geo/admin1")
  const land = new Set()
  for (const country of readdirSync(root)) {
    for (const file of readdirSync(join(root, country))) {
      const feature = JSON.parse(readFileSync(join(root, country, file), "utf8"))
      const geometry = feature.geometry
      if (!geometry) continue
      const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.type === "MultiPolygon" ? geometry.coordinates : []
      for (const rings of polygons) {
        let [minX, minY, maxX, maxY] = [180, 90, -180, -90]
        for (const [px, py] of rings[0]) {
          minX = Math.min(minX, px)
          maxX = Math.max(maxX, px)
          minY = Math.min(minY, py)
          maxY = Math.max(maxY, py)
        }
        for (let lon = Math.ceil(minX / step) * step; lon <= maxX; lon += step) {
          for (let lat = Math.ceil(minY / step) * step; lat <= maxY; lat += step) {
            const key = `${f(lon)},${f(lat)}`
            if (!land.has(key) && inPolygon([lon, lat], rings)) land.add(key)
          }
        }
      }
    }
  }
  return [...land].map((key) => key.split(",").map(Number))
}

function network() {
  // Equirectangular, 4.5 px per degree, centred; Antarctica and the far north are left off.
  const scale = 4.6
  const project = ([lon, lat]) => [W / 2 + (lon + 10) * scale, H / 2 - (lat - 14) * scale]
  const step = 1.8
  const dots = landGrid(step)
    .filter(([, lat]) => lat > -56 && lat < 76)
    .map(project)
    .filter(([x, y]) => x > -10 && x < W + 10 && y > -10 && y < H + 10)
  // Each dot is a zero-length stroke with a round cap: a quarter of the bytes of an arc.
  const dotPath = dots.map(([x, y]) => `M${f(x)} ${f(y)}h0`).join("")
  const hubs = {
    sydney: [151.2, -33.9],
    singapore: [103.8, 1.35],
    tokyo: [139.7, 35.7],
    mumbai: [72.9, 19.1],
    dubai: [55.3, 25.2],
    frankfurt: [8.7, 50.1],
    london: [-0.1, 51.5],
    newYork: [-74, 40.7],
    sanFrancisco: [-122.4, 37.8],
    saoPaulo: [-46.6, -23.5],
    johannesburg: [28, -26.2],
    auckland: [174.8, -36.8],
  }
  const links = [
    ["sydney", "singapore"],
    ["sydney", "auckland"],
    ["sydney", "tokyo"],
    ["singapore", "tokyo"],
    ["singapore", "mumbai"],
    ["mumbai", "dubai"],
    ["dubai", "frankfurt"],
    ["frankfurt", "london"],
    ["london", "newYork"],
    ["newYork", "sanFrancisco"],
    ["newYork", "saoPaulo"],
    ["saoPaulo", "johannesburg"],
    ["johannesburg", "dubai"],
    ["sanFrancisco", "tokyo"],
  ]
  let arcs = ""
  for (const [from, to] of links) {
    let [a, b] = [project(hubs[from]), project(hubs[to])]
    // The Pacific crossing wraps the long way round on a flat map; draw it off the edges.
    if (Math.abs(a[0] - b[0]) > W * 0.6) {
      const [left, right] = a[0] < b[0] ? [a, b] : [b, a]
      const width = 360 * scale
      for (const [p, q] of [[left, [right[0] - width, right[1]]], [[left[0] + width, left[1]], right]]) {
        const lift = Math.hypot(q[0] - p[0], q[1] - p[1]) * 0.22
        arcs += `M${f(p[0])} ${f(p[1])}Q${f((p[0] + q[0]) / 2)} ${f((p[1] + q[1]) / 2 - lift)} ${f(q[0])} ${f(q[1])}`
      }
      continue
    }
    const lift = Math.hypot(b[0] - a[0], b[1] - a[1]) * 0.22
    arcs += `M${f(a[0])} ${f(a[1])}Q${f((a[0] + b[0]) / 2)} ${f((a[1] + b[1]) / 2 - lift)} ${f(b[0])} ${f(b[1])}`
  }
  const hubPoints = Object.values(hubs).map(project)
  const ring = (x, y, rr) => `M${f(x + rr)} ${f(y)}a${rr} ${rr} 0 1 0 ${-2 * rr} 0a${rr} ${rr} 0 1 0 ${2 * rr} 0Z`
  return `${open()}
<path fill="none" stroke="#fff" stroke-opacity="0.5" stroke-width="3.6" stroke-linecap="round" d="${dotPath}"/>
<path fill="none" stroke="#fff" stroke-opacity="0.75" stroke-width="1.5" stroke-linecap="round" d="${arcs}"/>
<path fill="#fff" fill-opacity="0.12" d="${hubPoints.map(([x, y]) => ring(x, y, 14)).join("")}"/>
<path fill="none" stroke="#fff" stroke-opacity="0.5" stroke-width="1.2" d="${hubPoints.map(([x, y]) => ring(x, y, 9)).join("")}"/>
<path fill="#fff" fill-opacity="0.95" d="${hubPoints.map(([x, y]) => ring(x, y, 4)).join("")}"/>
</svg>
`
}

// ── Garden: a picket fence and sunflowers behind raised vegetable beds ─────────────

// Every garden shape winds clockwise, so overlaps add up under the nonzero rule instead of cutting holes.
const disc = (x, y, r) => `M${f(x + r)} ${f(y)}a${f(r)} ${f(r)} 0 1 1 ${f(-2 * r)} 0a${f(r)} ${f(r)} 0 1 1 ${f(2 * r)} 0Z`

/** A leaf: a pointed oval from (x, y), `length` long at `angle` degrees (0 points up). */
function leaf(x, y, length, width, angle) {
  const rad = (angle * Math.PI) / 180
  const [dx, dy] = [Math.sin(rad), -Math.cos(rad)]
  const [nx, ny] = [-dy, dx]
  const tip = [x + dx * length, y + dy * length]
  const mid = [x + (dx * length) / 2, y + (dy * length) / 2]
  const w = width / 2
  return `M${f(x)} ${f(y)}Q${f(mid[0] - nx * w * 1.6)} ${f(mid[1] - ny * w * 1.6)} ${f(tip[0])} ${f(tip[1])}Q${f(mid[0] + nx * w * 1.6)} ${f(mid[1] + ny * w * 1.6)} ${f(x)} ${f(y)}Z`
}

function sunflower(x, ground, h, rand) {
  const top = ground - h
  let d = `M${f(x - 2.5)} ${f(ground)}V${f(top)}H${f(x + 2.5)}V${f(ground)}Z`
  d += leaf(x, ground - h * 0.35, 46, 18, -60) + leaf(x, ground - h * 0.55, 40, 16, 62)
  const r = 15 + rand() * 5
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2
    d += disc(x + Math.cos(a) * r * 1.25, top + Math.sin(a) * r * 1.25, r * 0.42)
  }
  return d + disc(x, top, r)
}

/** A lettuce: overlapping round leaves in a low mound. */
function lettuce(x, ground, r) {
  return [
    [0, -r * 0.9, r],
    [-r * 0.85, -r * 0.55, r * 0.75],
    [r * 0.85, -r * 0.55, r * 0.75],
    [-r * 0.4, -r * 1.35, r * 0.6],
    [r * 0.45, -r * 1.3, r * 0.6],
  ]
    .map(([dx, dy, rr]) => disc(x + dx, ground + dy, rr))
    .join("")
}

/** Carrot tops: a fan of narrow leaves. */
function carrot(x, ground, h) {
  return [-34, -16, 0, 16, 34].map((angle, i) => leaf(x, ground + 2, h * (i % 2 ? 0.85 : 1), 7, angle)).join("")
}

/** A tomato cage: a conical frame of three rings, a vine of leaves and round fruit. */
function tomato(x, ground, h, rand) {
  let d = ""
  const w = h * 0.36
  for (const side of [-1, 1]) d += `M${f(x + side * w * 0.5 - 1.5)} ${f(ground)}L${f(x + side * w - 1.5)} ${f(ground - h)}H${f(x + side * w + 1.5)}L${f(x + side * w * 0.5 + 1.5)} ${f(ground)}Z`
  for (const at of [0.3, 0.62, 0.94]) {
    const y = ground - h * at
    const half = w * (0.5 + 0.5 * at)
    d += `M${f(x - half)} ${f(y - 1.5)}H${f(x + half)}V${f(y + 1.5)}H${f(x - half)}Z`
  }
  for (let i = 0; i < 9; i++) d += leaf(x + (rand() - 0.5) * w, ground - h * (0.1 + 0.8 * rand()), 22, 11, (rand() - 0.5) * 140)
  for (let i = 0; i < 5; i++) d += disc(x + (rand() - 0.5) * w * 1.1, ground - h * (0.2 + 0.6 * rand()), 6 + rand() * 3)
  return d
}

function wateringCan(x, ground) {
  // Body, a spout rising to the right with its rose, and a handle as a ring cut in half.
  let d = `M${x} ${ground}V${ground - 62}Q${x} ${ground - 70} ${x + 8} ${ground - 70}H${x + 78}Q${x + 86} ${ground - 70} ${x + 86} ${ground - 62}V${ground}Z`
  d += `M${x + 80} ${ground - 22}L${x + 150} ${ground - 92}L${x + 158} ${ground - 84}L${x + 86} ${ground - 10}Z`
  d += `M${x + 146} ${ground - 98}L${x + 166} ${ground - 108}L${x + 172} ${ground - 82}L${x + 152} ${ground - 78}Z`
  d += `M${x + 6} ${ground - 66}A37 37 0 0 1 ${x + 80} ${ground - 66}H${x + 70}A27 27 0 0 0 ${x + 16} ${ground - 66}Z`
  return d
}

function garden() {
  const rand = random(17)
  const back = (x) => 640 + 26 * Math.sin(x * 0.0024 + 0.6)
  // The fence follows the far ground; pickets have pointed tops.
  let fence = ridge(back)
  for (let x = -20; x < W + 20; x += 30) {
    const y = back(x)
    fence += `M${x} ${f(y + 4)}V${f(y - 78)}L${x + 8} ${f(y - 90)}L${x + 16} ${f(y - 78)}V${f(y + 4)}Z`
  }
  for (const rail of [24, 60]) {
    const pts = []
    for (let x = -80; x <= W + 80; x += 40) pts.push([x, back(x) - rail])
    fence += `${smooth(pts)}L${W + 80} ${f(back(W + 80) - rail + 7)}${smooth(pts.map(([px, py]) => [px, py + 7]).reverse()).replace(/^M/, "L")}Z`
  }
  const middle = (x) => 770 + 18 * Math.sin(x * 0.003 + 2)
  let flowers = ridge(middle)
  for (const x of [90, 150, 230, 1290, 1370, 1450, 1530]) flowers += sunflower(x, middle(x) + 4, 170 + rand() * 120, rand)
  // Raised beds: a timber edge along the front, planted with alternating rows.
  const bedTop = 880
  let beds = `M-40 ${bedTop}H${W + 40}V${H + 10}H-40Z`
  let plants = ""
  const can = 1060
  for (let x = 30, i = 0; x < W; i++) {
    // Leave the watering can a clear patch of bed.
    if (x > can - 60 && x < can + 190) {
      x = can + 190
      continue
    }
    const kind = i % 3
    if (kind === 0) {
      plants += lettuce(x, bedTop + 4, 17 + rand() * 6)
      x += 70
    } else if (kind === 1) {
      plants += carrot(x, bedTop + 4, 50 + rand() * 18) + carrot(x + 26, bedTop + 4, 44 + rand() * 18)
      x += 80
    } else {
      plants += tomato(x + 10, bedTop + 4, 120 + rand() * 50, rand)
      x += 90
    }
  }
  const edge = `M-40 ${bedTop + 26}H${W + 40}V${bedTop + 32}H-40Z`
  return `${open("xMidYMax slice")}
<path fill="#fff" fill-opacity="0.16" d="${fence}"/>
<path fill="#fff" fill-opacity="0.3" d="${flowers}"/>
<path fill="#fff" fill-opacity="0.5" d="${plants}"/>
<path fill="#fff" fill-opacity="0.62" d="${beds}"/>
<path fill="#fff" fill-opacity="0.2" d="${edge}"/>
<path fill="#fff" fill-opacity="0.75" d="${wateringCan(can, bedTop + 2)}"/>
</svg>
`
}

const ART = { silk, pixels, waves, currents, skyline, harbour, forest, hills, circuit, network, garden }

const args = process.argv.slice(2)
const flag = (name) => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : undefined
}
const only = flag("--only")?.split(",")
const dir = flag("--out") ?? join(dirname(fileURLToPath(import.meta.url)), "..", "src/assets/canvas")
mkdirSync(dir, { recursive: true })
for (const [name, draw] of Object.entries(ART)) {
  if (only && !only.includes(name)) continue
  const svg = draw()
  const out = join(dir, `${name}.svg`)
  writeFileSync(out, svg)
  console.log(`canvas: ${name}.svg ${(svg.length / 1024).toFixed(1)} KB`)
}
