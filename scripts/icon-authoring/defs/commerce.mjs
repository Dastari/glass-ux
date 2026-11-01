// Commerce. `supplier` stays the delivery truck, so there is no separate truck glyph.
import { arc, circle, cut, d, disk, dotEl, path, poly, rect, tinted } from "../lib.mjs"

export const icons = {}
const def = (name, fn) => (icons[name] = fn)

// Credit card: the magnetic stripe. `access-card` carries the contactless arcs.
def("credit-card", () => [rect(2.5, 5, 19, 14, 2.5, "t"), rect(2.5, 5, 19, 14, 2.5), path("M2.5 10H21.5"), path("M6 14.5H10")])
def("wallet", () => [
  rect(3, 7, 18, 13.5, 2.5, "t"),
  rect(3, 7, 18, 13.5, 2.5),
  path("M6 7V6.5A3 3 0 0 1 9 3.5H15.5A2.5 2.5 0 0 1 18 6V7"),
  path("M21 11H16.5A2.75 2.75 0 0 0 16.5 16.5H21"),
  dotEl(16.75, 13.75, 1),
])
// Receipt: a slip with a torn foot of 45° teeth, and its printed lines.
def("receipt", () => {
  const n = 3
  const w = 14 / n
  const teeth = []
  for (let i = 0; i < n; i++) teeth.push([19 - i * w, 21.5], [19 - i * w - w / 2, 21.5 - w / 2])
  const slip = poly([[5, 2.5], [19, 2.5], ...teeth, [5, 21.5]], [2, 2, ...teeth.map((_, i) => (i === 0 ? 0 : 0.5)), 0])
  return [...tinted(slip), path("M8.5 7.5H15.5"), path("M8.5 11.5H15.5"), path("M8.5 15.5H12")]
})
def("cart", () => {
  const basket = poly([[6, 6.75], [21, 6.75], [19, 15.5], [8, 15.5]], [0, 1.25, 1.25, 1.25])
  return [...tinted(basket), path("M2.5 3.5H3.5A2 2 0 0 1 5.5 5L6 6.75"), dotEl(9.75, 19.75, 1.5), dotEl(17.5, 19.75, 1.5)]
})
def("gift", () => [
  rect(3, 7.5, 18, 4.5, 1, "t"),
  rect(3, 7.5, 18, 4.5, 1),
  path("M4.5 12V18A2.5 2.5 0 0 0 7 20.5H17A2.5 2.5 0 0 0 19.5 18V12"),
  path("M12 7.5V20.5"),
  path("M12 7.5H9A2.25 2.25 0 1 1 11.25 5.25L12 7.5"),
  path("M12 7.5H15A2.25 2.25 0 1 0 12.75 5.25L12 7.5"),
])
def("percent", () => {
  const ring = (x, y) => `M${x + 2.75} ${y}A2.75 2.75 0 1 1 ${x - 2.75} ${y}A2.75 2.75 0 1 1 ${x + 2.75} ${y}Z`
  return [path(ring(7.25, 7.25) + ring(16.75, 16.75), "t"), circle(7.25, 7.25, 2.75), circle(16.75, 16.75, 2.75), path("M18.5 5.5L5.5 18.5")]
})
// Coins: the front coin overlaps the one behind, which is knocked out 3 units around it.
def("coins", () => {
  const back = cut([arc([15, 9.25], 6.25, 0, 360)], disk([9.25, 14.25], 9.75))
  return [circle(9.25, 14.25, 6.75, "t"), circle(9.25, 14.25, 6.75), path(d(back)), path("M9.25 11.25V17.25")]
})
