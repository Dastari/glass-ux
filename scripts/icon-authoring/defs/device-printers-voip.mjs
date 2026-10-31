import { V, angleOf, arc, bbox, circle, cut, d, disk, dotEl, intersect, line, move, path, pl, poly, polar, rect, rot } from "../lib.mjs"

// Original monochrome identifiers for communications, printing and AV manufacturers.
// A brand with a symbol keeps its symbol; a wordmark-only brand keeps its wordmark's own
// initial, traced from the logo (weight, case, contrast, serifs, slant and terminals).
// Heavy or high-contrast letters are tinted outlines; light ones are a single stroke.
// References: the current logo in each manufacturer's Wikipedia infobox (2026 logo audit),
// the Lexmark, Jabra and new Xerox marks supplied with the audit, the reolink wordmark at
// https://commons.wikimedia.org/wiki/File:Reolink_LOGO-01.jpg and these brand pages. Fanvil,
// snom, Sharp and Bosch are drawn from their published wordmarks without a reference image.
// https://www.hp.com/us-en/poly.html
// https://www.grandstream.com/hubfs/Grandstream%20Certified%20Partner%20Branding%20Guide.pdf
// https://global.kyocera.com/company/brand/index.html
// https://brand.lexmark.com/en/overview/visual-elements/logo.html
// https://www.crestron.com/legal/trademarks
export const icons = {}
const def = (name, fn) => (icons[name] = fn)
const outline = (points, radius = 0.75) => d(poly(points, radius), true)
const stroke = (points, radius = 0) => path(d(pl(points, radius)))
const rotated = (segments, angle, c = [12, 12]) => segments.map((segment) => segment.k === "l"
  ? line(rot(segment.p, c, angle), rot(segment.q, c, angle))
  : arc(rot(segment.c, c, angle), segment.r, segment.a0 + angle, segment.a1 + angle))
const mirrored = (segments) => segments.map((s) => s.k === "l"
  ? line([24 - s.p[0], s.p[1]], [24 - s.q[0], s.q[1]])
  : arc([24 - s.c[0], s.c[1]], s.r, 360 - s.a0, 360 - s.a1))
/** Shear about y = 12 (positive leans the top right), for italic letters. */
const lean = (points, k) => points.map(([x, y]) => [x + (12 - y) * k, y])
/** Circular arc from p through m to q. */
const arc3 = (p, m, q) => {
  const [ax, ay] = p, [bx, by] = m, [cx, cy] = q
  const dd = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by))
  const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / dd
  const uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / dd
  const c = [ux, uy]
  const r = Math.hypot(ax - ux, ay - uy)
  const a0 = angleOf(c, p), am = angleOf(c, m), a1 = angleOf(c, q)
  const cw = (x) => ((x - a0) % 360 + 360) % 360
  return cw(am) < cw(a1) ? arc(c, r, a0, a0 + cw(a1)) : arc(c, r, a0, a0 - (360 - cw(a1)))
}
const flip = (s) => (s.k === "l" ? line(s.q, s.p) : arc(s.c, s.r, s.a1, s.a0))
const ends = (s) => (s.k === "l" ? [s.p, s.q] : [polar(s.c[0], s.c[1], s.r, s.a0), polar(s.c[0], s.c[1], s.r, s.a1)])
/** Order primitives into one connected chain, reversing pieces as needed. */
const chain = (prims) => {
  const rest = prims.slice(1)
  const out = [prims[0]]
  while (rest.length) {
    const end = ends(out[out.length - 1])[1]
    let best = 0, bestD = Infinity, rev = false
    rest.forEach((s, i) => {
      const [a, b] = ends(s)
      const da = Math.hypot(a[0] - end[0], a[1] - end[1]), db = Math.hypot(b[0] - end[0], b[1] - end[1])
      if (da < bestD) { bestD = da; best = i; rev = false }
      if (db < bestD) { bestD = db; best = i; rev = true }
    })
    const [s] = rest.splice(best, 1)
    const next = rev ? flip(s) : s
    if (bestD > 0.02) out.push(line(end, ends(next)[0]))
    out.push(next)
  }
  return out
}
/** Join primitives in the given order, bridging any gap with a line. */
const join = (prims) => prims.flatMap((s, i) => {
  if (!i) return [s]
  const a = ends(prims[i - 1])[1], b = ends(s)[0]
  return Math.hypot(a[0] - b[0], a[1] - b[1]) > 0.02 ? [line(a, b), s] : [s]
})
/** Elliptical arc (angles as in lib: 0 = top, clockwise) traced by circular arcs. */
const earc = (cx, cy, rx, ry, a0, a1, n = Math.max(2, Math.ceil(Math.abs(a1 - a0) / 30))) => {
  const at = (a) => [cx + rx * Math.sin(a * Math.PI / 180), cy - ry * Math.cos(a * Math.PI / 180)]
  return Array.from({ length: n }, (_, i) => {
    const t0 = a0 + ((a1 - a0) * i) / n, t1 = a0 + ((a1 - a0) * (i + 1)) / n
    return arc3(at(t0), at((t0 + t1) / 2), at(t1))
  })
}
/** A line or arc moved sideways by o (positive to the left of its direction). */
const offset = (s, o) => {
  if (s.k === "l") {
    const u = V.norm(V.sub(s.q, s.p))
    const n = [u[1], -u[0]]
    return line(V.add(s.p, V.mul(n, o)), V.add(s.q, V.mul(n, o)))
  }
  return arc(s.c, s.r + (s.a1 > s.a0 ? o : -o), s.a0, s.a1)
}
/** Closed outline of a constant-width stroke along a smooth chain, with flat or round ends. */
const ribbon = (prims, w, round = false) => {
  const left = prims.map((s) => offset(s, w / 2))
  const right = prims.map((s) => offset(s, -w / 2)).reverse().map(flip)
  if (!round) return join([...left, ...right])
  // Round ends: a half circle through the point half a width beyond each end.
  const tangent = (t, atEnd) => {
    if (t.k === "l") return V.norm(V.sub(t.q, t.p))
    const a = (atEnd ? t.a1 : t.a0) * Math.PI / 180, sign = t.a1 > t.a0 ? 1 : -1
    return [Math.cos(a) * sign, Math.sin(a) * sign]
  }
  const cap = (a, b, centre, dir) => arc3(a, V.add(centre, V.mul(dir, w / 2)), b)
  const first = prims[0], last = prims[prims.length - 1]
  const endL = ends(left[left.length - 1])[1], endR = ends(right[0])[0]
  const startR = ends(right[right.length - 1])[1], startL = ends(left[0])[0]
  return [...left, cap(endL, endR, ends(last)[1], tangent(last, true)), ...right,
    cap(startR, startL, ends(first)[0], V.mul(tangent(first, false), -1))]
}
/** Scale primitives about the centre of the grid. */
const scaled = (prims, k) => prims.map((s) => s.k === "l"
  ? line(s.p.map((v) => 12 + (v - 12) * k), s.q.map((v) => 12 + (v - 12) * k))
  : arc(s.c.map((v) => 12 + (v - 12) * k), s.r * k, s.a0, s.a1))
const tint = (dd) => [path(dd, "t"), path(dd)]
const closed = (prims) => d(prims, true)
const centre = (prims, ox = 0, oy = 0) => {
  const b = bbox(prims)
  return move(prims, Math.round((12 - b.cx + ox) * 4) / 4, Math.round((12 - b.cy + oy) * 4) / 4)
}

// VoIP and conferencing.
def("yealink", () => tint(outline([
  // Yealink's bold geometric Y with flat-cut arms.
  [3.5, 3.5], [7.25, 3.5], [12, 10.25], [16.75, 3.5], [20.5, 3.5], [13.75, 13], [13.75, 20.5],
  [10.25, 20.5], [10.25, 13],
], 0)))

def("poly", () => {
  // The looped p: three arms leave the ring on tangents 120° apart (the stem, the top
  // spur and the arrow), and the arrow's tip carries one barb.
  const c = [9, 11], r = 5
  const arm = (theta, length) => {
    const p = polar(c[0], c[1], r, theta)
    return line(p, polar(p[0], p[1], length, theta - 90))
  }
  const arrow = arm(150, 10.7)
  const tip = arrow.q
  const prims = centre([
    arc(c, r, 0, 360), arm(270, 10.5), arm(30, 7.8), arrow, line(tip, polar(tip[0], tip[1], 3.25, 300)),
  ])
  return [path(d(prims))]
})

def("grandstream", () => {
  // The fin: a crescent over a swept body that narrows to a point on the right, with the
  // smaller inner fin (the G's bar) tucked into the opening.
  const fin = [
    arc3([4, 5], [10.5, 3.25], [18.5, 6.5]),
    arc3([18.5, 6.5], [11.5, 6.25], [6.75, 9.25]),
    arc3([6.75, 9.25], [12.5, 14], [20, 15]),
    arc3([20, 15], [14.5, 18.25], [9.75, 21]),
    arc3([9.75, 21], [5.25, 13.5], [4, 5]),
  ]
  return [...tint(closed(fin)), path(d([arc3([14.5, 9.75], [18.25, 11.5], [20, 15])]))]
})

def("snom", () => [
  // snom's lowercase s: round, open and as wide as it is tall, in one light stroke.
  path(d([...earc(12, 8.75, 6, 3.25, 70, -180), ...earc(12, 15.25, 6, 3.25, 0, 250)])),
])

def("avaya", () => [
  // AVAYA's A: a pointed apex and a crossbar that leaves the left leg and stops short of
  // the right one.
  path("M3.75 20.5L12 3.5L20.25 20.5M6.6 15H13.5"),
])

def("fanvil", () => [
  // Fanvil's italic F (drawn without a reference image).
  path("M5.75 20.5L9.5 3.5H18.75M7.5 12.5H15.75"),
])

def("mitel", () => {
  // Two rounded triangles meet point to point, their tips looped through each other.
  const left = poly([[3, 5], [3, 19], [19.5, 12]], [1.75, 1.75, 2.6])
  const right = mirrored(left)
  const crossings = []
  for (const s of left) for (const t of right) {
    if (s.k === "a" && t.k === "a") crossings.push(...intersect(s.c, s.r, t.c, t.r))
  }
  const [top, bottom] = crossings.filter((p) => Math.abs(p[0] - 12) < 3).sort((a, b) => a[1] - b[1])
  return [
    path(d(cut(left, disk(bottom, 1.75)), true)),
    path(d(cut(right, disk(top, 1.75)), true)),
  ]
})

def("gigaset", () => [
  // Gigaset's open humanist G: the bar juts left of the short vertical spur.
  path(d(join([...earc(12.75, 12, 7.5, 8.5, 42, -230), line([18.5, 12.5], [13.75, 12.5])]))),
])

def("alcatel-lucent", () => {
  // The script a: a long rising stroke, a descending stem with an out-turned foot, and the
  // open swash that springs from the stem and curls round its right.
  const letter = [
    line([7.25, 15.5], [13.5, 5.5]),
    line([13.5, 5.5], [12.5, 15]),
    arc3([12.5, 15], [13.25, 16.75], [15.25, 16.75]),
  ]
  return [circle(12, 12, 9.25, "t"), circle(12, 12, 9.25), path(d(letter)), path(d([arc3([13.25, 8], [16.75, 10.25], [15.25, 13.5])]))]
})

def("audiocodes", () => {
  // The ac monogram: a round a with its stem, and a c that tucks behind the stem.
  const stem = line([12.5, 7.75], [12.5, 16.25])
  const c = cut([arc([16.75, 12], 4.25, 50, -230)], (p) => Math.abs(p[0] - 12.5) < 1.75 && p[0] < 14.5)
  return [circle(8.25, 12, 4.25, "t"), circle(8.25, 12, 4.25), path(d([stem])), path(d(c))]
})

// Printers and document capture.
def("brother", () => {
  // brother's heavy geometric b: a round bowl whose left side is the stem.
  const c = [12, 14], R = 6.5, r = 3.25
  const join_ = [8.75, c[1] - Math.sqrt(R * R - (8.75 - 12) ** 2)]
  const body = [line([5.5, 3.5], [8.75, 3.5]), line([8.75, 3.5], join_), arc(c, R, angleOf(c, join_), 630), line([5.5, 14], [5.5, 3.5])]
  const counter = arc(c, r, 360, 0)
  return [path(closed(body) + d([counter], true), "t"), path(closed(body) + d([counter], true))]
})

def("canon", () => {
  // Canon's wide, high-contrast C: a heavy left side thinning to hairlines, a sharp spur
  // hanging from the top terminal into the counter and a thin pointed tail at the bottom.
  const outer = earc(12, 12, 8.5, 7.5, 65, -242)
  const inner = earc(13.75, 12.5, 5.75, 5, 118, 400)
  const c = join([...outer, ...inner, line(ends(inner[inner.length - 1])[1], [15.25, 11.25]), line([15.25, 11.25], ends(outer[0])[0])])
  return tint(closed(move(c, 0.25, 0)))
})

def("epson", () => tint(outline([
  // EPSON's heavy, square E: a broad stem, three equal arms and even counters.
  [5.5, 3.5], [18.5, 3.5], [18.5, 6.5], [9.5, 6.5], [9.5, 10.5], [18, 10.5], [18, 13.5],
  [9.5, 13.5], [9.5, 17.5], [18.5, 17.5], [18.5, 20.5], [5.5, 20.5],
], 0)))

def("kyocera", () => {
  // The KC square: two corner triangles and a right-pointing triangle make the K around a
  // left-pointing notch; the C is the frame, open in a notch on the right.
  const frame = [[3.5, 3.5], [20.5, 3.5], [20.5, 8.5], [17, 12], [20.5, 15.5], [20.5, 20.5], [3.5, 20.5]]
  const red = [[[10, 3.5], [17, 12], [10, 20.5]], [[3.5, 3.5], [10, 3.5], [3.5, 10]], [[3.5, 20.5], [3.5, 14], [10, 20.5]]]
  return [
    path(red.map((p) => outline(p, 0)).join(""), "t"),
    stroke([[3.5, 10], [3.5, 3.5], ...frame.slice(1), [3.5, 14]]),
    stroke([[3.5, 10], [10, 3.5], [10, 20.5], [3.5, 14]]),
    stroke([[10, 3.5], [17, 12], [10, 20.5]]),
  ]
})

def("ricoh", () => {
  // RICOH's heavy, wide R: a flat-topped bowl and a straight diagonal leg.
  const body = join([
    line([4.5, 3.5], [13, 3.5]), arc([13, 8.5], 5, 0, 150),
    line(polar(13, 8.5, 5, 150), [20, 20.5]), line([20, 20.5], [16.25, 20.5]),
    line([16.25, 20.5], [11.9, 13.5]), line([11.9, 13.5], [7.75, 13.5]),
    line([7.75, 13.5], [7.75, 20.5]), line([7.75, 20.5], [4.5, 20.5]), line([4.5, 20.5], [4.5, 3.5]),
  ])
  const counter = [line([7.75, 10.5], [13, 10.5]), arc([13, 8.5], 2, 180, 0), line([13, 6.5], [7.75, 6.5])]
  const dd = closed(move(body, -0.25, 0)) + closed(move(counter, -0.25, 0))
  return [path(dd, "t"), path(dd)]
})

def("lexmark", () => {
  // The pinwheel: each edge of the centre diamond runs on past one corner to the square's
  // edge, all four turning the same way. Opposite blades share the tint.
  const [l, t, rr, b] = [[8.5, 12], [12, 8.5], [15.5, 12], [12, 15.5]]
  const blades = [
    [[3.5, 3.5], [17, 3.5], t, l, [3.5, 7]],
    [[20.5, 20.5], [7, 20.5], b, rr, [20.5, 17]],
  ]
  return [
    path(blades.map((p) => outline(p, 0)).join(""), "t"),
    rect(3.5, 3.5, 17, 17, 0),
    path(outline([l, t, rr, b], 0)),
    path("M3.5 7L8.5 12M17 3.5L12 8.5M20.5 17L15.5 12M7 20.5L12 15.5"),
  ]
})

def("xerox", () => {
  // The rounded square split by a concave X: the top-left and bottom-right arms end inside,
  // the other two run on through the corners as one diagonal slit (x + y = 24).
  const frame = poly([[3.5, 3.5], [20.5, 3.5], [20.5, 20.5], [3.5, 20.5]], 4.5)
  const star = poly([[5.75, 5.75], [12, 10], [18.25, 5.75], [14, 12], [18.25, 18.25], [12, 14], [5.75, 18.25], [10, 12]], [0, 4, 0, 4, 0, 4, 0, 4])
  const half = 1.5
  const side = (sign) => {
    const k = 24 - sign * half * Math.SQRT2
    const keep = (p) => sign * (p[0] + p[1] - k) > 0
    return chain([...cut(frame, keep), ...cut(star, keep)])
  }
  const pieces = closed(side(1)) + closed(side(-1))
  return [path(pieces, "t"), path(pieces)]
})

def("zebra", () => {
  // The zebra head in 45° stripes: the ear and muzzle are the solid parts, the mane steps
  // down to the muzzle and the neck stripes run off to the lower left.
  const ear = [arc([10.75, 5], 2, 0, 180), line([10.75, 7], [10.75, 3])]
  const muzzle = [arc([17.75, 15.25], 2.25, 90, 270), line([15.5, 15.25], [20, 15.25])]
  return [
    path(closed(ear) + closed(muzzle), "t"),
    path(closed(ear) + closed(muzzle)),
    stroke([[5.5, 3.5], [8.75, 6.75], [8.75, 15.5], [11, 17.75]]),
    stroke([[3.5, 6.75], [5.75, 9], [5.75, 13.75]]),
    stroke([[3.5, 13.25], [10.75, 20.5]]),
    stroke([[11.75, 9], [12.5, 9.75], [12.5, 15.5]]),
    stroke([[13.75, 9.25], [15.5, 11], [15.5, 15.25]]),
  ]
})

def("sharp", () => {
  // SHARP's extended, heavy S: straight bars and round turns, cut square at both ends.
  const spine = [
    line([19.5, 6], [7.25, 6]), arc([7.25, 9], 3, 0, -180),
    line([7.25, 12], [16.75, 12]), arc([16.75, 15], 3, 0, 180), line([16.75, 18], [4.5, 18]),
  ]
  return tint(closed(ribbon(spine, 3)))
})

def("oki", () => [
  // OKI, the one wordmark short enough to keep whole: the wide, solid O, the K and the
  // slab-serif I.
  ...tint(closed(earc(5.25, 12, 3.25, 5, 0, 360, 8))),
  path("M11.5 7V17M16.25 7L12 12.5M13.25 11.25L16.5 17"),
  path("M20.25 7V17M18.75 7H21.75M18.75 17H21.75"),
])

// Peripherals, cameras, building systems and AV.
def("logitech", () => [
  // The heavy, flat-ended l that opens the logitech wordmark.
  ...tint(outline([[10.25, 3.5], [13.75, 3.5], [13.75, 20.5], [10.25, 20.5]], 0)),
])

def("jabra", () => {
  // The sweeping hand: the outer edge runs from the thumb round the palm into the little
  // finger, three more fingers fan out above it, and the ball floats over the thumb.
  const hand = [
    arc3([3.5, 13.5], [6.5, 19.25], [12.5, 20.5]),
    arc3([12.5, 20.5], [18, 17], [21, 10.25]),
  ]
  const fingers = [
    arc3([10, 16], [11.25, 9], [14.25, 3.5]),
    arc3([12.5, 16.75], [14.25, 10], [17.5, 4.5]),
    arc3([14.75, 17.25], [16.75, 11.5], [20, 7]),
  ]
  return [path(d(move(hand, -0.25, 0))), ...fingers.map((f) => path(d(move([f], -0.25, 0)))), dotEl(6.5, 10.5, 1.6)]
})

def("axis", () => {
  const triangle = outline([[12, 3.5], [21, 20.5], [3, 20.5]], 0.5)
  const facet = outline([[7, 13], [12.5, 13], [16.5, 20.5], [3, 20.5]], 0.25)
  return [path(facet, "t"), path(triangle), path("M7 13H12.5L16.5 20.5")]
})

def("hikvision", () => tint(outline(lean([
  // HIKVISION's heavy italic H.
  [6.5, 3.5], [9.75, 3.5], [9.75, 10.5], [14.25, 10.5], [14.25, 3.5], [17.5, 3.5], [17.5, 20.5],
  [14.25, 20.5], [14.25, 13.5], [9.75, 13.5], [9.75, 20.5], [6.5, 20.5],
], 0.3), 0)))

def("dahua", () => {
  // dahua's heavy italic a inside the swoosh that wraps it like an @.
  const swoosh = arc([12.75, 12], 9, 40, -215)
  return [
    circle(11.5, 13, 3.25, "t"), circle(11.5, 13, 3.25),
    path(d([line([16.25, 8.75], [15, 16.75])])),
    path(d([swoosh])),
  ]
})

def("reolink", () => [
  // reolink's lowercase r: a round-ended stem whose shoulder turns in one quarter circle.
  ...tint(closed(ribbon(centre([line([7, 19], [7, 12.5]), arc([13, 12.5], 6, 270, 360), line([13, 6.5], [17.5, 6.5])]), 3.25, true))),
])

def("honeywell", () => [
  path("M5.5 3.5V20.5M18.5 3.5V20.5M5.5 12H18.5M3 3.5H8M16 3.5H21M3 20.5H8M16 20.5H21"),
])

def("bosch", () => [
  // The double-T armature in its ring: two curved pole shoes joined by one web.
  circle(12, 12, 9),
  path(d([arc([12, 12], 6, 220, 320), arc([12, 12], 6, 40, 140), line([6, 12], [18, 12])])),
])

def("sony", () => {
  // Sony's wide slab-serif S: hairline arms, a heavy spine and bowls, and vertical serifs
  // on both terminals. The lower half is the upper half turned through 180°.
  const half = join([
    line([9.71, 13.13], [7.41, 11.96]),
    ...earc(12, 8.6, 8, 4.1, 215, 412),
    line([18.3, 6.08], [18.3, 4.5]), line([18.3, 4.5], [20, 4.5]), line([20, 4.5], [20, 9.25]), line([20, 9.25], [18.6, 9.25]),
    ...earc(12.75, 8.9, 4.5, 2.1, 70, -200),
  ])
  return tint(closed(scaled(join([...half, ...rotated(half, 180)]), 1.12)))
})

def("philips", () => {
  // The shield's globe: three waves between two pairs of four-pointed stars, the large
  // star of each pair nearer the shield's side.
  const shield = "M3.5 2.5H20.5V12.5A8.5 8.5 0 0 1 3.5 12.5Z"
  const star = (x, y, a) => {
    const pts = [[x, y - a], [x + a, y], [x, y + a], [x - a, y]]
    return closed(pts.map((p, i) => {
      const q = pts[(i + 1) % 4]
      const m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]
      const k = 0.55 * a / Math.SQRT2
      return arc3(p, [m[0] + Math.sign(x - m[0]) * k, m[1] + Math.sign(y - m[1]) * k], q)
    }))
  }
  // Each wave meets the shield's sides: a trough on the left, a crest on the right.
  const edge = (y) => (y <= 12.5 ? 8.5 : Math.sqrt(8.5 ** 2 - (y - 12.5) ** 2))
  const wave = (y) => d([arc3([12 - edge(y), y], [7.75, y + 1.25], [12, y]), arc3([12, y], [16.25, y - 1.25], [12 + edge(y), y])])
  return [path(shield, "t"), path(shield),
    path(wave(10) + wave(12.75) + wave(15.5)),
    path(star(7.5, 6.75, 2.25) + star(11.75, 4.75, 1.25) + star(15.75, 17.75, 1.75) + star(12, 19, 1.1)),
  ]
})

def("crestron", () => {
  // A cyclone stretched sideways: two arms spiral out of the eye, traced in circular arcs
  // through points of a flattened spiral.
  const at = (t, start) => {
    const a = (start + t * 360) * Math.PI / 180
    return [12 + Math.sin(a) * (0.6 + 8.9 * t), 12 - Math.cos(a) * (0.4 + 5.6 * t)]
  }
  const arm = (start) => {
    const prims = []
    const n = 8
    for (let i = 0; i < n; i++) {
      const t0 = 0.08 + (i / n) * 0.92, t1 = 0.08 + ((i + 1) / n) * 0.92
      prims.push(arc3(at(t0, start), at((t0 + t1) / 2, start), at(t1, start)))
    }
    return prims
  }
  return [path(d(arm(90)) + d(arm(270)))]
})

def("sonos", () => {
  // The geometric SONOS S: two wide, round bowls meeting in a smooth spine, even weight
  // and cut terminals.
  const spine = [...earc(12, 8.5, 4.6, 3.5, 55, -180), ...earc(12, 15.5, 4.6, 3.5, 0, 235)]
  return tint(closed(ribbon(spine, 3)))
})

def("yamaha", () => {
  // Three tuning forks in a ring, prongs outward. Their stems cross at the centre, so each
  // fork's handle points at the rim between the other two forks' prongs.
  const fork = [
    line([12, 4.75], [12, 14.5]),
    arc([12, 16.5], 2, 0, -90), line([10, 16.5], [10, 19]),
    arc([12, 16.5], 2, 0, 90), line([14, 16.5], [14, 19]),
  ]
  return [circle(12, 12, 9.5), path([0, 120, 240].map((angle) => d(rotated(fork, angle))).join(""))]
})
