import { pinPrims } from "./actions.mjs"
import { arc, d, dotEl, path, polar, poly, rect, tinted } from "../lib.mjs"

export const icons = {}
const def = (name, fn) => (icons[name] = fn)

// Window frame used by layout glyphs: landscape keyline 18 × 16.
const FRAME = [3, 4, 18, 16]
const frame = (c) => rect(...FRAME, 2.5, c)

def("sidebar", () => [
  path("M9.5 4H5.5A2.5 2.5 0 0 0 3 6.5V17.5A2.5 2.5 0 0 0 5.5 20H9.5Z", "t"),
  frame(),
  path("M9.5 4V20"),
])
def("inspector", () => [
  path("M14.5 4H18.5A2.5 2.5 0 0 1 21 6.5V17.5A2.5 2.5 0 0 1 18.5 20H14.5Z", "t"),
  frame(),
  path("M14.5 4V20"),
])
def("columns", () => [frame(), path("M9 4V20"), path("M15 4V20")])
def("grid", () => [rect(3.5, 3.5, 7, 7, 1.5), rect(13.5, 3.5, 7, 7, 1.5), rect(3.5, 13.5, 7, 7, 1.5), rect(13.5, 13.5, 7, 7, 1.5)])
def("list", () => [
  dotEl(5, 6.5, 1.25),
  dotEl(5, 12, 1.25),
  dotEl(5, 17.5, 1.25),
  path("M9.5 6.5H20"),
  path("M9.5 12H20"),
  path("M9.5 17.5H20"),
])
def("dashboard", () => [
  rect(3.5, 3.5, 7, 9.5, 1.5, "t"),
  rect(3.5, 3.5, 7, 9.5, 1.5),
  rect(13.5, 3.5, 7, 5, 1.5),
  rect(13.5, 11, 7, 9.5, 1.5),
  rect(3.5, 16, 7, 4.5, 1.5),
])

// Window controls (R14): pop out, minimise, maximise, restore, close.
def("maximise", () => [rect(4.5, 4.5, 15, 15, 2.5)])
def("restore", () => [rect(4.5, 8.5, 11, 11, 2), path("M8.5 8.5V6.5A2 2 0 0 1 10.5 4.5H17.5A2 2 0 0 1 19.5 6.5V13.5A2 2 0 0 1 17.5 15.5H15.5")])
def("minimise", () => [path("M8 7.5L12 11.5L16 7.5"), path("M6 16.5H18")])
def("fullscreen", () => [
  path("M3.5 8.5V6A2.5 2.5 0 0 1 6 3.5H8.5"),
  path("M15.5 3.5H18A2.5 2.5 0 0 1 20.5 6V8.5"),
  path("M20.5 15.5V18A2.5 2.5 0 0 1 18 20.5H15.5"),
  path("M8.5 20.5H6A2.5 2.5 0 0 1 3.5 18V15.5"),
])
def("fullscreen-exit", () => [
  path("M8.5 3.5V6A2.5 2.5 0 0 1 6 8.5H3.5"),
  path("M20.5 8.5H18A2.5 2.5 0 0 1 15.5 6V3.5"),
  path("M15.5 20.5V18A2.5 2.5 0 0 1 18 15.5H20.5"),
  path("M3.5 15.5H6A2.5 2.5 0 0 1 8.5 18V20.5"),
])
def("external-link", () => [
  path("M10.5 5.5H6A2.5 2.5 0 0 0 3.5 8V18A2.5 2.5 0 0 0 6 20.5H16A2.5 2.5 0 0 0 18.5 18V13.5"),
  path("M11 13L20.5 3.5"),
  path("M14.5 3.5H20.5V9.5"),
])
def("pop-out", () => [
  rect(3.5, 3.5, 17, 17, 2.5),
  path("M9 15L15.5 8.5"),
  path("M10 8.5H15.5V14"),
])
def("filter", () => {
  const funnel = poly(
    [
      [3.5, 4.5],
      [20.5, 4.5],
      [14, 12.5],
      [14, 19.5],
      [10, 17.5],
      [10, 12.5],
    ],
    [1.5, 1.5, 0.75, 1, 1, 0.75]
  )
  return tinted(funnel)
})
def("sort", () => [path("M8 19.5V4.5"), path("M4.5 8L8 4.5L11.5 8"), path("M16 4.5V19.5"), path("M12.5 16L16 19.5L19.5 16")])
def("sort-asc", () => [path("M7 19.5V4.5"), path("M3.5 8L7 4.5L10.5 8"), path("M13.5 6.5H16"), path("M13.5 12H18"), path("M13.5 17.5H20.5")])
def("sort-desc", () => [path("M7 4.5V19.5"), path("M3.5 16L7 19.5L10.5 16"), path("M13.5 6.5H20.5"), path("M13.5 12H18"), path("M13.5 17.5H16")])

// Circular arrows: arcs on r 7.5 with L-shaped heads whose arms are axis-aligned.
const _head = (tip, dx, dy, k = 3.75) => path(`M${tip[0] + dx * k} ${tip[1]}H${tip[0]}V${tip[1] + dy * k}`.replace(/(\d+\.\d{3,})/g, (m) => (+m).toFixed(2)))
const fx = (n) => +n.toFixed(2)
def("refresh", () => {
  const r = 7.5
  const a = polar(12, 12, r, 45)
  const b = polar(12, 12, r, 225)
  return [
    path(d([arc([12, 12], r, 270, 405)])),
    path(`M${fx(a[0] - 3.5)} ${fx(a[1])}H${fx(a[0])}V${fx(a[1] - 3.5)}`),
    path(d([arc([12, 12], r, 90, 225)])),
    path(`M${fx(b[0] + 3.5)} ${fx(b[1])}H${fx(b[0])}V${fx(b[1] + 3.5)}`),
  ]
})
def("undo", () => [path("M8.5 13.5L4 9L8.5 4.5"), path("M4 9H14.5A5.25 5.25 0 0 1 14.5 19.5H11")])
def("redo", () => [path("M15.5 13.5L20 9L15.5 4.5"), path("M20 9H9.5A5.25 5.25 0 0 0 9.5 19.5H13")])
def("copy", () => [
  rect(9, 8, 11.5, 13, 2, "t"),
  rect(9, 8, 11.5, 13, 2),
  path("M9 16H5.5A2 2 0 0 1 3.5 14V5A2 2 0 0 1 5.5 3H13A2 2 0 0 1 15 5V8"),
])
def("link", () => [
  path("M9.5 7.5H7.5A4.5 4.5 0 0 0 7.5 16.5H9.5"),
  path("M14.5 7.5H16.5A4.5 4.5 0 0 1 16.5 16.5H14.5"),
  path("M8.5 12H15.5"),
])
def("pin", () => [...tinted(pinPrims()), path("M12 14.5V20.5")])
def("command", () => [
  path("M9 9V6A3 3 0 1 0 6 9H18A3 3 0 1 0 15 6V18A3 3 0 1 0 18 15H6A3 3 0 1 0 9 18V9"),
])
