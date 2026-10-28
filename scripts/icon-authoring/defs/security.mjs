// Physical security and access: cameras, their recorder and monitor layouts, doors, gates and barriers, the
// credentials presented at them (cards, NFC, codes, faces, plates) and the intercoms that
// answer them. Front or side views on the device keylines, tinted on the part that carries
// the meaning. The contactless arcs are one shared part (`nfc`, `access-reader`,
// `access-card`), as are the dome (`camera-dome`, `camera-ptz`, `siren`) and the doorway
// (`door`, `door-open`).
import { arc, circle, cut, d, disk, dome, dotEl, fmt, path, pl, poly, rect } from "../lib.mjs"

export const icons = {}
const def = (name, fn) => (icons[name] = fn)

/** Contactless arcs: concentric quarter arcs opening to the right (45°–135°). */
const waves = (c, radii) => radii.map((r) => path(d([arc(c, r, 45, 135)])))

/** A ceiling mount: an open-bottomed cap whose lower edge is the dome's chord. */
const mount = (x0, x1, top, bottom) =>
  path(d(pl([[x0, bottom], [x0, top], [x1, top], [x1, bottom]], [0, 1, 1, 0])))

/** A dome hanging from a chord at y: a half disc, closed along the chord. */
const domePrims = (cx, y, r) => [arc([cx, y], r, 90, 270), ...pl([[cx - r, y], [cx + r, y]])]

// Dome camera: the cap on the ceiling, the half-disc dome below with its lens.
def("camera-dome", () => {
  const dome = domePrims(12, 9.5, 8.5)
  return [path(d(dome, true), "t"), mount(5.5, 18.5, 6.25, 9.5), path(d(dome, true)), dotEl(12, 13.5, 1.5)]
})

// Turret camera: a ball hanging beneath its base, knocked out where the base covers it,
// with the lens ring looking out.
def("camera-turret", () => {
  const ball = [arc([12, 13.75], 6.75, 0, 360)]
  const base = (pt) => pt[1] < 8 + 1.5
  return [
    circle(12, 13.75, 6.75, "t"),
    rect(4.5, 3.5, 15, 4.5, 1),
    path(d(cut(ball, base))),
    circle(12, 14.25, 3),
    dotEl(12, 14.25, 1),
  ]
})

// PTZ camera: a dome hanging from its pendant, with the pan arrow beneath it.
def("camera-ptz", () => {
  const dome = domePrims(12, 6.5, 7)
  const y = 18.5
  return [
    path(d(dome, true), "t"),
    path("M12 2.5V6.5"),
    path(d(dome, true)),
    dotEl(12, 10, 1.25),
    path(`M4 ${y}H20`),
    path(`M6.75 ${y - 2.75}L4 ${y}L6.75 ${y + 2.75}`),
    path(`M17.25 ${y - 2.75}L20 ${y}L17.25 ${y + 2.75}`),
  ]
})

// Video doorbell: a capsule (half its width round) with the lens above the bell push.
def("doorbell", () => [
  rect(6.5, 2.5, 11, 19, 5.5, "t"),
  rect(6.5, 2.5, 11, 19, 5.5),
  dotEl(12, 8, 1.5),
  circle(12, 16, 2.5),
])

// NVR: a recorder box with the record mark (ring and core) beside two drive slots.
def("nvr", () => [
  rect(2.5, 5.5, 19, 13, 2.5, "t"),
  rect(2.5, 5.5, 19, 13, 2.5),
  circle(8.5, 12, 3),
  dotEl(8.5, 12, 1),
  path("M14.5 10H18.5"),
  path("M14.5 14H18.5"),
])

/** A monitor wall split into n × n camera tiles: the frame, tinted, with its dividers. */
const cameraGrid = (n) => {
  const [x, y, w, h] = [2.5, 4.5, 19, 15]
  const cuts = Array.from({ length: n - 1 }, (_, i) => i + 1)
  return [
    rect(x, y, w, h, 2.5, "t"),
    rect(x, y, w, h, 2.5),
    ...cuts.map((i) => path(`M${fmt(x + (w * i) / n)} ${y}V${y + h}`)),
    ...cuts.map((i) => path(`M${x} ${fmt(y + (h * i) / n)}H${x + w}`)),
  ]
}

// Camera layouts: one, four and nine feeds on the monitor wall.
def("camera-grid-1", () => cameraGrid(1))
def("camera-grid-4", () => cameraGrid(2))
def("camera-grid-9", () => cameraGrid(3))

// Siren: a beacon dome on its base, with three rays.
def("siren", () => {
  const dome = domePrims(12, 16, 5.5).map((s) => (s.k === "a" ? arc(s.c, s.r, -90, 90) : s))
  return [
    path(d(dome, true), "t"),
    path(d(dome, true)),
    rect(4, 16, 16, 4.5, 1),
    path("M12 3V6.5"),
    path("M4.75 6.75L7 9"),
    path("M19.25 6.75L17 9"),
  ]
})

/** The doorway shared by `door` and `door-open`: a frame standing on the ground line. */
const doorway = () => [
  path(d(pl([[4.5, 21], [4.5, 2.75], [19.5, 2.75], [19.5, 21]], [0, 2.5, 2.5, 0]))),
  path("M2.5 21H21.5"),
]

// Door: the closed leaf inside its frame, with the handle.
def("door", () => {
  const leaf = poly([[7.5, 21], [7.5, 5.75], [16.5, 5.75], [16.5, 21]], [0, 2, 2, 0])
  return [path(d(leaf, true), "t"), ...doorway(), path(d(pl([[7.5, 21], [7.5, 5.75], [16.5, 5.75], [16.5, 21]], [0, 2, 2, 0]))), dotEl(13.5, 13.5, 1)]
})

// Open door: the leaf swung in on its hinge, its top edge falling at 45°.
def("door-open", () => {
  const corners = [[7.5, 21], [7.5, 5.75], [12.5, 10.75], [12.5, 21]]
  return [path(d(poly(corners, [0, 1, 1, 0]), true), "t"), ...doorway(), path(d(pl(corners, [0, 1, 1, 0])))]
})

// Gate: two posts and an arched panel of bars between them.
def("gate", () => {
  const top = dome(5.5, 18.5, 9.5, 7.5)
  const panel = [top, ...pl([[18.5, 9.5], [18.5, 18], [5.5, 18], [5.5, 9.5]])]
  const onTop = (x) => top.c[1] - Math.sqrt(top.r ** 2 - (x - top.c[0]) ** 2)
  return [
    path(d(panel, true), "t"),
    rect(2.5, 4, 3, 17, 1),
    rect(18.5, 4, 3, 17, 1),
    path(d([top])),
    path("M5.5 18H18.5"),
    ...[9, 12, 15].map((x) => path(`M${x} 18V${fmt(onTop(x))}`)),
  ]
})

// Barrier: a boom gate, its cabinet on the ground line with the pivot, and the boom across
// the lane, rounded at its free end.
def("barrier", () => [
  rect(3, 8.5, 6.5, 12.5, 1.5, "t"),
  rect(3, 8.5, 6.5, 12.5, 1.5),
  dotEl(6.25, 12, 1),
  path(d([...pl([[9.5, 10.5], [20, 10.5]]), arc([20, 12], 1.5, 0, 180), ...pl([[20, 13.5], [9.5, 13.5]])])),
  path("M2 21H22"),
])

// NFC: the contactless arcs.
def("nfc", () => {
  const c = [4, 12]
  return waves(c, [3.5, 7, 10.5])
})

// Access reader: the wall reader with the contactless arcs and its status light.
def("access-reader", () => [
  rect(5.5, 2.5, 13, 19, 2.5, "t"),
  rect(5.5, 2.5, 13, 19, 2.5),
  ...waves([8.5, 10], [3, 6]),
  dotEl(12, 18, 1),
])

// Access card: a key card carrying the contactless mark (arcs about their dot).
def("access-card", () => [
  rect(2.5, 5, 19, 14, 2.5, "t"),
  rect(2.5, 5, 19, 14, 2.5),
  dotEl(8.5, 12, 1),
  ...waves([8.5, 12], [3, 6]),
])

// Keypad: the code entry panel, four rows of three keys.
def("keypad", () => [
  rect(5, 2.5, 14, 19, 2.5, "t"),
  rect(5, 2.5, 14, 19, 2.5),
  ...[6.5, 10, 13.5, 17].flatMap((y) => [8.5, 12, 15.5].map((x) => dotEl(x, y, 1))),
])

// Intercom: a door station, its speaker grille above the call button.
def("intercom", () => [
  rect(5, 2.5, 14, 19, 2.5, "t"),
  rect(5, 2.5, 14, 19, 2.5),
  path("M9 6.5H15"),
  path("M9 9.5H15"),
  circle(12, 16, 2.5),
])

// QR code: three finder squares, each with its centre, and data dots in the fourth corner.
def("qr-code", () => [
  rect(3.5, 3.5, 6.5, 6.5, 1.5),
  rect(14, 3.5, 6.5, 6.5, 1.5),
  rect(3.5, 14, 6.5, 6.5, 1.5),
  dotEl(6.75, 6.75, 1.15),
  dotEl(17.25, 6.75, 1.15),
  dotEl(6.75, 17.25, 1.15),
  ...[
    [15.25, 15.25],
    [19.25, 15.25],
    [15.25, 19.25],
    [19.25, 19.25],
  ].map(([x, y]) => dotEl(x, y, 1.15)),
])

// Vehicle: a car in profile, the body carrying the tint, its wheels knocked out of the sill.
def("vehicle", () => {
  const body = poly(
    [
      [2.5, 15.5],
      [2.5, 11.5],
      [4.5, 9.5],
      [7, 9.5],
      [10.5, 6],
      [15, 6],
      [18.5, 9.5],
      [19.5, 9.5],
      [21.5, 11.5],
      [21.5, 15.5],
    ],
    [1.5, 1, 1, 1, 1, 1, 1, 1, 1, 1.5]
  )
  const wheels = [
    [7, 16],
    [17, 16],
  ]
  const r = 2.25
  const clear = (pt) => wheels.some((c) => disk(c, r + 1.5)(pt))
  return [path(d(body, true), "t"), path(d(cut(body, clear))), ...wheels.map(([x, y]) => circle(x, y, r))]
})

// Licence plate: a long plate with its registration in two groups of characters.
def("licence-plate", () => [
  rect(2, 7.5, 20, 9, 2, "t"),
  rect(2, 7.5, 20, 9, 2),
  path("M5.5 12H10.5"),
  path("M13.5 12H18.5"),
])

// Face scan: a face inside the viewfinder corners.
def("face-scan", () => [
  path("M3.5 8V5.5A2 2 0 0 1 5.5 3.5H8"),
  path("M16 3.5H18.5A2 2 0 0 1 20.5 5.5V8"),
  path("M20.5 16V18.5A2 2 0 0 1 18.5 20.5H16"),
  path("M8 20.5H5.5A2 2 0 0 1 3.5 18.5V16"),
  dotEl(9.25, 10, 1.15),
  dotEl(14.75, 10, 1.15),
  path(d([arc([12, 12], 4, 125, 235)])),
])

// Voicemail: the tape glyph, two reels joined along their base.
def("voicemail", () => [circle(7, 12, 3.75), circle(17, 12, 3.75), path("M7 15.75H17")])
