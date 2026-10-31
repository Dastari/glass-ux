import {
  angleOf, arc, circle, cut, d, dotEl, ellipse, endOf, line, mirrorX, nearPrims, path, pl, polar, poly, rect, reverse, rot,
  startOf, V,
} from "../lib.mjs"

// Original monochrome device-vendor adaptations: computers, chips, storage and power.
// A brand's current symbol is drawn where it has one; a wordmark-only brand is its own
// initial, traced from the wordmark. No fonts or downloaded logo paths are embedded.
// Identity references: the logos in the companies' Wikipedia infoboxes (HPE 2025, Intel
// 2023, Western Digital 2023), ASUS's 2025 symbol and the ROG eye as supplied, plus:
// https://www.supermicro.com/manuals/SUPERMICRO_Logo_Guidelines_SC.pdf
// https://www.seagate.com/stories/media-assets/company-logos/
// https://www.amd.com/en/legal/trademarks.html
// https://www.eaton.com/us/en-us/company/news-insights/media-resources.html
// https://us.msi.com/about/brandStory/
export const icons = {}
const def = (name, fn) => (icons[name] = fn)
const shape = (points, radius = 0.75) => d(poly(points, radius), true)
const rotate = (segments, degrees, centre = [12, 12]) => segments.map((s) => s.k === "l"
  ? line(rot(s.p, centre, degrees), rot(s.q, centre, degrees))
  : arc(rot(s.c, centre, degrees), s.r, s.a0 + degrees, s.a1 + degrees))
/** Circular arc from p0 through pm to p1. */
const arc3 = (p0, pm, p1) => {
  const [ax, ay] = p0, [bx, by] = pm, [cx, cy] = p1
  const k = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by))
  const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / k
  const uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / k
  const c = [ux, uy]
  const a0 = angleOf(c, p0)
  const am = angleOf(c, pm)
  let a1 = angleOf(c, p1)
  // Clockwise when pm lies between p0 and p1 going clockwise.
  const cw = ((am - a0 + 360) % 360) < ((a1 - a0 + 360) % 360)
  if (cw) { while (a1 < a0) a1 += 360 } else { while (a1 > a0) a1 -= 360 }
  return arc(c, Math.hypot(ax - ux, ay - uy), a0, a1)
}
/** A chain offset to the right of its direction of travel (negative t: to the left). */
const offset = (chain, t) => chain.map((s) => {
  if (s.k === "a") return arc(s.c, s.a1 > s.a0 ? s.r - t : s.r + t, s.a0, s.a1)
  const u = V.norm(V.sub(s.q, s.p))
  const n = [-u[1] * t, u[0] * t]
  return line(V.add(s.p, n), V.add(s.q, n))
})
/** Closed outline of a heavy stroke of width 2t along a centre-line chain, ends cut square. */
const heavy = (chain, t) => {
  const r = offset(chain, t)
  const l = reverse(offset(chain, -t))
  return [...r, line(endOf(r.at(-1)), startOf(l[0])), ...l, line(endOf(l.at(-1)), startOf(r[0]))]
}
/** A level oval of half-width a and half-height b from four circular arcs, end radius r. */
const oval = (cx, cy, a, b, r) => {
  const R = ((a - r) ** 2 + b * b - r * r) / (2 * (b - r))
  const j = (Math.atan2(a - r, R - b) * 180) / Math.PI
  return [
    arc([cx, cy + R - b], R, -j, j), arc([cx + a - r, cy], r, j, 180 - j),
    arc([cx, cy - R + b], R, 180 - j, 180 + j), arc([cx - a + r, cy], r, 180 + j, 360 - j),
  ]
}
/** Common tangent from circle 1 (left of the line) to circle 2 (right of it): the spine of an S. */
const spine = (c1, r1, c2, r2) => {
  const D = V.sub(c2, c1)
  const L = V.len(D)
  const phi = Math.asin((r1 + r2) / L)
  for (const sgn of [1, -1]) {
    const th = Math.atan2(D[1], D[0]) + sgn * phi
    const u = [Math.cos(th), Math.sin(th)]
    const nR = [-u[1], u[0]]
    const t1 = V.add(c1, V.mul(nR, r1))
    const t2 = V.sub(c2, V.mul(nR, r2))
    if (V.cross(u, V.sub(c1, t1)) < 0 && Math.abs(V.cross(u, V.sub(t2, t1))) < 1e-6) return [t1, t2]
  }
  throw new Error("no spine")
}

def("dell", () => [
  // The roundel's E leans back about 30 degrees, as in the wordmark.
  circle(12, 12, 9, "t"), circle(12, 12, 9),
  path(d(rotate(pl([[15, 7.5], [9, 7.5], [9, 16.5], [15, 16.5]]), -30))),
  path(d(rotate([line([9, 12], [14, 12])], -30))),
])

def("hp", () => [
  circle(12, 12, 9, "t"), circle(12, 12, 9),
  path("M6.5 15L10.5 5M8.5 10H11L9 15M12.5 19L16.5 9H19L17 14H14.5"),
])

def("hpe", () => {
  // The 2025 E: a bar over the "Element", a block with a slot cut from the right.
  const bar = shape([[4, 3.25], [20, 3.25], [20, 6.25], [7.5, 6.25], [7.5, 7.5], [4, 7.5]], 0.5)
  const element = shape([[4, 10.5], [20, 10.5], [20, 13.75], [7.5, 13.75], [7.5, 17.5], [20, 17.5], [20, 20.75], [4, 20.75]], 0.5)
  return [path(element, "t"), path(bar), path(element)]
})

def("lenovo", () => [
  // The wordmark sits in a box; keep the box and its opening "Le", with the e's raked bar.
  rect(2.5, 5.5, 19, 13, 1.5, "t"), rect(2.5, 5.5, 19, 13, 1.5),
  path("M6.5 9V15H9.25"),
  path(d([line(polar(14.5, 12, 2.75, 240), polar(14.5, 12, 2.75, 60)), arc([14.5, 12], 2.75, 60, -228)])),
])

def("asus", () => {
  // The 2025 symbol: an arrowhead whose left wing runs on to the right edge, notching it.
  const apex = [12, 3.25], left = [2.85, 21.25], right = [21.15, 21.25], notch = [12, 16.67]
  const head = poly([apex, right, notch, left], [0.75, 0.5, 0, 0.5])
  // The left wing's line runs on until it meets the right edge.
  const g = (right[0] - apex[0]) / (right[1] - apex[1]), m = (notch[1] - left[1]) / (notch[0] - left[0])
  const y = (left[1] + m * (apex[0] - g * apex[1] - left[0])) / (1 - m * g)
  return [path(d(head, true), "t"), path(d(head, true)), path(d([line(notch, [apex[0] + g * (y - apex[1]), y])]))]
})

def("asus-rog", () => {
  // The Republic of Gamers eye: a swept brow ending in a spike, a wing, the almond eye
  // and its slit pupil.
  const P = (x, y) => [10.75 + (x - 130) * 0.09, 12 + (y - 73.5) * 0.115]
  return [
    path(d([arc3(P(222, 19), P(150, 42), P(92, 98)), line(P(92, 98), P(104, 128))])),
    path(d([line(P(52, 74), P(88, 93))])),
    path(d([arc3(P(234, 40), P(165, 70), P(106, 108)), line(P(106, 108), P(160, 121)), arc3(P(160, 121), P(203, 106), P(223, 63))])),
    path(d([line(P(170, 94), P(198, 83))])),
  ]
})

def("acer", () => {
  // acer's a: a level arm rounding into a raked stem, and a flat-topped bowl below it.
  const xr = (y) => 18.75 + 0.15 * (19.5 - y), xl = (y) => xr(y) - 3.5
  const outer = d(poly([[6.75, 4.25], [xr(4.25), 4.25], [xr(19.5), 19.5], [3.25, 19.5], [3.25, 10.75], [xl(10.25), 10.25], [xl(7.25), 7.25], [6.25, 7.25]],
    [0.5, 4, 0.5, 4.37, 4.37, 0.5, 0.5, 0.5]), true)
  const counter = d(poly([[7.5, 13.75], [7.5, 16.75], [xl(16.75), 16.75], [xl(13.75), 13.75]], [1.5, 1.5, 0.5, 0.5]), true)
  return [path(outer + counter, "t"), path(outer + counter)]
})

def("msi", () => {
  // The heavy italic lower-case wordmark: slanted stems, round arches, a slanted i.
  const k = 0.3, base = 18, top = 9
  const sl = (x, y) => [x + k * (base - y), y]
  const m = [
    ...pl([sl(1.5, base), sl(1.5, top), sl(4.75, top), sl(4.75, base)], [0, 1, 1.6, 0]),
    ...pl([sl(4.75, top + 2), sl(4.75, top), sl(8, top), sl(8, base)], [0, 1.6, 1.6, 0]),
  ]
  // The s's bowls are circles stepped along the slant, joined by their common tangent.
  const r = 2.15, c1 = sl(12.6, top + r), c2 = sl(12.6, base - r)
  const [t1, t2] = spine(c1, r, c2, r)
  const s = [arc(c1, r, 72, angleOf(c1, t1) - 360), line(t1, t2), arc(c2, r, angleOf(c2, t2), 252)]
  return [path(d(m)), path(d(s)), path(d([line(sl(17.75, base), sl(17.75, top + 1.5))])), dotEl(...sl(17.75, top - 2.25), 1.15)]
})

def("gigabyte", () => {
  // The wordmark's heavy G: a round back, square jaw and no spur.
  const g = shape([[19.5, 4], [4.75, 4], [4.75, 20], [19.5, 20], [19.5, 10.75], [15.5, 10.75],
    [15.5, 16.25], [8.5, 16.25], [8.5, 7.75], [19.5, 7.75]], [0.5, 8, 8, 0.5, 0.5, 0.5, 0.5, 4.25, 4.25, 0.5])
  return [path(g, "t"), path(g)]
})

def("supermicro", () => {
  // The orbit is a level oval with the dot on its right end, round the wordmark's serif S.
  const dot = [20.75, 12]
  return [
    path(d(cut(oval(11.75, 12, 9, 6, 3), (p) => Math.hypot(p[0] - dot[0], p[1] - dot[1]) < 3))),
    path(d(pl([[13.75, 10.5], [13.75, 9], [9.75, 9], [9.75, 12], [13.75, 12], [13.75, 15], [9.75, 15], [9.75, 13.5]], [0, 0.5, 1.5, 1.5, 1.5, 1.5, 0.5, 0]))),
    dotEl(dot[0], dot[1], 1.5),
  ]
})

def("fujitsu", () => [
  path("M5.5 21V10.5H14M5.5 15.5H12"),
  path("M12 6L14.5 3.5A2.25 2.25 0 1 1 14.5 6.5L12 4A2.25 2.25 0 1 0 12 6"),
])

def("panasonic", () => {
  // The wordmark's heavy P: square stem, round bowl and a small counter.
  const outer = d(poly([[4.75, 3.5], [19.75, 3.5], [19.75, 15], [9.75, 15], [9.75, 20.5], [4.75, 20.5]], [0.5, 5.75, 5.75, 0.5, 0.5, 0.5]), true)
  const counter = d(poly([[9.75, 7.5], [9.75, 11], [14.75, 11], [14.75, 7.5]], [0.5, 0.5, 1.75, 1.75]), true)
  return [path(outer + counter, "t"), path(outer + counter)]
})

def("samsung", () => [
  // The corporate ellipse round the wordmark's S, whose terminals turn down square.
  ellipse(12, 12, 10, 7.5, "t"), ellipse(12, 12, 10, 7.5),
  path(d([
    arc([14, 9.75], 2, 55, 0), line([14, 7.75], [10, 7.75]), arc([10, 9.75], 2, 360, 180),
    line([10, 11.75], [14, 11.75]), arc([14, 13.75], 2, 0, 180), line([14, 15.75], [10, 15.75]), arc([10, 13.75], 2, 180, 235),
  ])),
])

def("intel", () => {
  // The 2023 wordmark's i: a square dot over a square-cut stem.
  const stem = d(poly([[10, 10.25], [14, 10.25], [14, 20.75], [10, 20.75]], 0.5), true)
  const dot = d(poly([[10, 3.25], [14, 3.25], [14, 7.25], [10, 7.25]], 0.5), true)
  return [path(stem + dot, "t"), path(stem), path(dot)]
})

def("amd", () => [
  // Two stepped ribbons form the arrow; there is no diagonal shaft through it.
  path("M9 3H21V15L16.5 10.5V7.5H13.5Z", "t"),
  path("M9 3H21V15L16.5 10.5V7.5H13.5Z"),
  path("M7.5 9L3 13.5V21H10.5L15 16.5H7.5Z"),
])

def("nvidia", () => [
  path("M12 7V3.5H21V20.5H12V17Z", "t"),
  path("M12 7V3.5H21V20.5H12V17"),
  path("M3 12L7 8A7 7 0 0 1 17 12A7 7 0 0 1 7 16Z"),
  path("M12 9A3 3 0 1 0 12 15"),
])

def("synology", () => {
  // The wordmark's heavy sans S: wide bowls, a diagonal spine and terminals cut level.
  const a = [13.25, 8], b = [10.75, 8], c = [13.25, 15.9], e = [10.75, 15.9], r1 = 3.6, r2 = 3.7
  const [t1, t2] = spine(b, r1, c, r2)
  const s = heavy([
    arc(a, r1, 98, 0), line([a[0], a[1] - r1], [b[0], b[1] - r1]), arc(b, r1, 360, angleOf(b, t1)),
    line(t1, t2),
    arc(c, r2, angleOf(c, t2), 180), line([c[0], c[1] + r2], [e[0], e[1] + r2]), arc(e, r2, 180, 278),
  ], 1.4)
  return [path(d(s, true), "t"), path(d(s, true))]
})

def("qnap", () => {
  // QNAP's Q: a squared ring with a square counter, cut by a curved tail at its corner.
  const outer = poly([[3, 5], [21, 5], [21, 19], [3, 19]], 4.5)
  const inner = poly([[8.5, 8.5], [8.5, 15.5], [15.5, 15.5], [15.5, 8.5]], 0.75)
  const tail = arc3([11.75, 13.75], [17.1, 16.4], [20.75, 20])
  const keep = (prims) => d(cut(prims, nearPrims([tail], 2.6)))
  return [path(d(outer, true) + d(inner, true), "t"), path(keep(outer)), path(keep(inner)), path(d([tail]))]
})

def("seagate", () => [
  // A continuous, tilted spiral rather than three disconnected signal rings.
  path(d(rotate([
    line([9, 10], [13, 10]),
    arc([13, 12], 2, 0, 180),
    line([13, 14], [8, 14]),
    arc([8, 9.5], 4.5, 180, 360),
    line([8, 5], [14, 5]),
    arc([14, 12], 7, 0, 180),
    line([14, 19], [11, 19]),
  ], -30))),
])

def("western-digital", () => {
  // The 2023 symbol: bars narrowing to the right, each with its right corners chamfered.
  const bar = (x0, x1) => [[x0, 3.5], [x0 + 0.75, 3.5], [x1, 6.5], [x1, 17.5], [x0 + 0.75, 20.5], [x0, 20.5]]
  const bars = [bar(2.75, 8), bar(11, 14.25), bar(17.25, 18.5)].map((b) => d(poly(b, 0.5), true)).join("")
  return [path(bars, "t"), path(bars), path("M21.5 4V20")]
})

def("apc", () => [
  // A flat-topped A whose right leg runs into the P's stem, and a nearly closed C.
  path(d(pl([[2, 17.5], [5, 6.5], [6.5, 6.5], [9.75, 17.5]], [0, 0.5, 0.5, 0]))),
  path("M3.5 14.25H8.5"),
  path("M9.75 17.5V6.5H11A2.75 2.75 0 0 1 11 12H9.75"),
  path(d([arc([21.5, 12], 5.5, 5, -185)])),
])

def("eaton", () => {
  // The wordmark's block E: narrow slots and a right edge raked parallel to the A.
  const x = (y) => 19.75 - ((y - 3) * 4.75) / 18
  const e = shape([[4.5, 3], [x(3), 3], [x(7), 7], [10, 7], [10, 10], [x(10), 10], [x(14), 14], [10, 14],
    [10, 17], [x(17), 17], [x(21), 21], [4.5, 21]], 0.5)
  return [path(e, "t"), path(e)]
})

def("vertiv", () => {
  // A V knocked out of a disc: the cap above it and the two lobes below.
  // The V's edges all run at 45 degrees: its top is a chord, its point sits above the lobes' gap.
  const o = [12, 12], r = 9, chord = 8.25, notch = 11.5, vertex = 16.5
  const h = Math.sqrt(r * r - (12 - chord) ** 2), w = notch - chord
  const L = [12 - h, chord], R = [12 + h, chord]
  const b = vertex - 12, t = (-b + Math.sqrt(2 * r * r - b * b)) / 2
  const foot = [12 - t, vertex + t]
  const cap = [arc(o, r, angleOf(o, L), angleOf(o, R) + 360), line(R, [12 + w, chord]),
    line([12 + w, chord], [12, notch]), line([12, notch], [12 - w, chord]), line([12 - w, chord], L)]
  const lobe = [line(L, [12, vertex]), line([12, vertex], foot), arc(o, r, angleOf(o, foot), angleOf(o, L))]
  const all = d(cap, true) + d(lobe, true) + d(mirrorX(lobe), true)
  return [path(all, "t"), path(all)]
})

def("schneider-electric", () => {
  // The Life Is On emblem: a raked oval holding an italic S, with a level stripe at each side.
  const leaf = d(rotate(oval(12, 12, 9.5, 6.25, 3.5), -40), true)
  return [
    path(leaf, "t"), path(leaf),
    path(d(pl([[16.5, 8.5], [13.5, 8.5], [10.5, 15.5], [7.5, 15.5]], [0, 2, 2, 0]))),
    path("M5.5 11.5H9M15 12.5H18.5"),
  ]
})
