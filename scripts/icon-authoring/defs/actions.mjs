import { arc, centred, band, circle, circlePrim, cut, d, dotEl, line, path, polar, poly, rect, rot, rrect, tinted, V,  } from "../lib.mjs"

export const icons = {}
const def = (name, fn) => (icons[name] = fn)
const fx = (n) => +n.toFixed(2)
const C = [12, 12]

// The "off" slash: 45° from top-left to bottom-right; whatever it crosses is cut back 3.
export const SLASH = [
  [3.5, 3.5],
  [20.5, 20.5],
]
export const slashed = (prims, gap = 3) => cut(prims, band(SLASH[0], SLASH[1], gap))
export const slashPath = () => path("M3.5 3.5L20.5 20.5")

// ── editing & files ───────────────────────────────────────────────────────────
def("edit", () => {
  // pencil on the 45° axis; tip bottom-left, rounded end top-right
  const a = V.norm([1, -1])
  const n = V.norm([1, 1])
  const w = 2.75
  const tip = [4, 20]
  const cone = 4.5
  const L = 17.25
  const base = V.add(tip, V.mul(a, cone))
  const end = V.add(tip, V.mul(a, L))
  const pts = [tip, V.add(base, V.mul(n, w)), V.add(end, V.mul(n, w)), V.add(end, V.mul(n, -w)), V.add(base, V.mul(n, -w))]
  const body = poly(pts, [0, 0, 2, 2, 0])
  const f = V.add(tip, V.mul(a, L - 4))
  return [
    ...tinted(body),
    path(d([line(V.add(f, V.mul(n, w)), V.add(f, V.mul(n, -w)))])),
  ]
})
def("trash", () => {
  const body = "M5.5 7V18A2.5 2.5 0 0 0 8 20.5H16A2.5 2.5 0 0 0 18.5 18V7"
  return [
    path(`${body}Z`, "t"),
    path(body),
    path("M3.5 7H20.5"),
    path("M9 7V5A1.5 1.5 0 0 1 10.5 3.5H13.5A1.5 1.5 0 0 1 15 5V7"),
    path("M10 11V16.5"),
    path("M14 11V16.5"),
  ]
})
const tray = "M3.5 15V18A2.5 2.5 0 0 0 6 20.5H18A2.5 2.5 0 0 0 20.5 18V15"
def("download", () => [path(tray), path("M12 3.5V15"), path("M7.5 10.5L12 15L16.5 10.5")])
def("upload", () => [path(tray), path("M12 15V3.5"), path("M7.5 8L12 3.5L16.5 8")])
def("share", () => {
  const nodes = [
    [17.5, 5.5],
    [6.5, 12],
    [17.5, 18.5],
  ]
  const r = 2.75
  const gap = r + 1.75
  const link = (p, q) => {
    const u = V.norm(V.sub(q, p))
    return path(d([line(V.add(p, V.mul(u, gap)), V.sub(q, V.mul(u, gap)))]))
  }
  return [circle(6.5, 12, r, "t"), ...nodes.map(([x, y]) => circle(x, y, r)), link(nodes[1], nodes[0]), link(nodes[1], nodes[2])]
})
def("copy-link", () => [])

// ── visibility & security ─────────────────────────────────────────────────────
// Eye: a lens of two arcs meeting in tips at 3 and 21.
const EYE_R = 9.75
const _eyeTop = () => {
  const _cy = 18 // centre of the upper arc lies below
  const _a0 = -67.38
  return arc([12, 12 + 9.75 - 6], EYE_R, -67.38, 67.38)
}
export function eyePrims(cx = 12, cy = 12, half = 9, sag = 6) {
  const R = (half * half + sag * sag) / (2 * sag)
  const ang = (Math.asin(half / R) * 180) / Math.PI
  const top = arc([cx, cy - sag + R], R, -ang, ang)
  const bottom = arc([cx, cy + sag - R], R, 180 - ang, 180 + ang)
  return [top, bottom]
}
def("eye", () => {
  const e = eyePrims()
  return [path(d(e, true), "t"), path(d(e, true)), circle(12, 12, 3.25)]
})
def("eye-off", () => {
  const e = eyePrims()
  const pupil = [circlePrim(12, 12, 3.25, 45)]
  const kept = slashed([...e, ...pupil])
  return [path(d(kept)), path("M3.5 3.5L20.5 20.5")]
})
def("lock", () => [rect(4.5, 10.5, 15, 10, 2, "t"), rect(4.5, 10.5, 15, 10, 2), path("M8 10.5V7.5A4 4 0 0 1 16 7.5V10.5"), dotEl(12, 15.5, 1.5)])
def("unlock", () => {
  const end = polar(12, 7.5, 4, 60)
  return [rect(4.5, 10.5, 15, 10, 2, "t"), rect(4.5, 10.5, 15, 10, 2), path(`M8 10.5V7.5A4 4 0 0 1 ${fx(end[0])} ${fx(end[1])}`), dotEl(12, 15.5, 1.5)]
})
def("key", () => {
  const c = [8, 16]
  const r = 4.5
  const a = V.norm([1, -1])
  const start = V.add(c, V.mul(a, r))
  const end = [20.5, 3.5]
  const tooth = (t, l) => {
    const p = V.add(start, V.mul(V.sub(end, start), t))
    return path(d([line(p, V.add(p, V.mul(V.norm([1, 1]), l)))]))
  }
  return [circle(c[0], c[1], r, "t"), circle(c[0], c[1], r), path(d([line(start, end)])), tooth(0.62, 2.75), tooth(0.85, 2.25), dotEl(8, 16, 1.25)]
})

// ── power ─────────────────────────────────────────────────────────────────────
def("power", () => [path(d([arc(C, 8.25, 40, 320)])), path("M12 3.25V11")])
def("restart", () => {
  const r = 8.25
  const tip = polar(12, 12, r, 315)
  return [
    path(d([arc(C, r, 45, 315)])),
    path(`M${fx(tip[0])} ${fx(tip[1] + 3.5)}V${fx(tip[1])}H${fx(tip[0] - 3.5)}`),
    path("M12 3.25V11"),
  ]
})
def("sleep", () => {
  // crescent (smaller than the theme moon) with a z
  const dd = "M17.5 15.5A7 7 0 1 1 8.5 6.5A5.5 5.5 0 0 0 17.5 15.5Z"
  return [path(dd, "t"), path(dd), path("M14.5 3.5H19L14.5 8H19")]
})
def("hibernate", () => {
  const out = []
  for (const a of [0, 60, 120]) out.push(path(d([line(polar(12, 12, 8.75, a), polar(12, 12, 8.75, a + 180))])))
  for (let a = 0; a < 360; a += 60) {
    const tip = polar(12, 12, 5.5, a)
    out.push(path(d([line(polar(tip[0], tip[1], 2.5, a - 45), tip), line(tip, polar(tip[0], tip[1], 2.5, a + 45))])))
  }
  return out
})
def("wake", () => {
  const c = [12, 15.25]
  const rays = [270, 315, 0, 45, 90].map((a) => path(d([line(polar(c[0], c[1], 7.75, a), polar(c[0], c[1], 9.5, a))])))
  return [path("M7 15.25A5 5 0 0 1 17 15.25Z", "t"), path("M7 15.25A5 5 0 0 1 17 15.25"), path("M3.5 18.75H20.5"), ...rays]
})

// ── media ─────────────────────────────────────────────────────────────────────
def("play", () => {
  const t = poly(
    [
      [7, 4.5],
      [19.5, 12],
      [7, 19.5],
    ],
    [2, 1.75, 2]
  )
  return tinted(t)
})
def("pause", () => [
  path("M7.5 5H9A1.5 1.5 0 0 1 10.5 6.5V17.5A1.5 1.5 0 0 1 9 19H7.5A1.5 1.5 0 0 1 6 17.5V6.5A1.5 1.5 0 0 1 7.5 5ZM15 5H16.5A1.5 1.5 0 0 1 18 6.5V17.5A1.5 1.5 0 0 1 16.5 19H15A1.5 1.5 0 0 1 13.5 17.5V6.5A1.5 1.5 0 0 1 15 5Z", "t"),
  rect(6, 5, 4.5, 14, 1.5),
  rect(13.5, 5, 4.5, 14, 1.5),
])
def("stop", () => [rect(5, 5, 14, 14, 2.5, "t"), rect(5, 5, 14, 14, 2.5)])
def("record", () => [circle(12, 12, 8.5), circle(12, 12, 4.25, "d")])

// ── communication ─────────────────────────────────────────────────────────────
def("send", () => {
  // paper dart, symmetric about the anti-diagonal
  const plane = poly(
    [
      [20.5, 3.5],
      [13, 20.5],
      [10.5, 13.5],
      [3.5, 11],
    ],
    [1, 1, 0.75, 1]
  )
  return [...tinted(plane), path("M10.5 13.5L14.5 9.5")]
})
def("attach", () => {
  // paperclip on the 45° axis: four parallel wires 3 apart, outer loop r 4.5, inner r 1.5
  const c = [12, 12]
  const ang = 45
  const P = (x, y) => rot([12 + x, 12 + y], c, ang)
  const prims = [
    line(P(4.5, -3.5), P(4.5, 4.5)),
    arc(P(0, 4.5), 4.5, 90 + ang, 270 + ang),
    line(P(-4.5, 4.5), P(-4.5, -5.5)),
    arc(P(-1.5, -5.5), 3, 270 + ang, 450 + ang),
    line(P(1.5, -5.5), P(1.5, 4)),
    arc(P(0, 4), 1.5, 90 + ang, 270 + ang),
    line(P(-1.5, 4), P(-1.5, -2.5)),
  ]
  return [path(d(centred(prims)))]
})
const MIC = "M9 6A3 3 0 0 1 15 6V11.5A3 3 0 0 1 9 11.5Z"
def("mic", () => [path(MIC, "t"), rect(9, 3, 6, 11.5, 3), path("M5.5 11A6.5 6.5 0 0 0 18.5 11"), path("M12 17.5V21")])
def("mic-off", () => {
  const prims = slashed([...rrect(9, 3, 6, 11.5, 3), arc([12, 11], 6.5, 270, 90), line([12, 17.5], [12, 21])])
  return [path(d(prims)), slashPath()]
})
def("archive", () => {
  const body = "M4.5 8.5V18A2.5 2.5 0 0 0 7 20.5H17A2.5 2.5 0 0 0 19.5 18V8.5"
  return [path(`${body}Z`, "t"), path(body), rect(3, 3.5, 18, 5, 1.5), path("M10 12.5H14")]
})
def("inbox", () => {
  const trayLine = "M3.5 12.5H7.5L10 15H14L16.5 12.5H20.5"
  return [
    path(`${trayLine}V18A2.5 2.5 0 0 1 18 20.5H6A2.5 2.5 0 0 1 3.5 18Z`, "t"),
    rect(3.5, 3.5, 17, 17, 2.5),
    path(trayLine),
  ]
})
def("mail", () => [rect(3, 5, 18, 14, 2.5, "t"), rect(3, 5, 18, 14, 2.5), path("M7 9.5L12 13L17 9.5")])
def("phone", () => {
  // handset: a bracket rotated 45°, earpiece top-left, mouthpiece bottom-right
  const P = (u, v) => {
    const U = V.norm([1, -1])
    const Vv = V.norm([1, 1])
    return V.add([12.5, 11.5], V.add(V.mul(U, u), V.mul(Vv, v)))
  }
  const pts = [P(-3.25, -9.25), P(2.75, -9.25), P(2.75, -5.5), P(0, -5.5), P(0, 5.5), P(2.75, 5.5), P(2.75, 9.25), P(-3.25, 9.25)]
  const shape = poly(pts, [2.25, 1.25, 1.25, 1.5, 1.5, 1.25, 1.25, 2.25])
  return tinted(shape)
})
const bubble = () =>
  poly(
    [
      [3, 3.75],
      [21, 3.75],
      [21, 17],
      [10, 17],
      [6.5, 20.5],
      [6.5, 17],
      [3, 17],
    ],
    [2.5, 2.5, 2.5, 0, 0, 0, 2.5]
  )
def("chat", () => tinted(bubble()))
def("new-chat", () => [path(d(bubble(), true), "t"), path(d(bubble(), true)), path("M12 7.5V13"), path("M9.25 10.25H14.75")])

// ── time ──────────────────────────────────────────────────────────────────────
const hands = () => path("M12 7.5V12L15 15")
def("clock", () => [circle(12, 12, 9, "t"), circle(12, 12, 9), hands()])
def("history", () => {
  const c = [12, 12.25]
  const r = 8.5
  const tip = polar(c[0], c[1], r, 315)
  return [
    path(d([arc(c, r, 255, -45)])),
    path(`M${fx(tip[0])} ${fx(tip[1] - 3.5)}V${fx(tip[1])}H${fx(tip[0] + 3.5)}`),
    path("M12 7.75V12.25L15 15.25"),
  ]
})
def("calendar", () => [
  path("M3.5 10V7.5A2.5 2.5 0 0 1 6 5H18A2.5 2.5 0 0 1 20.5 7.5V10Z", "t"),
  rect(3.5, 5, 17, 15.5, 2.5),
  path("M3.5 10H20.5"),
  path("M8 3V7"),
  path("M16 3V7"),
  dotEl(8, 14.5, 1.25),
])
def("tag", () => {
  const t = poly(
    [
      [3.5, 3.5],
      [11.5, 3.5],
      [20.5, 12.5],
      [12.5, 20.5],
      [3.5, 11.5],
    ],
    [2, 2, 2, 2, 2]
  )
  return [...tinted(t), dotEl(8, 8, 1.5)]
})
def("bookmark", () => {
  const b = poly(
    [
      [6, 3],
      [18, 3],
      [18, 20.5],
      [12, 16.5],
      [6, 20.5],
    ],
    [2.5, 2.5, 1, 0, 1]
  )
  return tinted(b)
})
def("log-out", () => [path("M9.5 20.5H6A2.5 2.5 0 0 1 3.5 18V6A2.5 2.5 0 0 1 6 3.5H9.5"), path("M10 12H20.5"), path("M16.5 8L20.5 12L16.5 16")])
def("log-in", () => [path("M14.5 3.5H18A2.5 2.5 0 0 1 20.5 6V18A2.5 2.5 0 0 1 18 20.5H14.5"), path("M3.5 12H14"), path("M10 8L14 12L10 16")])
delete icons["copy-link"]

// Pin geometry is shared with chrome.mjs (pin); unpin cuts it with the off slash.
export const pinPrims = () =>
  poly(
    [
      [9.5, 3.5],
      [14.5, 3.5],
      [14.5, 9],
      [18, 12.5],
      [18, 14.5],
      [6, 14.5],
      [6, 12.5],
      [9.5, 9],
    ],
    [1, 1, 0, 1, 1, 1, 1, 0]
  )
def("unpin", () => [path(d(slashed([...pinPrims(), line([12, 14.5], [12, 20.5])], 2.5))), slashPath()])
