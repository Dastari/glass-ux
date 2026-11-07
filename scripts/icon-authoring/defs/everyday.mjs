// Everyday interface glyphs: saving, reacting, organising and the state of a connection.
// Each one is built from the set's shared parts where it has them: the status circle, page,
// folder, cloud, funnel, link and the off slash.
import { angleOf, arc, circle, cut, d, dotEl, intersect, line, nearPrims, path, polar, poly, rect, rrect, tinted } from "../lib.mjs"
import { slashed, slashPath } from "./actions.mjs"
import { funnel, linkPrims } from "./chrome.mjs"
import { bellBody, bellClapper, ring } from "./core.mjs"
import { page } from "./file-types.mjs"
import { FOLDER } from "./more.mjs"
import { boltPoints, cloudPrims, wifiArcs } from "./rmm.mjs"

export const icons = {}
const def = (name, fn) => (icons[name] = fn)
const fx = (n) => +n.toFixed(2)

/** The add modifier: 2.75-unit arms about a point. */
const plusAt = (x, y, arm = 2.75) => [path(`M${x} ${y - arm}V${y + arm}`), path(`M${x - arm} ${y}H${x + arm}`)]
const plusPrims = (x, y, arm = 2.75) => [line([x, y - arm], [x, y + arm]), line([x - arm, y], [x + arm, y])]

// ── saving and adding ─────────────────────────────────────────────────────────
// Save: a diskette with its clipped corner, shutter and label. `disk` is the hard drive.
def("save", () => {
  const shell = poly([[3.5, 3.5], [16.5, 3.5], [20.5, 7.5], [20.5, 20.5], [3.5, 20.5]], [2.5, 1, 1, 2.5, 2.5])
  return [...tinted(shell), path("M7.5 3.5V6.5A1 1 0 0 0 8.5 7.5H13.5A1 1 0 0 0 14.5 6.5V3.5"), path("M7.5 20.5V14.5A1.5 1.5 0 0 1 9 13H15A1.5 1.5 0 0 1 16.5 14.5V20.5")]
})
def("folder-plus", () => [path(FOLDER, "t"), path(FOLDER), ...plusAt(12, 13)])
def("file-plus", () => page(...plusAt(12, 14.5)))

const CAL = () => rrect(3.5, 5, 17, 15.5, 2.5)
const calHeader = path("M3.5 10V7.5A2.5 2.5 0 0 1 6 5H18A2.5 2.5 0 0 1 20.5 7.5V10Z", "t")
// Calendar with a day to add: the add modifier overlaps the corner, knocked out 3 units.
def("calendar-plus", () => {
  const plus = plusPrims(18, 18)
  const clear = nearPrims(plus, 3)
  return [calHeader, path(d(cut([...CAL(), line([3.5, 10], [20.5, 10])], clear))), path("M8 3V7"), path("M16 3V7"), ...plusAt(18, 18), dotEl(8, 14.5, 1.25)]
})
// Calendar range: two dated ends joined across the grid.
def("calendar-range", () => [
  calHeader,
  rect(3.5, 5, 17, 15.5, 2.5),
  path("M3.5 10H20.5"),
  path("M8 3V7"),
  path("M16 3V7"),
  path("M8 15H16"),
  dotEl(8, 15, 1.4),
  dotEl(16, 15, 1.4),
])

// ── reacting ──────────────────────────────────────────────────────────────────
// Heart: two circles and the tangents from the tip. `star` stays the favourite.
def("heart", () => {
  const r = 4.75
  const L = [7.75, 8.75]
  const R = [16.25, 8.75]
  const tip = [12, 20.75]
  const [notch] = intersect(L, r, R, r)
  // Tangent from the tip to the right lobe.
  const D = Math.hypot(R[0] - tip[0], R[1] - tip[1])
  const base = Math.atan2(R[0] - tip[0], -(R[1] - tip[1]))
  const alpha = Math.asin(r / D)
  const tan = Math.sqrt(D * D - r * r)
  const t = [tip[0] + tan * Math.sin(base + alpha), tip[1] - tan * Math.cos(base + alpha)]
  const m = [24 - t[0], t[1]]
  const heart = [
    arc(R, r, angleOf(R, notch) + 0, angleOf(R, t) < angleOf(R, notch) ? angleOf(R, t) + 360 : angleOf(R, t)),
    line(t, tip),
    line(tip, m),
    arc(L, r, 360 - angleOf(R, t), 360 - angleOf(R, notch) + 360),
  ]
  return tinted(heart)
})
def("smile", () => [...ring(), dotEl(9, 10, 1.15), dotEl(15, 10, 1.15), path(d([arc([12, 12], 5, 120, 240)]))])
// Flag: a swallowtail pennant on its pole.
def("flag", () => {
  const cloth = poly([[5.5, 4], [20, 4], [15.75, 9.25], [20, 14.5], [5.5, 14.5]], [0, 1, 0.75, 1, 0])
  return [...tinted(cloth), path("M5.5 3V21.5")]
})
// Ban: a stop-sign octagon crossed out. `offline` is the slashed circle, a status.
def("ban", () => {
  const R = 9.75
  const flat = R * Math.cos((22.5 * Math.PI) / 180)
  const oct = poly(Array.from({ length: 8 }, (_, i) => polar(12, 12, R, 22.5 + i * 45)), 1)
  return [...tinted(oct), path(d([line(polar(12, 12, flat, 315), polar(12, 12, flat, 135))]))]
})

// ── communicating ─────────────────────────────────────────────────────────────
def("at-sign", () => {
  const end = polar(12, 12, 9, 135)
  return [circle(12, 12, 3.5), path(`M15.5 8.5V13.25A2.75 2.75 0 0 0 21 13.25V12A9 9 0 1 0 ${fx(end[0])} ${fx(end[1])}`)]
})
def("hash", () => [path("M4 9H20"), path("M4 15H20"), path("M10.25 4L8.25 20"), path("M15.75 4L13.75 20")])
def("reply", () => [path("M8.5 6.5L4 11L8.5 15.5"), path("M4 11H14.5A5.5 5.5 0 0 1 20 16.5V18.5")])
def("forward", () => [path("M15.5 6.5L20 11L15.5 15.5"), path("M20 11H9.5A5.5 5.5 0 0 0 4 16.5V18.5")])
def("mail-open", () => {
  const body = poly([[3, 10.25], [12, 3.25], [21, 10.25], [21, 20.5], [3, 20.5]], [2, 1.5, 2, 2.5, 2.5])
  return [...tinted(body), path("M7 12.75L12 16.25L17 12.75")]
})
// Megaphone: the horn, its handle and the rim of the mouth.
def("megaphone", () => {
  const horn = poly([[3, 9], [8.5, 9], [18.5, 3.5], [18.5, 19.5], [8.5, 14], [3, 14]], [1.5, 0.75, 1, 1, 0.75, 1.5])
  return [...tinted(horn), path("M6.75 14V18.25A1.75 1.75 0 0 0 10.25 18.25V15.5"), path("M21.5 9.5V13.5")]
})
def("link-off", () => [path(d(slashed(linkPrims(), 2.5))), slashPath()])
def("bell-off", () => [path(d(slashed([...bellBody(), bellClapper()], 2.5))), slashPath()])

// ── organising ────────────────────────────────────────────────────────────────
// Timer: a stopwatch, its crown and side button; the hand leans, unlike `clock`'s.
def("timer", () => [
  circle(12, 13.25, 7.75, "t"),
  circle(12, 13.25, 7.75),
  path("M9.5 2.75H14.5"),
  path("M12 2.75V5.5"),
  path("M18.5 6.25L20 7.75"),
  path("M12 13.25L15 10.25"),
])
def("filter-x", () => {
  const f = funnel(-2)
  return [...tinted(f), path("M15.5 13.5L20.5 18.5"), path("M20.5 13.5L15.5 18.5")]
})
// Sliders: two tracks, each broken by its thumb.
def("sliders", () => {
  const thumb = (x, y) => `M${x + 2.75} ${y}A2.75 2.75 0 1 1 ${x - 2.75} ${y}A2.75 2.75 0 1 1 ${x + 2.75} ${y}Z`
  return [
    path(thumb(15, 7) + thumb(9, 17), "t"),
    path("M3.5 7H12.25"),
    circle(15, 7, 2.75),
    path("M17.75 7H20.5"),
    path("M3.5 17H6.25"),
    circle(9, 17, 2.75),
    path("M11.75 17H20.5"),
  ]
})
// Adjust: a rotary knob and its scale, for tuning one value. `sliders` is the pair of tracks.
def("adjust", () => {
  const c = [12, 14]
  const tip = polar(c[0], c[1], 3, 315)
  const from = polar(c[0], c[1], 0.75, 315)
  return [
    circle(...c, 6, "t"),
    circle(...c, 6),
    path(d([line(from, tip)])),
    ...[-120, -60, 0, 60, 120].map((a) => {
      const [x, y] = polar(c[0], c[1], 9, a)
      return dotEl(fx(x), fx(y), 1)
    }),
  ]
})
def("book-open", () => {
  const left = "M12 7.5A3.5 3.5 0 0 0 8.5 4H4.5A2 2 0 0 0 2.5 6V16A2 2 0 0 0 4.5 18H8.5A3.5 3.5 0 0 1 12 20.5Z"
  const right = "M12 7.5A3.5 3.5 0 0 1 15.5 4H19.5A2 2 0 0 1 21.5 6V16A2 2 0 0 1 19.5 18H15.5A3.5 3.5 0 0 0 12 20.5Z"
  return [path(left + right, "t"), path(left), path(right)]
})
def("briefcase", () => [
  rect(3, 7.5, 18, 13, 2.5, "t"),
  rect(3, 7.5, 18, 13, 2.5),
  path("M8.5 7.5V5.5A2 2 0 0 1 10.5 3.5H13.5A2 2 0 0 1 15.5 5.5V7.5"),
  path("M3 13.5H9.25"),
  path("M14.75 13.5H21"),
  dotEl(12, 13.5, 1.25),
])
// Bank: a pediment on three columns, on the shared ground line.
def("bank", () => {
  const roof = poly([[12, 3], [21, 9.5], [3, 9.5]], [1, 1.25, 1.25])
  return [...tinted(roof), path("M7 12.75V17.5"), path("M12 12.75V17.5"), path("M17 12.75V17.5"), path("M3 20.5H21")]
})
// Language: a Latin A beside a CJK stroke group, the two scripts a translator moves between.
def("language", () => [
  path("M3.5 6H12.5"),
  path("M8 3V6"),
  path("M10.75 6A9 9 0 0 1 4 14.5"),
  path("M5.75 9A9 9 0 0 0 11.5 13.5"),
  path("M12.5 21L17 10.5L21.5 21"),
  path("M14 17.5H20"),
])
def("contrast", () => [path("M12 3A9 9 0 0 1 12 21Z", "t"), circle(12, 12, 9), path("M12 3V21")])
def("droplet", () => {
  const c = [12, 14]
  const r = 7.25
  const tip = [12, 2.5]
  const alpha = (Math.asin(r / (c[1] - tip[1])) * 180) / Math.PI
  const ang = 90 - alpha
  const a = polar(c[0], c[1], r, ang)
  const b = polar(c[0], c[1], r, -ang)
  return tinted([line(tip, a), arc(c, r, ang, 360 - ang), line(b, tip)])
})
def("flame", () => {
  const f = "M12.75 2.75A10.5 10.5 0 0 1 18.75 14.5A6.75 6.75 0 0 1 5.25 14.5A8 8 0 0 1 7.75 8.5A4.5 4.5 0 0 0 9.75 11.25A9 9 0 0 1 12.75 2.75Z"
  return [path(f, "t"), path(f)]
})
// Fingerprint: nested ridges, three units apart, closing at uneven lengths.
def("fingerprint", () => [
  path("M3 15V11.5A9 9 0 0 1 21 11.5V13.5"),
  path("M6 19V11.5A6 6 0 0 1 18 11.5V16"),
  path("M9 21V11.5A3 3 0 0 1 15 11.5V20"),
  path("M12 11.5V17.5"),
])
def("barcode", () => [
  rect(9.5, 5, 3, 14, 1, "t"),
  path("M3.5 5V19"),
  path("M6.5 5V19"),
  rect(9.5, 5, 3, 14, 1),
  path("M15.5 5V19"),
  path("M20.5 5V19"),
])
def("calculator", () => [
  rect(5, 2.5, 14, 19, 2.5, "t"),
  rect(5, 2.5, 14, 19, 2.5),
  rect(8, 5.5, 8, 4, 1),
  ...[13.5, 17.25].flatMap((y) => [8.75, 12, 15.25].map((x) => dotEl(x, y, 1))),
])

// ── connections and status ────────────────────────────────────────────────────
def("wifi-off", () => [path(d(slashed(wifiArcs(), 2.5))), dotEl(12, 17.5, 1.3), slashPath()])
// Bluetooth: the bind rune on 45° lines.
def("bluetooth", () => [path("M7.5 7.5L16.5 16.5L12 21V3L16.5 7.5L7.5 16.5")])
// Battery charging: `bolt`, overlapping the cell, which is knocked out around it.
def("battery-charging", () => {
  const s = 0.72
  const bolt = poly(boltPoints.map(([x, y]) => [fx(10.75 + (x - 12) * s), fx(12 + (y - 12) * s)]), [0.5, 0.75, 0.25, 0.5, 0.75, 0.25])
  return [path(d(bolt, true), "t"), path(d(cut(rrect(2.5, 7, 16.5, 10, 2), nearPrims(bolt, 3)))), path(d(bolt, true)), path("M21.25 10.5V13.5")]
})
// Cloud download: the cloud of `backup` with the arrow leaving through its base.
def("cloud-download", () => {
  const cl = cloudPrims(0, -2.25)
  const stem = line([12, 11], [12, 21.25])
  const head = [line([8.75, 18], [12, 21.25]), line([12, 21.25], [15.25, 18])]
  return [path(d(cl, true), "t"), path(d(cut(cl, nearPrims([stem, ...head], 3)))), path(d([stem])), path(d(head))]
})
// Two checks: the second's short arm stops 3 units short of the first's long arm.
def("check-check", () => [path("M2.75 11.5L7.25 16L15.25 8"), path("M11.75 14.5L13.25 16L21.25 8")])
def("circle-plus", () => [...ring(), ...plusAt(12, 12)])
def("circle-minus", () => [...ring(), path("M9.25 12H14.75")])

// Crown: a band with three points, a jewel above each; the primary one of a kind (a site,
// an owner). Landscape keyline, 17 wide. Points are tips (round join only); the valleys take a
// small radius and the foot the band's, as a polygon with non-right angles does.
def("crown", () => {
  const body = poly(
    [
      [5.25, 18],
      [3.5, 9.5],
      [8, 13],
      [12, 7.25],
      [16, 13],
      [20.5, 9.5],
      [18.75, 18],
    ],
    [1.5, 0, 0.75, 0, 0.75, 0, 1.5]
  )
  return [...tinted(body), dotEl(3.5, 6.5, 1.25), dotEl(12, 4.25, 1.25), dotEl(20.5, 6.5, 1.25), path("M6.5 21H17.5")]
})
