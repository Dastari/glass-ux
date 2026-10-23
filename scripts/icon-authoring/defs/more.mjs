import { any, arc, circle, circlePrim, cut, d, disk, dome, dotEl, intersect, line, nearPrims, path, polar, poly, rect, tinted,  } from "../lib.mjs"

export const icons = {}
const def = (name, fn) => (icons[name] = fn)
const _fx = (n) => +n.toFixed(2)

// ── people ────────────────────────────────────────────────────────────────────
const person = (cx, headY, headR, x0, x1, base, top) => ({
  head: circlePrim(cx, headY, headR, 90),
  shoulders: dome(x0, x1, base, top),
})
def("user", () => {
  const p = person(12, 7.75, 4, 4.5, 19.5, 20.5, 14.5)
  return [circle(12, 7.75, 4, "t"), circle(12, 7.75, 4), path(d([p.shoulders]))]
})
def("users", () => {
  const front = person(9.25, 8.5, 3.5, 2.75, 15.75, 20.5, 15)
  const back = person(15.5, 6.75, 3, 11, 21.5, 19, 13)
  const shield = any(
    nearPrims([front.head, front.shoulders], 3),
    disk([9.25, 8.5], 3.5),
    (pt) => pt[1] > 15 && pt[0] < 15.75 && pt[0] > 2.75
  )
  const backKept = cut([back.head, back.shoulders], shield)
  return [circle(9.25, 8.5, 3.5, "t"), circle(9.25, 8.5, 3.5), path(d([front.shoulders])), path(d(backKept))]
})
def("user-plus", () => {
  const p = person(9.5, 7.75, 4, 2.5, 16.5, 20.5, 14.5)
  return [circle(9.5, 7.75, 4, "t"), circle(9.5, 7.75, 4), path(d([p.shoulders])), path("M19 7.75V13.25"), path("M16.25 10.5H21.75")]
})
def("account", () => {
  const head = [12, 9.25]
  const hr = 3.25
  const sc = [12, 22]
  const sr = 7
  const [, ] = [0, 0]
  const pts = intersect([12, 12], 9, sc, sr)
  const _left = pts[0][0] < pts[1][0] ? pts[0] : pts[1]
  const right = pts[0][0] < pts[1][0] ? pts[1] : pts[0]
  const a = (Math.atan2(right[0] - sc[0], -(right[1] - sc[1])) * 180) / Math.PI
  return [circle(12, 12, 9, "t"), circle(12, 12, 9), circle(head[0], head[1], hr), path(d([arc(sc, sr, -a, a)]))]
})

// ── navigation ────────────────────────────────────────────────────────────────
def("home", () => {
  const house = poly(
    [
      [4.5, 20.5],
      [4.5, 10.25],
      [12, 3.5],
      [19.5, 10.25],
      [19.5, 20.5],
    ],
    [2.5, 1.5, 1, 1.5, 2.5]
  )
  return [...tinted(house), path("M9.75 20.5V16.25A2.25 2.25 0 0 1 14.25 16.25V20.5")]
})
def("tickets", () => {
  const t =
    "M5.5 5.5H18.5A2.5 2.5 0 0 1 21 8V10A2 2 0 0 0 21 14V16A2.5 2.5 0 0 1 18.5 18.5H5.5A2.5 2.5 0 0 1 3 16V14A2 2 0 0 0 3 10V8A2.5 2.5 0 0 1 5.5 5.5Z"
  return [path(t, "t"), path(t), dotEl(15, 9, 1), dotEl(15, 12, 1), dotEl(15, 15, 1)]
})
def("tasks", () => [rect(3.5, 3.5, 17, 17, 2.5, "t"), rect(3.5, 3.5, 17, 17, 2.5), path("M8 12L10.75 14.75L16 9.5")])
def("sessions", () => [
  path("M3 9V6.5A2.5 2.5 0 0 1 5.5 4H18.5A2.5 2.5 0 0 1 21 6.5V17.5A2.5 2.5 0 0 1 18.5 20H14"),
  path(d([arc([3, 20], 4, 0, 90)])),
  path(d([arc([3, 20], 8, 0, 90)])),
  dotEl(3.75, 19.25, 1.25),
])

// ── data ──────────────────────────────────────────────────────────────────────
def("chart-line", () => [path("M3.5 3.5V18A2.5 2.5 0 0 0 6 20.5H20.5"), path("M7.5 15L11 11.5L14 14.5L19.5 9")])
def("chart-pie", () => {
  const c = [11.25, 12.75]
  const r = 8.25
  const main = [line(c, [c[0], c[1] - r]), arc(c, r, 0, -270), line([c[0] + r, c[1]], c)]
  const c2 = [12.75, 11.25]
  const slice = [line(c2, [c2[0], c2[1] - r]), arc(c2, r, 0, 90), line([c2[0] + r, c2[1]], c2)]
  return [path(d(slice, true), "t"), path(d(main, true)), path(d(slice, true))]
})
def("trend-up", () => [path("M3 17L9 11L13 15L21 7"), path("M15.5 7H21V12.5")])
def("trend-down", () => [path("M3 7L9 13L13 9L21 17"), path("M15.5 17H21V11.5")])
def("map-pin", () => {
  const c = [12, 9.5]
  const r = 7.25
  const tip = [12, 21.5]
  const dd = tip[1] - c[1]
  const alpha = (Math.asin(r / dd) * 180) / Math.PI
  // tangent points: angle from the centre, measured from straight down
  const ang = 90 - alpha
  const tl = polar(c[0], c[1], r, 180 + ang)
  const tr = polar(c[0], c[1], r, 180 - ang)
  const pin = [line(tip, tl), arc(c, r, 180 + ang, 360 + 180 - ang), line(tr, tip)]
  return [path(d(pin, true), "t"), path(d(pin, true)), circle(12, 9.5, 2.75)]
})

// ── files ─────────────────────────────────────────────────────────────────────
// `file`, `file-text` and the file types are in file-types.mjs.
const FOLDER = "M3 17.5V6.5A2.5 2.5 0 0 1 5.5 4H8.96A1.5 1.5 0 0 1 10.02 4.44L12 6.5H18.5A2.5 2.5 0 0 1 21 9V17.5A2.5 2.5 0 0 1 18.5 20H5.5A2.5 2.5 0 0 1 3 17.5Z"
def("folder", () => [path(FOLDER, "t"), path(FOLDER)])
def("folder-open", () => {
  const back = "M3 17.5V6.5A2.5 2.5 0 0 1 5.5 4H8.96A1.5 1.5 0 0 1 10.02 4.44L12 6.5H16.5A2.5 2.5 0 0 1 19 9V10"
  const front = poly(
    [
      [5.25, 10],
      [21.5, 10],
      [18.75, 20],
      [3, 20],
    ],
    [1.5, 1.5, 1.5, 1.5]
  )
  return [path(d(front, true), "t"), path(back), path(d(front, true))]
})
def("image", () => [
  rect(3, 4, 18, 16, 2.5, "t"),
  rect(3, 4, 18, 16, 2.5),
  circle(8.5, 9.5, 1.75),
  path("M3.5 17.5L9.5 11.5L15.5 17.5"),
  path("M13.5 15.5L16 13L20.5 17.5"),
])
def("code", () => [path("M8 7.5L3.5 12L8 16.5"), path("M16 7.5L20.5 12L16 16.5"), path("M13.5 5L10.5 19")])
