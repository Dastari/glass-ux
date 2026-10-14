// Glass UX icon authoring helpers. Geometry is computed, then rounded to 0.01.
// Angle convention everywhere: degrees, 0 = 12 o'clock, clockwise positive (screen space).

export const fmt = (n) => {
  let v = Math.round(n * 100) / 100
  if (Object.is(v, -0) || Math.abs(v) < 1e-9) v = 0
  return String(v)
}
const P = (p) => `${fmt(p[0])} ${fmt(p[1])}`
export const rad = Math.PI / 180
export const polar = (cx, cy, r, a) => [cx + r * Math.sin(a * rad), cy - r * Math.cos(a * rad)]
export const angleOf = (c, p) => {
  let a = Math.atan2(p[0] - c[0], -(p[1] - c[1])) / rad
  if (a < 0) a += 360
  return a
}
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]]
const add = (a, b) => [a[0] + b[0], a[1] + b[1]]
const mul = (a, k) => [a[0] * k, a[1] * k]
const len = (a) => Math.hypot(a[0], a[1])
const norm = (a) => mul(a, 1 / len(a))
const dot = (a, b) => a[0] * b[0] + a[1] * b[1]
const cross = (a, b) => a[0] * b[1] - a[1] * b[0]
export const V = { sub, add, mul, len, norm, dot, cross }

// ── primitives ────────────────────────────────────────────────────────────────
// line: {k:'l', p, q}; arc: {k:'a', c, r, a0, a1} (a1 > a0 clockwise, a1 < a0 counter-clockwise)
export const line = (p, q) => ({ k: "l", p, q })
export const arc = (c, r, a0, a1) => ({ k: "a", c, r, a0, a1 })
export const startOf = (s) => (s.k === "l" ? s.p : polar(s.c[0], s.c[1], s.r, s.a0))
export const endOf = (s) => (s.k === "l" ? s.q : polar(s.c[0], s.c[1], s.r, s.a1))
const at = (s, t) => {
  if (s.k === "l") return add(s.p, mul(sub(s.q, s.p), t))
  return polar(s.c[0], s.c[1], s.r, s.a0 + (s.a1 - s.a0) * t)
}
const slice = (s, t0, t1) => {
  if (s.k === "l") return line(at(s, t0), at(s, t1))
  return arc(s.c, s.r, s.a0 + (s.a1 - s.a0) * t0, s.a0 + (s.a1 - s.a0) * t1)
}

/** Path data for a chain of primitives; consecutive touching pieces share one subpath. */
export function d(prims, close = false) {
  let out = ""
  let cur = null
  let first = null
  for (const s of prims) {
    const a = startOf(s)
    const b = endOf(s)
    if (!cur || len(sub(cur, a)) > 0.02) {
      if (close && first && cur && len(sub(cur, first)) < 0.02) out += "Z"
      out += `M${P(a)}`
      first = a
    }
    if (s.k === "l") {
      if (Math.abs(a[1] - b[1]) < 1e-6 && Math.abs(a[0] - b[0]) > 1e-6) out += `H${fmt(b[0])}`
      else if (Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) > 1e-6) out += `V${fmt(b[1])}`
      else out += `L${P(b)}`
    } else {
      const sweepDeg = s.a1 - s.a0
      if (Math.abs(sweepDeg) >= 359.99) {
        // full circle: two halves
        const mid = polar(s.c[0], s.c[1], s.r, s.a0 + sweepDeg / 2)
        const sw = sweepDeg > 0 ? 1 : 0
        out += `A${fmt(s.r)} ${fmt(s.r)} 0 0 ${sw} ${P(mid)}A${fmt(s.r)} ${fmt(s.r)} 0 0 ${sw} ${P(b)}`
      } else {
        const large = Math.abs(sweepDeg) > 180 ? 1 : 0
        const sw = sweepDeg > 0 ? 1 : 0
        out += `A${fmt(s.r)} ${fmt(s.r)} 0 ${large} ${sw} ${P(b)}`
      }
    }
    cur = b
  }
  if (close) out += "Z"
  return out
}

/**
 * Rounded polygon/polyline as primitives. radii: number or array per vertex (0 = joint only).
 * For open polylines the first and last vertex are never rounded.
 */
export function poly(points, radii = 0, closed = true) {
  const n = points.length
  const R = (i) => (Array.isArray(radii) ? radii[i] ?? 0 : radii)
  const corners = points.map((p1, i) => {
    if (!closed && (i === 0 || i === n - 1)) return { a: p1, b: p1 }
    const r = R(i)
    if (!r) return { a: p1, b: p1 }
    const p0 = points[(i - 1 + n) % n]
    const p2 = points[(i + 1) % n]
    const u1 = norm(sub(p0, p1))
    const u2 = norm(sub(p2, p1))
    const theta = Math.acos(Math.max(-1, Math.min(1, dot(u1, u2))))
    const t = r / Math.tan(theta / 2)
    const T1 = add(p1, mul(u1, t))
    const T2 = add(p1, mul(u2, t))
    const bis = norm(add(u1, u2))
    const C = add(p1, mul(bis, r / Math.sin(theta / 2)))
    const turn = cross(sub(p1, p0), sub(p2, p1))
    let a0 = angleOf(C, T1)
    let a1 = angleOf(C, T2)
    if (turn > 0) {
      while (a1 < a0) a1 += 360
    } else {
      while (a1 > a0) a1 -= 360
    }
    return { a: T1, b: T2, arc: arc(C, r, a0, a1) }
  })
  const prims = []
  const count = closed ? n : n - 1
  for (let i = 0; i < count; i++) {
    const c = corners[i]
    const nx = corners[(i + 1) % n]
    if (c.arc) prims.push(c.arc)
    if (len(sub(nx.a, c.b)) > 1e-6) prims.push(line(c.b, nx.a))
  }
  if (!closed && corners[n - 1].arc) prims.push(corners[n - 1].arc)
  // closed: rotate so we start after the last corner's arc
  return prims
}

export function rrect(x, y, w, h, r) {
  return poly(
    [
      [x, y],
      [x + w, y],
      [x + w, y + h],
      [x, y + h],
    ],
    r
  )
}

export const circlePrim = (cx, cy, r, a0 = 0) => arc([cx, cy], r, a0, a0 + 360)

// ── knockouts ─────────────────────────────────────────────────────────────────
export const segDist = (pt, a, b) => {
  const ab = sub(b, a)
  const t = Math.max(0, Math.min(1, dot(sub(pt, a), ab) / dot(ab, ab)))
  return len(sub(pt, add(a, mul(ab, t))))
}
export const band = (a, b, dd) => (pt) => segDist(pt, a, b) < dd
export const disk = (c, R) => (pt) => len(sub(pt, c)) < R
export const any = (...fs) => (pt) => fs.some((f) => f(pt))
export const nearPrims = (prims, dd) => (pt) =>
  prims.some((s) => {
    if (s.k === "l") return segDist(pt, s.p, s.q) < dd
    // distance to arc: sample
    for (let i = 0; i <= 200; i++) if (len(sub(pt, at(s, i / 200))) < dd) return true
    return false
  })

/** Remove the parts of each primitive that fall inside the region. */
export function cut(prims, inside) {
  const out = []
  for (const s of prims) {
    const N = 600
    let runStart = inside(at(s, 0)) ? null : 0
    let prevIn = inside(at(s, 0))
    for (let i = 1; i <= N; i++) {
      const t = i / N
      const nowIn = inside(at(s, t))
      if (nowIn !== prevIn) {
        // refine boundary
        let lo = (i - 1) / N
        let hi = t
        for (let k = 0; k < 40; k++) {
          const m = (lo + hi) / 2
          if (inside(at(s, m)) === prevIn) lo = m
          else hi = m
        }
        const tb = (lo + hi) / 2
        if (nowIn) {
          if (runStart !== null && tb - runStart > 1e-4) out.push(slice(s, runStart, tb))
          runStart = null
        } else runStart = tb
        prevIn = nowIn
      }
    }
    if (runStart !== null && 1 - runStart > 1e-4) out.push(slice(s, runStart, 1))
  }
  return out
}

// ── elements ──────────────────────────────────────────────────────────────────
const cls = (c) => (c ? ` class="${c}"` : "")
export const path = (dd, c) => `<path${cls(c)} d="${dd}"/>`
export const rect = (x, y, w, h, r, c) =>
  `<rect${cls(c)} x="${fmt(x)}" y="${fmt(y)}" width="${fmt(w)}" height="${fmt(h)}"${r ? ` rx="${fmt(r)}"` : ""}/>`
export const circle = (cx, cy, r, c) => `<circle${cls(c)} cx="${fmt(cx)}" cy="${fmt(cy)}" r="${fmt(r)}"/>`
export const dotEl = (cx, cy, r = 1.1) => circle(cx, cy, r, "d")
export const ellipse = (cx, cy, rx, ry, c) => `<ellipse${cls(c)} cx="${fmt(cx)}" cy="${fmt(cy)}" rx="${fmt(rx)}" ry="${fmt(ry)}"/>`

/** Stroke + tint from the same primitives. */
export const tinted = (prims) => [path(d(prims, true), "t"), path(d(prims, true))]

export function svg(elements) {
  const tints = elements.filter((e) => e.includes('class="t"'))
  const rest = elements.filter((e) => !e.includes('class="t"'))
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">\n${[...tints, ...rest].map((e) => `  ${e}`).join("\n")}\n</svg>\n`
}

/** Mirror helpers. */
export const mx = (p) => [24 - p[0], p[1]]
export const my = (p) => [p[0], 24 - p[1]]
/** Rotate a point around a centre by deg (clockwise). */
export const rot = (p, c, a) => {
  const s = Math.sin(a * rad)
  const k = Math.cos(a * rad)
  const v = sub(p, c)
  return [c[0] + v[0] * k - v[1] * s, c[1] + v[0] * s + v[1] * k]
}

/** Centre-line bounding box of primitives (sampled). */
export function bbox(prims) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (const s of prims) {
    for (let i = 0; i <= 200; i++) {
      const p = s.k === "l" ? add(s.p, mul(sub(s.q, s.p), i / 200)) : polar(s.c[0], s.c[1], s.r, s.a0 + ((s.a1 - s.a0) * i) / 200)
      x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1])
    }
  }
  return { x0: +x0.toFixed(2), y0: +y0.toFixed(2), x1: +x1.toFixed(2), y1: +y1.toFixed(2), cx: +((x0 + x1) / 2).toFixed(2), cy: +((y0 + y1) / 2).toFixed(2) }
}
/** Translate primitives. */
export const move = (prims, dx, dy) =>
  prims.map((s) => (s.k === "l" ? line(add(s.p, [dx, dy]), add(s.q, [dx, dy])) : arc(add(s.c, [dx, dy]), s.r, s.a0, s.a1)))
/** Polyline (open) helper: points → line prims with optional rounding. */
export const pl = (points, radii = 0) => poly(points, radii, false)
/** Mirror primitives horizontally around x=12. */
export const mirrorX = (prims) =>
  prims.map((s) => (s.k === "l" ? line(mx(s.p), mx(s.q)) : arc(mx(s.c), s.r, 360 - s.a0, 360 - s.a1)))
export const mirrorY = (prims) =>
  prims.map((s) => (s.k === "l" ? line(my(s.p), my(s.q)) : arc(my(s.c), s.r, 180 - s.a0, 180 - s.a1)))
/** Reverse direction of a chain. */
export const reverse = (prims) => prims.slice().reverse().map((s) => (s.k === "l" ? line(s.q, s.p) : arc(s.c, s.r, s.a1, s.a0)))
/** Path data without its leading moveto (to continue a path). */
export const cont = (dd) => dd.replace(/^M[-\d. ]+/, "")
/** Upper (smaller y) intersection of two circles, or both. */
export function intersect(c1, r1, c2, r2) {
  const dd = Math.hypot(c2[0] - c1[0], c2[1] - c1[1])
  const a = (dd * dd + r1 * r1 - r2 * r2) / (2 * dd)
  const h = Math.sqrt(Math.max(0, r1 * r1 - a * a))
  const ex = [(c2[0] - c1[0]) / dd, (c2[1] - c1[1]) / dd]
  const m = [c1[0] + ex[0] * a, c1[1] + ex[1] * a]
  const p1 = [m[0] - ex[1] * h, m[1] + ex[0] * h]
  const p2 = [m[0] + ex[1] * h, m[1] - ex[0] * h]
  return p1[1] < p2[1] ? [p1, p2] : [p2, p1]
}
/** Circular arc through chord ends (x0,y)–(x1,y) bulging up to `top`. */
export function dome(x0, x1, y, top) {
  const half = (x1 - x0) / 2
  const sag = y - top
  const R = (half * half + sag * sag) / (2 * sag)
  const c = [(x0 + x1) / 2, top + R]
  const a = (Math.asin(half / R) * 180) / Math.PI
  return arc(c, R, -a, a)
}
/** Translate so the centre-line bbox centres on (12,12), snapped to 0.25. */
export function centred(prims, ox = 0, oy = 0) {
  const b = bbox(prims)
  const dx = Math.round((12 - b.cx + ox) * 4) / 4
  const dy = Math.round((12 - b.cy + oy) * 4) / 4
  return move(prims, dx, dy)
}
