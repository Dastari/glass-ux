// Device classes discovered on a network (docs/glass-ux-components-plan.md §5): the glyphs the
// device class registry falls back to. Each is a front view of the appliance on the
// device keylines, tinted on its body like `endpoint`, `server` and `printer`.
import { arc, d, dotEl, ellipse, path, poly, rect } from "../lib.mjs"

export const icons = {}
const def = (name, fn) => (icons[name] = fn)

/** A short bar near the foot of a handheld (the home indicator), 3 units clear of the edge. */
const homeBar = (y) => path(`M10.5 ${y}H13.5`)

// Smartphone: a portrait slab (shorter side 11 → r 2).
def("mobile", () => [rect(6.5, 2.5, 11, 19, 2, "t"), rect(6.5, 2.5, 11, 19, 2), homeBar(18.5)])

// Tablet: the same slab on the portrait keyline (shorter side 15 → r 2.5).
def("tablet", () => [rect(4.5, 2.5, 15, 19, 2.5, "t"), rect(4.5, 2.5, 15, 19, 2.5), homeBar(18.5)])

// Desk phone (VoIP): the handset as a capsule beside the base, a display and a keypad.
def("desk-phone", () => [
  rect(9, 6, 12.5, 14, 2.5, "t"),
  rect(9, 6, 12.5, 14, 2.5),
  rect(2.5, 4, 3.5, 16, 1.75),
  rect(12, 9, 6.5, 2, 1),
  ...[12.25, 15.25, 18.25].flatMap((x) => [dotEl(x, 14.5, 1), dotEl(x, 17, 1)]),
])

// Router: a low body with two antennas, status lights and a port line.
def("router", () => [
  rect(3, 11.5, 18, 8, 2, "t"),
  rect(3, 11.5, 18, 8, 2),
  path("M7.5 11.5V4.5"),
  path("M16.5 11.5V4.5"),
  dotEl(7, 15.5, 1),
  dotEl(10, 15.5, 1),
  path("M14 15.5H17"),
])

// Network switch: a 1U front panel with a row of ports.
def("network-switch", () => [
  rect(2.5, 7.5, 19, 9, 2, "t"),
  rect(2.5, 7.5, 19, 9, 2),
  ...[6, 9, 12, 15, 18].map((x) => dotEl(x, 12, 1)),
])

// Access point: a ceiling disc seen from below with its status light, radiating up.
def("access-point", () => {
  const c = [12, 11.75]
  return [
    ellipse(12, 15.75, 8.5, 3.5, "t"),
    ellipse(12, 15.75, 8.5, 3.5),
    dotEl(12, 15.75, 1),
    path(d([arc(c, 3.5, -45, 45)])),
    path(d([arc(c, 7, -45, 45)])),
  ]
})

// NAS: a two-bay enclosure, each bay with its drive light below.
def("nas", () => [
  rect(4.5, 3, 15, 18, 2.5, "t"),
  rect(4.5, 3, 15, 18, 2.5),
  rect(7.5, 6, 3, 8.5, 1),
  rect(13.5, 6, 3, 8.5, 1),
  dotEl(9, 17.75, 1),
  dotEl(15, 17.75, 1),
])

// UPS: a tower with the bolt (shared part, scaled to clear the edge by 3) on its face.
def("ups", () => {
  const s = 0.62
  const at = ([x, y]) => [12 + (x - 12) * s, 12 + (y - 12) * s]
  const bolt = poly(
    [
      [13.5, 2.5],
      [5, 13.5],
      [11.5, 13.5],
      [10.5, 21.5],
      [19, 10.5],
      [12.5, 10.5],
    ].map(at),
    [0.5, 0.75, 0.25, 0.5, 0.75, 0.25]
  )
  return [rect(5, 3, 14, 18, 2.5, "t"), rect(5, 3, 14, 18, 2.5), path(d(bolt, true))]
})

// IP camera: a bullet body with its lens, on an arm from the wall.
def("camera", () => [
  rect(3, 5, 14, 6.5, 1.5, "t"),
  rect(3, 5, 14, 6.5, 1.5),
  dotEl(6, 8.25, 1),
  path("M13 11.5V15.75H21"),
  path("M21 12.5V19"),
])
