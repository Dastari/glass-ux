import { arc, cont, circle, d, dotEl, line, path, pl, polar, poly, rect, tinted, V,  } from "../lib.mjs"

const C = [12, 12]
export const icons = {}
const def = (name, fn) => (icons[name] = fn)

// ── line glyphs ───────────────────────────────────────────────────────────────
def("check", () => [path("M5 12.25L9.5 16.75L19 7.25")])
def("close", () => [path("M6.5 6.5L17.5 17.5"), path("M17.5 6.5L6.5 17.5")])
def("plus", () => [path("M12 5V19"), path("M5 12H19")])
def("minus", () => [path("M5 12H19")])
def("chevron-down", () => [path("M6.5 9.25L12 14.75L17.5 9.25")])
def("chevron-up", () => [path("M6.5 14.75L12 9.25L17.5 14.75")])
def("chevron-right", () => [path("M9.25 6.5L14.75 12L9.25 17.5")])
def("chevron-left", () => [path("M14.75 6.5L9.25 12L14.75 17.5")])
def("chevrons-up-down", () => [path("M8 8.5L12 4.5L16 8.5"), path("M8 15.5L12 19.5L16 15.5")])
def("arrow-right", () => [path("M4.5 12H19.5"), path("M14 6.5L19.5 12L14 17.5")])
def("arrow-left", () => [path("M19.5 12H4.5"), path("M10 6.5L4.5 12L10 17.5")])
def("arrow-up", () => [path("M12 19.5V4.5"), path("M6.5 10L12 4.5L17.5 10")])
def("arrow-down", () => [path("M12 4.5V19.5"), path("M6.5 14L12 19.5L17.5 14")])
def("arrow-up-right", () => [path("M6.5 17.5L17.5 6.5"), path("M9.5 6.5H17.5V14.5")])
def("more-horizontal", () => [dotEl(5.5, 12, 1.6), dotEl(12, 12, 1.6), dotEl(18.5, 12, 1.6)])
def("more-vertical", () => [dotEl(12, 5.5, 1.6), dotEl(12, 12, 1.6), dotEl(12, 18.5, 1.6)])
def("grip", () => [9, 15].flatMap((x) => [6.5, 12, 17.5].map((y) => dotEl(x, y, 1.4))))
def("menu", () => [path("M4 6.5H20"), path("M4 12H20"), path("M4 17.5H20")])
def("spinner", () => [path(d([arc(C, 8.5, 0, 270)]))])

// ── status ────────────────────────────────────────────────────────────────────
const ring = (tint = true) => (tint ? [circle(12, 12, 9, "t"), circle(12, 12, 9)] : [circle(12, 12, 9)])
def("success", () => [...ring(), path("M8.25 12L10.75 14.5L15.75 9.5")])
def("error", () => [...ring(), path("M9.25 9.25L14.75 14.75"), path("M14.75 9.25L9.25 14.75")])
def("info", () => [...ring(), path("M12 11.25V16.5"), dotEl(12, 8, 1.15)])
def("help", () => {
  // question mark: a 2.75 bowl, a 45° neck into a short stem
  const c = [12, 9.25]
  const r = 2.75
  const end = polar(c[0], c[1], r, 135)
  const neckEnd = [12, end[1] + (end[0] - 12)]
  return [
    ...ring(),
    path(`M9.25 9.25A2.75 2.75 0 1 1 ${end[0].toFixed(2)} ${end[1].toFixed(2)}L12 ${neckEnd[1].toFixed(2)}V13.75`),
    dotEl(12, 16.75, 1.15),
  ]
})
def("pending", () => {
  const dashes = Array.from({ length: 8 }, (_, i) => arc(C, 9, i * 45 + 11.25, i * 45 + 33.75))
  return [circle(12, 12, 9, "t"), ...dashes.map((a) => path(d([a]))), dotEl(12, 12, 1.4)]
})
def("offline", () => {
  const p0 = polar(12, 12, 9, 315)
  const p1 = polar(12, 12, 9, 135)
  return [...ring(), path(d([line(p0, p1)]))]
})
const triangle = () =>
  poly(
    [
      [12, 2.25],
      [1.5, 20.5],
      [22.5, 20.5],
    ],
    2.25
  )
def("warning", () => [...tinted(triangle()), path("M12 9.25V13.5"), dotEl(12, 16.75, 1.15)])
def("alert", () => icons.warning())

// ── foundations: seeds, refined ───────────────────────────────────────────────
def("search", () => [circle(10.75, 10.75, 6.75, "t"), circle(10.75, 10.75, 6.75), path("M15.75 15.75L20 20")])

def("endpoint", () => [rect(3, 4, 18, 12, 2.5, "t"), rect(3, 4, 18, 12, 2.5), path("M12 16V20"), path("M8.5 20H15.5")])
def("system", () => [
  path("M12 4H5.5A2.5 2.5 0 0 0 3 6.5V13.5A2.5 2.5 0 0 0 5.5 16H12Z", "t"),
  rect(3, 4, 18, 12, 2.5),
  path("M12 4V16"),
  path("M12 16V20"),
  path("M8.5 20H15.5"),
])

def("settings", () => {
  const N = 8
  const Ro = 9.25
  const Ri = 7
  const tipHalf = 9.5
  const baseHalf = 16.5
  const pts = []
  for (let i = 0; i < N; i++) {
    const a = i * (360 / N)
    pts.push(polar(12, 12, Ri, a - baseHalf), polar(12, 12, Ro, a - tipHalf), polar(12, 12, Ro, a + tipHalf), polar(12, 12, Ri, a + baseHalf))
  }
  const radii = pts.map((_, i) => (i % 4 === 1 || i % 4 === 2 ? 0.75 : 0.75))
  const gear = poly(pts, radii)
  return [...tinted(gear), circle(12, 12, 3)]
})

def("bell", () => {
  const body = `M4.5 16L6 14.5V9A6 6 0 0 1 18 9V14.5L19.5 16Z`
  return [path(body, "t"), path(body), path("M10 19A2 2 0 0 0 14 19")]
})

def("star", () => {
  const cy = 12.6
  const Ro = 9.2
  const Ri = Ro * 0.45
  const pts = []
  for (let i = 0; i < 5; i++) {
    pts.push(polar(12, cy, Ro, i * 72), polar(12, cy, Ri, i * 72 + 36))
  }
  const star = poly(pts, pts.map((_, i) => (i % 2 === 0 ? 1 : 0.5)))
  return tinted(star)
})

// Shield: peaked top, rounded shoulders, curved flanks meeting at the foot.
export function shieldPath(top = 3, shoulder = 5.5, side = 11, foot = 20.75, half = 7) {
  const R = 12 + half
  const L = 12 - half
  const right = pl([[12, top], [R, shoulder], [R, side]], [0, 2, 0])
  const left = pl([[L, side], [L, shoulder], [12, top]], [0, 2, 0])
  const k = (foot - side) / 9.75
  const c1 = `C${R} ${(side + 4.35 * k).toFixed(2)} ${(R - 2.9).toFixed(2)} ${(side + 7.85 * k).toFixed(2)} 12 ${foot}`
  const c2 = `C${(L + 2.9).toFixed(2)} ${(side + 7.85 * k).toFixed(2)} ${L} ${(side + 4.35 * k).toFixed(2)} ${L} ${side}`
  return `${d(right)}${c1}${c2}${cont(d(left))}Z`
}
def("shield", () => [path(shieldPath(), "t"), path(shieldPath())])

/** Four-point sparkle: concave sides are circular arcs through adjacent tips. */
export function sparkle(cx, cy, R, k = 1.25) {
  // centre of each side arc lies on the diagonal, beyond the corner of the bounding square
  const tips = [0, 90, 180, 270].map((a) => polar(cx, cy, R, a))
  const prims = []
  for (let i = 0; i < 4; i++) {
    const a = tips[i]
    const b = tips[(i + 1) % 4]
    const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
    const out = V.norm(V.sub(mid, [cx, cy]))
    const half = V.len(V.sub(b, a)) / 2
    const rho = R * k
    const h = Math.sqrt(rho * rho - half * half)
    const c = V.add(mid, V.mul(out, h))
    const a0 = (Math.atan2(a[0] - c[0], -(a[1] - c[1])) * 180) / Math.PI
    let a1 = (Math.atan2(b[0] - c[0], -(b[1] - c[1])) * 180) / Math.PI
    let s0 = a0
    // concave side: travel the short way, counter-clockwise around the outer centre
    while (a1 > s0) a1 -= 360
    while (s0 - a1 > 180) a1 += 360
    prims.push(arc(c, rho, s0, a1))
  }
  return prims
}
def("sparkle", () => {
  const s = sparkle(10.75, 10.75, 7)
  return [...tinted(s), path("M18 15.75V20.25"), path("M15.75 18H20.25")]
})
def("ai", () => {
  const s = sparkle(12, 11.5, 4.75)
  return [path(shieldPath(), "t"), path(shieldPath()), path(d(s, true))]
})

def("organisation", () => [
  path("M5 20.5V6A2 2 0 0 1 7 4H13A2 2 0 0 1 15 6V20.5Z", "t"),
  path("M5 20.5V6A2 2 0 0 1 7 4H13A2 2 0 0 1 15 6V20.5"),
  path("M15 9.5H17A2 2 0 0 1 19 11.5V20.5"),
  path("M3 20.5H21"),
  path("M8.5 8H11.5"),
  path("M8.5 11.5H11.5"),
  path("M8.5 15H11.5"),
])

def("software", () => {
  const hex = [
    [12, 3],
    [20, 7.5],
    [20, 16.5],
    [12, 21],
    [4, 16.5],
    [4, 7.5],
  ]
  const r = 1.5
  const outline = poly(hex, r)
  // Y edges start at the middle of the rounded corners
  const mid = (i) => {
    const p = hex[i]
    const pull = r / Math.sin((120 * Math.PI) / 360) - r
    const dir = V.norm(V.sub(C, p))
    return V.add(p, V.mul(dir, pull))
  }
  const _face = `M12 12L${mid(1).map((n) => n.toFixed(2)).join(" ")}V16.5L12 21Z`
  return [
    path(`M12 12L20 7.5V16.5L12 21Z`, "t"),
    path(d(outline, true)),
    path(d([line(mid(5), [12, 12]), line([12, 12], mid(1))])),
    path(d([line([12, 12], mid(3))])),
  ]
})

def("automation", () => {
  // a trigger node flowing into a step node
  return [
    rect(3.5, 3.5, 7, 7, 1.5, "t"),
    rect(3.5, 3.5, 7, 7, 1.5),
    rect(13.5, 13.5, 7, 7, 1.5),
    path("M7 10.5V15A2 2 0 0 0 9 17H13.5"),
  ]
})
def("reporting", () => [
  rect(10.5, 4, 3, 13, 1, "t"),
  rect(4.5, 10.5, 3, 6.5, 1),
  rect(10.5, 4, 3, 13, 1),
  rect(16.5, 7.5, 3, 9.5, 1),
  path("M3.5 20H20.5"),
])

def("sun", () => [
  circle(12, 12, 4, "t"),
  circle(12, 12, 4),
  ...[0, 45, 90, 135, 180, 225, 270, 315].map((a) => path(d([line(polar(12, 12, 7.25, a), polar(12, 12, 9.25, a))]))),
])
def("moon", () => {
  const dd = "M19.5 14.6A7.75 7.75 0 1 1 9.4 4.5A6.25 6.25 0 0 0 19.5 14.6Z"
  return [path(dd, "t"), path(dd)]
})
def("zoom-in", () => [circle(10.75, 10.75, 6.75, "t"), circle(10.75, 10.75, 6.75), path("M15.75 15.75L20 20"), path("M10.75 8V13.5"), path("M8 10.75H13.5")])
def("zoom-out", () => [circle(10.75, 10.75, 6.75, "t"), circle(10.75, 10.75, 6.75), path("M15.75 15.75L20 20"), path("M8 10.75H13.5")])
