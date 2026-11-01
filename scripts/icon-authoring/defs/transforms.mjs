// Arrows and transforms. Paired arrows are compound glyphs (heads of 4.5-unit arms); `rotate-*`
// is the circular arrow of `refresh` on one arc; `shrink` and `expand` are diagonal arrows
// with 5.5-unit Ls, so they stay apart from the window controls `maximise` and `fullscreen`.
import { arc, d, path, polar, poly, tinted } from "../lib.mjs"

export const icons = {}
const def = (name, fn) => (icons[name] = fn)
const fx = (n) => +n.toFixed(2)

def("arrow-left-right", () => [path("M3.5 12H20.5"), path("M8 7.5L3.5 12L8 16.5"), path("M16 7.5L20.5 12L16 16.5")])
def("arrow-up-down", () => [path("M12 3.5V20.5"), path("M7.5 8L12 3.5L16.5 8"), path("M7.5 16L12 20.5L16.5 16")])
def("arrow-up-left", () => [path("M17.5 17.5L6.5 6.5"), path("M14.5 6.5H6.5V14.5")])
def("arrow-down-left", () => [path("M17.5 6.5L6.5 17.5"), path("M6.5 9.5V17.5H14.5")])
def("arrow-down-right", () => [path("M6.5 6.5L17.5 17.5"), path("M17.5 9.5V17.5H9.5")])
def("chevrons-up", () => [path("M6.5 11.75L12 6.25L17.5 11.75"), path("M6.5 17.75L12 12.25L17.5 17.75")])
def("chevrons-down", () => [path("M6.5 6.25L12 11.75L17.5 6.25"), path("M6.5 12.25L12 17.75L17.5 12.25")])

/** A ring that ends in a clockwise arrowhead at its 45° point; shared with the seek glyphs. */
export const rotateArc = (c = [11.75, 12.25], r = 8.25) => {
  const tip = polar(c[0], c[1], r, 45)
  return [path(d([arc(c, r, 90, 405)])), path(`M${fx(tip[0] - 3.5)} ${fx(tip[1])}H${fx(tip[0])}V${fx(tip[1] - 3.5)}`)]
}
export const rotateArcBack = (c = [12.25, 12.25], r = 8.25) => {
  const tip = polar(c[0], c[1], r, 315)
  return [path(d([arc(c, r, 270, -45)])), path(`M${fx(tip[0] + 3.5)} ${fx(tip[1])}H${fx(tip[0])}V${fx(tip[1] - 3.5)}`)]
}
def("rotate-cw", () => rotateArc())
def("rotate-ccw", () => rotateArcBack())

// Flip: a shape and its reflection across the axis; the source carries the tint.
const wedge = (points) => poly(points, [1, 1, 1])
def("flip-horizontal", () => {
  const a = wedge([[9, 6.5], [9, 18], [2.75, 18]])
  const b = wedge([[15, 6.5], [15, 18], [21.25, 18]])
  return [...tinted(a), path(d(b, true)), path("M12 3V21")]
})
def("flip-vertical", () => {
  const a = wedge([[6, 9], [17.5, 9], [17.5, 2.75]])
  const b = wedge([[6, 15], [17.5, 15], [17.5, 21.25]])
  return [...tinted(a), path(d(b, true)), path("M3 12H21")]
})

def("crop", () => [
  path("M7 7H15A2 2 0 0 1 17 9V17H9A2 2 0 0 1 7 15Z", "t"),
  path("M7 3V15A2 2 0 0 0 9 17H21"),
  path("M3 7H15A2 2 0 0 1 17 9V21"),
])
def("move", () => [
  path("M12 3V21"),
  path("M3 12H21"),
  path("M9 6L12 3L15 6"),
  path("M9 18L12 21L15 18"),
  path("M6 9L3 12L6 15"),
  path("M18 9L21 12L18 15"),
])
def("shrink", () => [
  path("M20 4L13.5 10.5"),
  path("M13.5 5V10.5H19"),
  path("M4 20L10.5 13.5"),
  path("M5 13.5H10.5V19"),
])
def("expand", () => [
  path("M14 10L20 4"),
  path("M14.5 4H20V9.5"),
  path("M10 14L4 20"),
  path("M4 14.5V20H9.5"),
])
