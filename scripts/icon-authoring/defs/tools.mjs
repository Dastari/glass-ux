// Hand tools, test equipment and safety gear. Long tools lie on the 45° tool axis of `edit`
// and `brush`, working end at the top right. `toolbox` is a box with a sloped lid and a bar
// handle, so it never reads as `briefcase`.
import { arc, circle, d, dotEl, line, path, poly, polar, angleOf, rect, tinted } from "../lib.mjs"

export const icons = {}
const def = (name, fn) => (icons[name] = fn)

const SQ = Math.SQRT1_2
/** Along the tool axis (towards the top right) and across it. */
const U = [SQ, -SQ]
const N = [SQ, SQ]
const at = (c, u, n) => [c[0] + U[0] * u + N[0] * n, c[1] + U[1] * u + N[1] * n]
/** A capsule on the tool axis, from u0 to u1 about a centre, half-width w. */
const axisCapsule = (c, u0, u1, w) =>
  poly([at(c, u1, -w), at(c, u1, w), at(c, u0, w), at(c, u0, -w)], w - 0.001)
const box = (x0, y0, x1, y1, r) =>
  poly(
    [
      [x0, y0],
      [x1, y0],
      [x1, y1],
      [x0, y1],
    ],
    r
  )

// Wrench: an open-ended spanner on the tool axis, jaw at the top right, the spanner tinted.
def("wrench", () => {
  const C = [15.5, 8.5]
  const R = 4.5
  const half = 1.5
  const reach = Math.sqrt(R * R - half * half)
  const end = 15.5
  const endC = at(C, -end, 0)
  const ang = (p) => angleOf(C, p)
  const jawA = at(C, reach, -half)
  const jawB = at(C, reach, half)
  const handleA = at(C, -reach, half)
  const handleB = at(C, -reach, -half)
  let toHandle = ang(handleA)
  while (toHandle < ang(jawB)) toHandle += 360
  let toJaw = ang(jawA)
  while (toJaw < ang(handleB)) toJaw += 360
  const spanner = [
    line(at(C, 0.75, half), jawB),
    arc(C, R, ang(jawB), toHandle),
    line(handleA, at(C, -end, half)),
    arc(endC, half, 135, 315),
    line(at(C, -end, -half), handleB),
    arc(C, R, ang(handleB), toJaw),
    line(jawA, at(C, 0.75, -half)),
    line(at(C, 0.75, -half), at(C, 0.75, half)),
  ]
  return tinted(spanner)
})

// Screwdriver: a handle and shaft on the tool axis, the handle tinted.
def("screwdriver", () => {
  const C = [12, 12]
  const handle = axisCapsule(C, -10, -3, 2.25)
  const tip = at(C, 9.5, 0)
  return [
    ...tinted(handle),
    path(d([line(at(C, -3, 0), tip)])),
    path(d([line(at(tip, 0, -1), at(tip, 0, 1))])),
  ]
})

// Hammer: a head across the top of a handle on the tool axis, the head tinted.
def("hammer", () => {
  const C = [12, 12]
  const head = poly([at(C, 4.5, -6.5), at(C, 4.5, 4), at(C, 8.5, 4), at(C, 8.5, -6.5)], 1.5)
  return [...tinted(head), path(d([line(at(C, 4.5, 0), at(C, -10, 0))]))]
})

// Drill: a power drill in profile with its bit, the body tinted.
def("drill", () => [
  ...tinted(box(8, 4.5, 20.5, 11, 2)),
  path(d(box(5.5, 6, 8, 9.5, 1), true)),
  path("M5.5 7.75H2.5"),
  path("M12.5 11L13.5 16.5"),
  path("M17.5 11V16.5"),
  path(d(box(11, 16.5, 20.5, 20.5, 1.5), true)),
])

// Toolbox: a box under a sloped lid with a bar handle, the body tinted.
def("toolbox", () => {
  const body = box(2.5, 11.5, 21.5, 20.5, 2)
  return [
    ...tinted(body),
    path(d(poly([
      [2.5, 11.5],
      [5.5, 8.5],
      [18.5, 8.5],
      [21.5, 11.5],
    ], [0, 1, 1, 0], false))),
    path("M8.5 8.5V5.5A1 1 0 0 1 9.5 4.5H14.5A1 1 0 0 1 15.5 5.5V8.5"),
    dotEl(12, 15.5, 1.25),
  ]
})

// Multimeter: a meter with its display, dial and probe sockets, the display tinted.
def("multimeter", () => {
  const c = [12, 14.25]
  const pointer = polar(c[0], c[1], 2.5, -45)
  return [
    rect(8.5, 5, 7, 4, 1, "t"),
    path(d(box(5.5, 2.5, 18.5, 21.5, 2.5), true)),
    rect(8.5, 5, 7, 4, 1),
    circle(c[0], c[1], 2.75),
    path(d([line(c, pointer)])),
    dotEl(9, 18.75, 1),
    dotEl(15, 18.75, 1),
  ]
})

// Flashlight: a torch on the tool axis throwing its beam, the head tinted.
def("flashlight", () => {
  const C = [11, 13]
  const head = poly([at(C, 1.5, -2), at(C, 1.5, 2), at(C, 4, 3.5), at(C, 4, -3.5)], [1, 1, 1, 1])
  const body = axisCapsule(C, -9, 1.5, 2)
  const rays = [-3, 0, 3].map((n) => path(d([line(at(C, 6.75, n * 1.15), at(C, 9, n * 1.6))])))
  return [...tinted(head), path(d(head, true)), path(d(body, true)), ...rays]
})

// Fire extinguisher: a cylinder under its valve and lever, with the hose, the cylinder tinted.
def("fire-extinguisher", () => {
  const cylinder = box(7, 8.5, 14, 21.5, 2.5)
  return [
    ...tinted(cylinder),
    path("M10.5 8.5V5.5"),
    path("M7.5 4L10.5 5.5H13.5"),
    path("M13.5 5.5H16A2.5 2.5 0 0 1 18.5 8V14"),
  ]
})

// Hard hat: a dome with its ridge on a brim, the dome tinted.
def("hard-hat", () => {
  const dome = [arc([12, 15.5], 7.5, -90, 90)]
  const domeClosed = [...dome, line([19.5, 15.5], [4.5, 15.5])]
  return [path(d(domeClosed, true), "t"), path(d(dome)), path("M2.5 18.5H21.5"), path("M4.5 15.5V18.5"), path("M19.5 15.5V18.5"), path("M12 8V12")]
})

// Traffic cone: a striped cone on its base, the cone tinted.
def("traffic-cone", () => {
  const cone = poly(
    [
      [10.5, 3],
      [13.5, 3],
      [18, 17.5],
      [6, 17.5],
    ],
    [1, 1, 0, 0]
  )
  const stripe = (y) => {
    const t = (y - 3) / 14.5
    const x0 = 10.5 - 4.5 * t
    const x1 = 13.5 + 4.5 * t
    return path(`M${x0.toFixed(2)} ${y}H${x1.toFixed(2)}`)
  }
  return [...tinted(cone), stripe(11), path("M3.5 20.5H20.5"), path("M6 17.5L4 20.5"), path("M18 17.5L20 20.5")]
})

// Wheel chock: a chock against a wheel on the ground, the chock tinted.
def("wheel-chock", () => {
  const chock = poly(
    [
      [15.5, 20],
      [19, 16.5],
      [21.5, 16.5],
      [21.5, 20],
    ],
    [0, 1, 1, 0]
  )
  return [...tinted(chock), circle(9, 14, 6), dotEl(9, 14, 1.25), path("M2.5 20H15.5")]
})

