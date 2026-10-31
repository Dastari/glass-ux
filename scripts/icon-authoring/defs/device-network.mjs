import { V, angleOf, arc, circle, d, line, path, pl, poly, polar, rect } from "../lib.mjs"

// Original monochrome identifiers for network and security vendors. A brand's symbol is
// drawn when it has one; a wordmark-only brand uses its wordmark's own initial.
// No fonts or downloaded logo paths are embedded.
//
// Traced by eye from the current logos (Wikipedia infobox files, October 2026): Cisco bridge,
// Ubiquiti U, MikroTik 2022 cube badge, NETGEAR, HPE Aruba Networking, Juniper Networks,
// Fortinet, Palo Alto Networks, SOPHOS, WatchGuard, SonicWall, D-Link and Huawei; the
// Ruckus dog from the owner's supplied artwork. Zyxel and TP-Link are drawn from memory.
export const icons = {}
const def = (name, fn) => (icons[name] = fn)
const shape = (points, radius = 0.75) => d(poly(points, radius), true)

/** A teardrop: tangent lines from a point to a round cap, as one closed chain. */
function teardrop(tip, centre, r) {
  const toC = V.sub(centre, tip)
  const dist = V.len(toC)
  const beta = Math.asin(r / dist) / (Math.PI / 180)
  const heading = angleOf(tip, centre)
  const reach = Math.sqrt(dist * dist - r * r)
  const a = polar(tip[0], tip[1], reach, heading - beta)
  const b = polar(tip[0], tip[1], reach, heading + beta)
  // The cap runs round the far side of the circle, through the heading.
  const a0 = angleOf(centre, a)
  let a1 = angleOf(centre, b)
  while (a1 < a0) a1 += 360
  return [line(tip, a), arc(centre, r, a0, a1), line(b, tip)]
}

/** S from two circular bowls joined by their inner tangent: top runs counter-clockwise. */
function sCurve(c1, r1, start, c2, r2, end) {
  const D = V.sub(c2, c1)
  const dist = V.len(D)
  const alpha = Math.acos((r1 + r2) / dist)
  const base = Math.atan2(D[1], D[0])
  const n = [Math.cos(base + alpha), Math.sin(base + alpha)]
  const p1 = V.add(c1, V.mul(n, r1))
  const p2 = V.sub(c2, V.mul(n, r2))
  let t1 = angleOf(c1, p1)
  while (t1 > start) t1 -= 360
  let t2 = angleOf(c2, p2)
  let e = end
  while (e < t2) e += 360
  return [arc(c1, r1, start, t1), line(p1, p2), arc(c2, r2, t2, e)]
}

def("cisco", () => [
  // Nine evenly spaced bridge piers: short and medium share a baseline, the towers drop below it.
  path([[2, 12.5, 16.5], [4.5, 9, 16.5], [7, 4.5, 19.5], [9.5, 9, 16.5], [12, 12.5, 16.5], [14.5, 9, 16.5], [17, 4.5, 19.5], [19.5, 9, 16.5], [22, 12.5, 16.5]]
    .map(([x, top, bottom]) => `M${x} ${top}V${bottom}`).join("")),
])

def("ubiquiti", () => {
  // Heavy U: the left arm is full height, the right arm stops short under its pixel squares.
  const u = "M14.25 10.75H19.5V13A7.5 7.5 0 0 1 4.5 13V3.5H9.75V13A2.25 2.25 0 0 0 14.25 13Z"
  return [path(u, "t"), path(u), rect(18.75, 3, 0.75, 0.75), rect(15.75, 5.25, 0.75, 0.75), rect(18.75, 7.5, 0.75, 0.75)]
})

def("mikrotik", () => {
  // Rounded hexagon badge holding the isometric M: a cube corner with its side edges and lid.
  const hex = shape([0, 60, 120, 180, 240, 300].map((a) => polar(12, 12, 9.75, a)), 2)
  const c = [12, 12], left = polar(12, 12, 5.5, 300), right = polar(12, 12, 5.5, 60)
  const m = pl([[left[0], 15.5], left, c, right, [right[0], 15.5]])
  return [path(hex, "t"), path(hex), path(d(m)), path(d([line(c, [12, 17.5])])), path(d([line(right, [12, 6.5])]))]
})

def("tp-link", () => [
  path("M6.5 8V15A5 5 0 0 0 11.5 20H14.5M3 8H10M12 15V8A4.5 4.5 0 1 1 16.5 12.5H16"),
])

def("netgear", () => {
  // The wordmark's heavy, square-cut N: vertical stems and a diagonal as thick as them.
  const n = shape([[3.5, 3.5], [8.25, 3.5], [16.25, 14], [16.25, 3.5], [20.5, 3.5], [20.5, 20.5], [15.75, 20.5], [7.75, 10], [7.75, 20.5], [3.5, 20.5]], 0)
  return [path(n, "t"), path(n)]
})

def("aruba", () => {
  // The wordmark's heavy geometric a: a round bowl with a flat-topped stem tangent on the right.
  const c = [11.75, 12], R = 7.5, T = 3.25
  const x = c[0] + R - T
  const y = Math.sqrt(R * R - (R - T) * (R - T))
  const meet = angleOf(c, [x, c[1] - y])
  const outer = d([
    ...pl([[x, c[1] - y], [x, c[1] - R], [c[0] + R, c[1] - R], [c[0] + R, c[1] + R], [x, c[1] + R], [x, c[1] + y]]),
    arc(c, R, 180 - meet, 360 + meet),
  ], true)
  const counter = d([arc(c, R - T, 360, 0)], true)
  return [path(outer + counter, "t"), path(outer), path(counter)]
})

def("juniper", () => [
  // A light J with no head bar: a long stem, a tight corner and a tail running left.
  path("M15.25 2.5V18.5A3 3 0 0 1 12.25 21.5H8.75"),
])

def("fortinet", () => {
  const cells = [[3, 3], [10, 3], [17, 3], [3, 10], [17, 10], [3, 17], [10, 17], [17, 17]]
  return [rect(10, 3, 4, 4, 1, "t"), ...cells.map(([x, y]) => rect(x, y, 4, 4, 1))]
})

def("palo-alto", () => {
  // Three 45-degree bars: the middle one is longest, flush with the left bar's lower end and
  // the right bar's upper end, so together they step like the logo's chevron.
  const at = ([u, v]) => [12 + (u + v) / Math.SQRT2, 12 + (v - u) / Math.SQRT2]
  const bar = (u0, u1, v0, v1) => shape([[u0, v0], [u1, v0], [u1, v1], [u0, v1]].map(at), 1)
  const bars = [bar(-6.5, 2.75, -8.25, -4.75), bar(-6.5, 6.5, -1.75, 1.75), bar(-2.75, 6.5, 4.75, 8.25)]
  return [path(bars.join(""), "t"), path(bars.join(""))]
})

def("sonicwall", () => [
  // The wordmark's light geometric S: two round bowls, the lower one wider, on a sloping spine.
  path(d(sCurve([10.75, 7.25], 3.75, 65, [13.25, 16.5], 4, 245))),
])

def("sophos", () => {
  // The wordmark's wide, heavy S: square bowls with rounded outer corners and vertical cuts.
  const s = shape([[20.5, 3.5], [3.5, 3.5], [3.5, 13.75], [17, 13.75], [17, 17], [3.5, 17], [3.5, 20.5], [20.5, 20.5], [20.5, 10.25], [7, 10.25], [7, 7], [20.5, 7]],
    [0.5, 2.5, 2, 0.75, 0.75, 0.5, 0.5, 2.5, 2, 0.75, 0.75, 0.5])
  return [path(s, "t"), path(s)]
})

def("watchguard", () => [
  // A W inside a thin ring, with the dash rising from the ring's upper right.
  circle(11, 13, 8.5, "t"), circle(11, 13, 8.5),
  path("M6 9.5L8.5 16.75L11 11.75L13.5 16.75L16 9.5"),
  path("M18.25 3.5L21.5 2"),
])

def("ruckus", () => {
  // The whole barking dog: tail out behind, two pointed ears, snout raised with the jaw open,
  // and four long legs. The leash and bark lines are left out at icon size.
  const body = shape([[2.5, 7], [9, 8], [11.75, 7.25], [11.5, 3], [13.25, 5.5], [14.25, 2.25], [15.5, 5], [21.75, 4.25], [18.25, 6.75], [20.5, 8.75], [16.75, 10], [16.5, 12], [14.5, 12.25], [11, 11.5], [7.5, 12.5], [4.5, 12.5], [4, 9]],
    [0.5, 1, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1.5, 1, 1.5, 1.5])
  return [path(body, "t"), path(body), path("M5 12.5L4.25 21H5.25M7.5 12.5L7.25 21H8.25M14.5 12.25L15.25 21H16.25M16.5 12L18.75 20.75H19.75")]
})

def("d-link", () => {
  // The slab-serif D with a pointed bowl and the pointed, pentagonal counter.
  const outer = shape([[3.5, 4], [14.5, 4], [20.5, 12], [14.5, 20], [3.5, 20], [3.5, 18], [5.25, 17], [5.25, 7], [3.5, 6]], [0.5, 3, 1.25, 3, 0.5, 0.5, 0.5, 0.5, 0.5])
  const counter = shape([[10.25, 17], [12, 17], [15.5, 12], [12, 7], [10.25, 7]], 0.5)
  return [path(outer + counter, "t"), path(outer), path(counter)]
})

def("zyxel", () => {
  // A heavy geometric Z with no crossbar.
  const z = shape([[4, 4], [20, 4], [20, 7.25], [9.25, 16.75], [20, 16.75], [20, 20], [4, 20], [4, 16.75], [14.75, 7.25], [4, 7.25]], 0.5)
  return [path(z, "t"), path(z)]
})

def("huawei", () => {
  // Eight broad teardrop petals fan up from two points either side of the centre: the top pair
  // longest and widest, the bottom pair thin and nearly level.
  const tip = [12.75, 18]
  const right = [[[15, 6.5], 1.75], [[19.75, 9.5], 1.5], [[21, 14.25], 1.25], [[20.25, 18.5], 0.75]]
  const petals = [...right, ...right.map(([c, r]) => [[24 - c[0], c[1]], r])]
    .map(([c, r]) => d(teardrop(c[0] > 12 ? tip : [24 - tip[0], tip[1]], c, r), true)).join("")
  return [path(petals, "t"), path(petals)]
})
