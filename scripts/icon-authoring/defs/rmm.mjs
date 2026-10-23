import { arc, band, circle, cut, d, dotEl, ellipse, intersect, line, nearPrims, path, polar, poly, rect, rrect, tinted, V,  } from "../lib.mjs"
import { slashed, slashPath } from "./actions.mjs"
import { shieldPath } from "./core.mjs"

export const icons = {}
const def = (name, fn) => (icons[name] = fn)
const fx = (n) => +n.toFixed(2)
const C = [12, 12]

// ── devices ───────────────────────────────────────────────────────────────────
const SCREEN = [3, 4, 18, 12]
const stand = () => [path("M12 16V20"), path("M8.5 20H15.5")]
/** Pointer: symmetric about the 45° diagonal, tip top-left. */
export const pointer = (tx, ty, s = 1) =>
  poly(
    [
      [tx, ty],
      [tx + 15 * s, ty + 5.5 * s],
      [tx + 8 * s, ty + 8 * s],
      [tx + 5.5 * s, ty + 15 * s],
    ],
    [1.5 * Math.min(1, s * 1.4), 1.25 * Math.min(1, s * 1.4), 0.75 * Math.min(1, s * 1.4), 1.25 * Math.min(1, s * 1.4)]
  )
def("cursor", () => tinted(pointer(3.75, 3.75, 1.1)))
def("remote-control", () => {
  const p = pointer(12.5, 10, 0.62)
  const screen = cut(rrect(...SCREEN, 2.5), nearPrims(p, 3))
  const st = cut([line([12, 16], [12, 20]), line([8.5, 20], [15.5, 20])], nearPrims(p, 3))
  return [rect(...SCREEN, 2.5, "t"), path(d(screen)), path(d(st)), path(d(p, true))]
})
def("view-only", () => {
  const half = 5
  const sag = 3
  const R = (half * half + sag * sag) / (2 * sag)
  const a = (Math.asin(half / R) * 180) / Math.PI
  const cy = 10
  const eye = [arc([12, cy - sag + R], R, -a, a), arc([12, cy + sag - R], R, 180 - a, 180 + a)]
  return [rect(...SCREEN, 2.5, "t"), rect(...SCREEN, 2.5), ...stand(), path(d(eye, true)), dotEl(12, cy, 1.25)]
})
def("displays", () => [
  rect(8, 8, 13, 9, 2, "t"),
  rect(8, 8, 13, 9, 2),
  path("M8 13H5A2 2 0 0 1 3 11V6A2 2 0 0 1 5 4H14A2 2 0 0 1 16 6V8"),
  path("M14.5 17V20"),
  path("M11.5 20H17.5"),
])
def("laptop", () => [rect(4.5, 5, 15, 10.5, 2, "t"), rect(4.5, 5, 15, 10.5, 2), path("M2.5 19H21.5")])
// A desktop computer: a monitor with the endpoint's stand beside a tower case with its power
// light. The pair is the silhouette; the monitor alone stays `endpoint`.
def("desktop", () => [
  rect(2.75, 6.5, 9.5, 9, 2, "t"),
  rect(2.75, 6.5, 9.5, 9, 2),
  path("M7.5 15.5V19.5"),
  path("M5 19.5H10"),
  rect(15.25, 4.5, 6, 15, 1.5),
  dotEl(18.25, 16.5, 1),
])
def("server", () => [
  path("M5.5 3.5H18.5A2 2 0 0 1 20.5 5.5V9A2 2 0 0 1 18.5 11H5.5A2 2 0 0 1 3.5 9V5.5A2 2 0 0 1 5.5 3.5ZM5.5 13H18.5A2 2 0 0 1 20.5 15V18.5A2 2 0 0 1 18.5 20.5H5.5A2 2 0 0 1 3.5 18.5V15A2 2 0 0 1 5.5 13Z", "t"),
  rect(3.5, 3.5, 17, 7.5, 2),
  rect(3.5, 13, 17, 7.5, 2),
  dotEl(7.25, 7.25, 1.15),
  dotEl(7.25, 16.75, 1.15),
  path("M11 7.25H16.5"),
  path("M11 16.75H16.5"),
])
def("cpu", () => [
  rect(6, 6, 12, 12, 2.5, "t"),
  rect(6, 6, 12, 12, 2.5),
  rect(9.5, 9.5, 5, 5, 1.5),
  ...[10, 14].flatMap((v) => [path(`M${v} 3.25V6`), path(`M${v} 18V20.75`), path(`M3.25 ${v}H6`), path(`M18 ${v}H20.75`)]),
])
def("memory", () => [
  rect(3, 6, 18, 9, 2, "t"),
  rect(3, 6, 18, 9, 2),
  path("M7.5 9.5V11.5"),
  path("M12 9.5V11.5"),
  path("M16.5 9.5V11.5"),
  ...[6.5, 9.5, 14.5, 17.5].map((x) => path(`M${x} 15V18`)),
])
def("disk", () => [
  rect(2.5, 6, 19, 12, 2.5, "t"),
  rect(2.5, 6, 19, 12, 2.5),
  path("M2.5 13.5H21.5"),
  dotEl(17.5, 15.75, 1.1),
  path("M6 15.75H10"),
])
def("keyboard", () => [
  rect(2.5, 5.5, 19, 13, 2.5, "t"),
  rect(2.5, 5.5, 19, 13, 2.5),
  ...[6.75, 10.25, 13.75, 17.25].flatMap((x) => [dotEl(x, 9.25, 1), dotEl(x, 12.25, 1)]),
  path("M8.5 15.25H15.5"),
])
def("printer", () => [
  rect(7, 13.5, 10, 7, 2, "t"),
  path("M7 17H5A2 2 0 0 1 3 15V10.5A2 2 0 0 1 5 8.5H19A2 2 0 0 1 21 10.5V15A2 2 0 0 1 19 17H17"),
  path("M7 8.5V5A1.5 1.5 0 0 1 8.5 3.5H15.5A1.5 1.5 0 0 1 17 5V8.5"),
  rect(7, 13.5, 10, 7, 2),
])
def("battery", () => [
  path("M4.5 7H12V17H4.5A2 2 0 0 1 2.5 15V9A2 2 0 0 1 4.5 7Z", "t"),
  rect(2.5, 7, 16.5, 10, 2),
  path("M21.25 10.5V13.5"),
])
def("temperature", () => {
  const wall = 2.5
  const r = 4.25
  const cy = 17
  const dy = Math.sqrt(r * r - wall * wall)
  const y = fx(cy - dy)
  const tube = `M9.5 ${y}V5.5A2.5 2.5 0 0 1 14.5 5.5V${y}A4.25 4.25 0 1 1 9.5 ${y}Z`
  return [circle(12, cy, r, "t"), path(tube), path("M12 14.5V9")]
})
def("usb", () => [
  path("M12 18V4"),
  path("M9.75 6.25L12 4L14.25 6.25"),
  path("M12 15L7.5 10.5V9"),
  dotEl(7.5, 7.75, 1.4),
  path("M12 12.5L16.5 8V7"),
  rect(15.25, 4.25, 2.5, 2.5, 0.5),
  circle(12, 19.5, 1.5, "d"),
])

// ── network ───────────────────────────────────────────────────────────────────
def("signal", () => [
  path("M4.5 19V15.5"),
  path("M9.5 19V12"),
  path("M14.5 19V8.5"),
  path("M19.5 19V5"),
])
def("wifi", () => {
  const c = [12, 17.5]
  return [
    path(d([arc(c, 4, -45, 45)])),
    path(d([arc(c, 8, -45, 45)])),
    path(d([arc(c, 12, -45, 45)])),
    dotEl(12, 17.5, 1.3),
  ]
})
def("network", () => [
  rect(9, 3.5, 6, 6, 1.5, "t"),
  rect(9, 3.5, 6, 6, 1.5),
  rect(3.5, 14.5, 6, 6, 1.5),
  rect(14.5, 14.5, 6, 6, 1.5),
  path("M12 9.5V12"),
  path("M6.5 14.5V12H17.5V14.5"),
])
def("ethernet", () => {
  const port = poly(
    [
      [4, 5.25],
      [20, 5.25],
      [20, 15.75],
      [16.5, 15.75],
      [16.5, 18.75],
      [7.5, 18.75],
      [7.5, 15.75],
      [4, 15.75],
    ],
    [2, 2, 1, 1, 1, 1, 1, 1]
  )
  return [...tinted(port), path("M9 9V11.5"), path("M12 9V11.5"), path("M15 9V11.5")]
})
def("globe", () => [circle(12, 12, 9, "t"), circle(12, 12, 9), ellipse(12, 12, 4, 9), path("M3 12H21")])

// Cloud: three circles over a flat base.
export function cloudPrims(dx = 0, dy = 0) {
  const L = [7.5 + dx, 14.5 + dy]
  const T = [12.75 + dx, 10.5 + dy]
  const R = [17.25 + dx, 15 + dy]
  const rl = 4.25
  const rt = 5.25
  const rr = 3.75
  const base = L[1] + rl
  const [lt] = intersect(L, rl, T, rt)
  const [tr] = intersect(T, rt, R, rr)
  const ang = (c, p) => {
    let a = (Math.atan2(p[0] - c[0], -(p[1] - c[1])) * 180) / Math.PI
    return a < 0 ? a + 360 : a
  }
  return [
    line([R[0], base], [L[0], base]),
    arc(L, rl, 180, ang(L, lt) + 360),
    arc(T, rt, ang(T, lt), ang(T, tr) < ang(T, lt) ? ang(T, tr) + 360 : ang(T, tr)),
    arc(R, rr, ang(R, tr), 180),
  ]
}
def("cloud", () => tinted(cloudPrims(0, 0.25)))
def("cloud-off", () => [path(d(slashed(cloudPrims(0, 0.25)))), slashPath()])
def("backup", () => {
  const cl = cloudPrims(0, -0.75)
  const kept = cut(cl, band([12, 10], [12, 22], 3))
  return [path(d(cl, true), "t"), path(d(kept)), path("M12 20.75V12.5"), path("M8.75 15.75L12 12.5L15.25 15.75")]
})
def("database", () => [
  ellipse(12, 6, 7.5, 3, "t"),
  ellipse(12, 6, 7.5, 3),
  path("M4.5 6V18A7.5 3 0 0 0 19.5 18V6"),
  path("M4.5 12A7.5 3 0 0 0 19.5 12"),
])

// ── health & tools ────────────────────────────────────────────────────────────
def("bug", () => {
  const body = "M7 12A3 3 0 0 1 10 9H14A3 3 0 0 1 17 12V15.5A5 5 0 0 1 7 15.5Z"
  return [
    path(body, "t"),
    path(body),
    path("M9.5 9V8A2.5 2.5 0 0 1 14.5 8V9"),
    path("M12 12.5V17.5"),
    path("M7 11.5L4.5 9"),
    path("M7 15H3.5"),
    path("M7.75 18L5.25 20.5"),
    path("M17 11.5L19.5 9"),
    path("M17 15H20.5"),
    path("M16.25 18L18.75 20.5"),
  ]
})
def("bolt", () => {
  const b = poly(
    [
      [13.5, 2.5],
      [5, 13.5],
      [11.5, 13.5],
      [10.5, 21.5],
      [19, 10.5],
      [12.5, 10.5],
    ],
    [0.75, 1, 0.5, 0.75, 1, 0.5]
  )
  return tinted(b)
})
def("activity", () => [path("M2.5 12H6.5L9.25 5L14.75 19L17.5 12H21.5")])
def("gauge", () => {
  const c = [12, 13.25]
  const r = 9
  const _a = polar(c[0], c[1], r, 225)
  const _b = polar(c[0], c[1], r, 135)
  const face = d([arc(c, r, 225, 495)])
  const needle = polar(c[0], c[1], 5.5, 45)
  return [
    path(`${face}Z`, "t"),
    path(face),
    path(d([line(c, needle)])),
    dotEl(c[0], c[1], 1.5),
  ]
})
def("task-manager", () => [
  rect(2.5, 4, 19, 16, 2.5, "t"),
  rect(2.5, 4, 19, 16, 2.5),
  path("M6 12.5H8.5L10 9L13 16L14.5 12.5H18"),
])
def("terminal", () => [rect(2.5, 4, 19, 16, 2.5, "t"), rect(2.5, 4, 19, 16, 2.5), path("M7 9L10 12L7 15"), path("M12.5 15H17")])
def("clipboard", () => {
  const board = "M8.5 4.5H7A2.5 2.5 0 0 0 4.5 7V19A2.5 2.5 0 0 0 7 21.5H17A2.5 2.5 0 0 0 19.5 19V7A2.5 2.5 0 0 0 17 4.5H15.5"
  return [path(`${board}V6.5H8.5Z`, "t"), path(board), rect(8.5, 2.5, 7, 4, 1)]
})
def("file-transfer", () => [
  path("M14 2.5H7A2.5 2.5 0 0 0 4.5 5V19A2.5 2.5 0 0 0 7 21.5H17A2.5 2.5 0 0 0 19.5 19V8Z", "t"),
  path("M14 2.5H7A2.5 2.5 0 0 0 4.5 5V19A2.5 2.5 0 0 0 7 21.5H17A2.5 2.5 0 0 0 19.5 19V8Z"),
  path("M14 2.5V6A2 2 0 0 0 16 8H19.5"),
  path("M8.5 11.5H15.5"),
  path("M13.25 9.25L15.5 11.5L13.25 13.75"),
  path("M15.5 17H8.5"),
  path("M10.75 14.75L8.5 17L10.75 19.25"),
])
def("layers", () => {
  const top = poly(
    [
      [12, 3.5],
      [20.5, 8],
      [12, 12.5],
      [3.5, 8],
    ],
    1
  )
  return [...tinted(top), path("M3.5 12L12 16.5L20.5 12"), path("M3.5 16L12 20.5L20.5 16")]
})
def("puzzle", () => {
  const p =
    "M3.5 10A2.5 2.5 0 0 1 6 7.5H8.21A2.5 2.5 0 1 1 11.79 7.5H14A2.5 2.5 0 0 1 16.5 10V12.21A2.5 2.5 0 1 1 16.5 15.79V18A2.5 2.5 0 0 1 14 20.5H6A2.5 2.5 0 0 1 3.5 18Z"
  return [path(p, "t"), path(p)]
})
def("plug", () => {
  const body = "M6 9A2 2 0 0 1 8 7H16A2 2 0 0 1 18 9V11A6 6 0 0 1 6 11Z"
  return [path(body, "t"), path(body), path("M9 3V7"), path("M15 3V7"), path("M12 17V21")]
})
def("integrations", () => {
  const U = V.norm([1, -1])
  const N = V.norm([1, 1])
  const P = (u, v) => V.add([12, 12], V.add(V.mul(U, u), V.mul(N, v)))
  const box = (u0, u1, v0, v1, r) => poly([P(u0, v0), P(u1, v0), P(u1, v1), P(u0, v1)], r)
  const left = box(-8, -2.5, -4.25, 4.25, 1.5)
  const right = box(2.5, 8, -4.25, 4.25, 1.5)
  return [
    path(d(right, true), "t"),
    path(d(left, true)),
    path(d(right, true)),
    path(d([line(P(2.5, -1.75), P(0.5, -1.75))])),
    path(d([line(P(2.5, 1.75), P(0.5, 1.75))])),
    path(d([line(P(-8, 0), P(-10, 0))])),
    path(d([line(P(8, 0), P(10, 0))])),
  ]
})
def("package", () => {
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
  const pull = r / Math.sin(Math.PI / 3) - r
  const mid = (i) => V.add(hex[i], V.mul(V.norm(V.sub(C, hex[i])), pull))
  return [
    path("M12 12L20 7.5V16.5L12 21Z", "t"),
    path(d(outline, true)),
    path(d([line(mid(5), [12, 12]), line([12, 12], mid(1))])),
    path(d([line([12, 12], mid(3))])),
    path("M8 5.25L16 9.75"),
  ]
})
def("operating-system", () => [
  path("M3 9H21V17.5A2.5 2.5 0 0 1 18.5 20H5.5A2.5 2.5 0 0 1 3 17.5Z", "t"),
  rect(3, 4, 18, 16, 2.5),
  path("M3 9H21"),
  dotEl(6.25, 6.5, 1),
  dotEl(9, 6.5, 1),
])
def("patch", () => {
  // sticking plaster on the 45° axis
  const U = V.norm([1, -1])
  const N = V.norm([1, 1])
  const P = (u, v) => V.add([12, 12], V.add(V.mul(U, u), V.mul(N, v)))
  const band4 = poly([P(-10, -4.5), P(10, -4.5), P(10, 4.5), P(-10, 4.5)], 4.5)
  const pad = poly([P(-4, -4.5), P(4, -4.5), P(4, 4.5), P(-4, 4.5)], 0)
  return [
    path(d(pad, true), "t"),
    path(d(band4, true)),
    path(d([line(P(-4, -4.5), P(-4, 4.5))])),
    path(d([line(P(4, -4.5), P(4, 4.5))])),
    ...[
      [-1.5, -1.5],
      [1.5, -1.5],
      [-1.5, 1.5],
      [1.5, 1.5],
    ].map(([u, v]) => {
      const p = P(u, v)
      return dotEl(fx(p[0]), fx(p[1]), 1)
    }),
  ]
})
def("antivirus", () => [path(shieldPath(), "t"), path(shieldPath()), path("M8.75 12L11 14.25L15.25 10")])
