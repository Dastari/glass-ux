// Sites and the organisations a business deals with. The buildings stand on the shared
// ground line of `organisation` (3–21 at y 20.5); each has its own silhouette, so none is a
// near-duplicate of the organisation's tower and annex.
import { arc, circle, cut, d, disk, dome, dotEl, line, path, poly, tinted } from "../lib.mjs"

export const icons = {}
const def = (name, fn) => (icons[name] = fn)

const GROUND = "M3 20.5H21"
/** A door at the foot of a facade: rounded at the top, open to the ground line. */
const door = (x, w, top) => path(`M${x} 20.5V${top + 1.5}A1.5 1.5 0 0 1 ${x + 1.5} ${top}H${x + w - 1.5}A1.5 1.5 0 0 1 ${x + w} ${top + 1.5}V20.5`)
/** A closed outline standing on the ground: the two foot corners stay square. */
const building = (points, radii) => poly(points, radii)

// Office: a tower with a grid of windows and a door.
def("office", () => {
  const tower = building(
    [
      [6, 20.5],
      [6, 3.5],
      [18, 3.5],
      [18, 20.5],
    ],
    [0, 2.5, 2.5, 0]
  )
  const windows = [9.5, 14.5].flatMap((x) => [7.5, 11, 14.5].map((y) => dotEl(x, y, 1.1)))
  return [...tinted(tower), path(GROUND), ...windows, door(10.5, 3, 17.25)]
})

// Warehouse: a wide shed under an arched roof, with a roller door.
def("warehouse", () => {
  const roof = dome(3.5, 20.5, 10, 5.5)
  const shed = [line([3.5, 20.5], [3.5, 10]), roof, line([20.5, 10], [20.5, 20.5])]
  return [path(d(shed, true), "t"), path(d(shed)), path(GROUND), path("M8 20.5V14H16V20.5"), path("M8 17.25H16")]
})

// Store: a shopfront under a scalloped awning.
def("store", () => {
  const top = 4
  const base = 8.5
  const x0 = 3.5
  const x1 = 20.5
  const n = 4
  const w = (x1 - x0) / n
  const r = w / 2
  const scallops = Array.from({ length: n }, (_, i) => arc([x1 - r - i * w, base], r, 90, 270))
  const awning = [
    line([x0, base], [x0, top + 1.5]),
    arc([x0 + 1.5, top + 1.5], 1.5, 270, 360),
    line([x0 + 1.5, top], [x1 - 1.5, top]),
    arc([x1 - 1.5, top + 1.5], 1.5, 0, 90),
    line([x1, top + 1.5], [x1, base]),
    ...scallops,
  ]
  return [path(d(awning, true), "t"), path(d(awning, true)), path(GROUND), path("M5 13V20.5"), path("M19 13V20.5"), door(9.5, 5, 14.5)]
})

// School: a gabled hall with a clock, between two lower wings.
def("school", () => {
  const hall = building(
    [
      [3.5, 20.5],
      [3.5, 11],
      [8.5, 11],
      [8.5, 6.5],
      [12, 3],
      [15.5, 6.5],
      [15.5, 11],
      [20.5, 11],
      [20.5, 20.5],
    ],
    [0, 1.5, 1, 1, 1, 1, 1, 1.5, 0]
  )
  return [...tinted(hall), path(GROUND), circle(12, 9.25, 1.75), door(10.5, 3, 15.5), dotEl(6, 15, 1.1), dotEl(18, 15, 1.1)]
})

// Hospital: a tower bearing a cross, between two lower wings.
def("hospital", () => {
  const block = building(
    [
      [3.5, 20.5],
      [3.5, 11],
      [6.5, 11],
      [6.5, 3.5],
      [17.5, 3.5],
      [17.5, 11],
      [20.5, 11],
      [20.5, 20.5],
    ],
    [0, 1, 1, 2, 2, 1, 1, 0]
  )
  return [...tinted(block), path(GROUND), path("M12 7V12"), path("M9.5 9.5H14.5"), door(10.5, 3, 15.75)]
})

// Factory: a chimney beside a sawtooth roof, with a row of windows.
def("factory", () => {
  const works = building(
    [
      [3.5, 20.5],
      [3.5, 4],
      [7, 4],
      [7, 12],
      [11.5, 7.5],
      [11.5, 12],
      [16, 7.5],
      [16, 12],
      [20.5, 7.5],
      [20.5, 20.5],
    ],
    [0, 1, 1, 0.75, 0.75, 0.75, 0.75, 0.75, 0.75, 0]
  )
  return [...tinted(works), path(GROUND), ...[10.5, 14, 17.5].map((x) => dotEl(x, 16, 1.1))]
})

// Partner: a handshake. The right hand comes over the top, thumb forward, its fingers
// wrapping the left hand; each forearm ends at its cuff. A line glyph, without a tint.
def("partner", () => {
  const fingers = [18, 15, 12].map((x) => arc([x, 14], 1.5, 90, 270))
  const right = [
    ...poly(
      [
        [21, 6],
        [15.5, 6],
        [10, 11.5],
        [11.5, 13],
        [15, 9.5],
        [19.5, 14],
      ],
      [0, 1, 1, 1, 1, 0],
      false
    ),
    ...fingers,
  ]
  const left = poly(
    [
      [3, 12.5],
      [9.5, 19],
      [10.5, 18],
    ],
    [0, 1, 0],
    false
  )
  return [path("M3 5V13"), path("M21 5V13"), path("M3 6H7.5L9.5 8"), path(d(right)), path(d(left))]
})

// Supplier: a delivery truck, its cargo box carrying the tint.
def("supplier", () => {
  const box = poly(
    [
      [2.5, 4.5],
      [13.5, 4.5],
      [13.5, 15.5],
      [2.5, 15.5],
    ],
    2
  )
  const cab = poly(
    [
      [13.5, 8.5],
      [17.5, 8.5],
      [21, 12],
      [21, 15.5],
      [13.5, 15.5],
    ],
    [0, 1, 1, 1.5, 0]
  )
  const wheels = [
    [6.5, 17.5],
    [17.25, 17.5],
  ]
  const clear = (pt) => wheels.some((c) => disk(c, 2 + 1.5)(pt))
  return [
    path(d(box, true), "t"),
    path(d(cut(box, clear))),
    path(d(cut(cab, clear))),
    ...wheels.map(([x, y]) => circle(x, y, 2)),
  ]
})
