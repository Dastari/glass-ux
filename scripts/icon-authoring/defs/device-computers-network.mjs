import { angleOf, arc, circle, d, dotEl, ellipse, line, path, pl, poly, rect, rot } from "../lib.mjs"

// Original monochrome device-vendor adaptations. Wordmark-only identities use a
// geometric monogram; no fonts or downloaded logo paths are embedded.
// Identity references: the manufacturers' own product sites, plus:
// https://www.supermicro.com/manuals/SUPERMICRO_Logo_Guidelines_SC.pdf
// https://www.seagate.com/stories/media-assets/company-logos/
// https://www.amd.com/en/legal/trademarks.html
// https://www.eaton.com/us/en-us/company/news-insights/media-resources.html
// https://us.msi.com/about/brandStory/
export const icons = {}
const def = (name, fn) => (icons[name] = fn)
const shape = (points, radius = 0.75) => d(poly(points, radius), true)
const rotate = (segments, degrees, centre = [12, 12]) => segments.map((s) => s.k === "l"
  ? line(rot(s.p, centre, degrees), rot(s.q, centre, degrees))
  : arc(rot(s.c, centre, degrees), s.r, s.a0 + degrees, s.a1 + degrees))

def("dell", () => [
  circle(12, 12, 9, "t"), circle(12, 12, 9),
  path(d(rotate(pl([[15, 7.5], [9, 7.5], [9, 16.5], [15, 16.5]]), -45))),
  path(d(rotate([line([9, 12], [14, 12])], -45))),
])

def("hp", () => [
  circle(12, 12, 9, "t"), circle(12, 12, 9),
  path("M6.5 15L10.5 5M8.5 10H11L9 15M12.5 19L16.5 9H19L17 14H14.5"),
])

def("hpe", () => [rect(3, 7, 18, 10, 0.75, "t"), rect(3, 7, 18, 10, 0.75)])

def("lenovo", () => [
  path("M3.5 5V19H10M13 19V5L20.5 19V5"),
])

def("asus", () => [
  path("M3.5 20L10.5 4H13.5L20.5 20M7 13H17M4 8H20"),
])

def("acer", () => [
  path("M17 8A6.5 6.5 0 1 0 17 15M18.5 5L15 19H20"),
])

def("msi", () => [
  // The current corporate identity is the slanted wordmark, not an M shield.
  path("M3 17L5 7L8 12L11 7L9 17M13 17H15.5L17 12H13.5L15 7H18M19 17L21 7"),
])

def("gigabyte", () => [
  path("M19.5 4H7.5L4 7.5V17L7 20H20V12H13.5M11 8H16"),
])

def("supermicro", () => [
  // Keep the open orbit, S and terminal dot instead of a generic globe.
  path(d(rotate([arc([12, 12], 8.5, 55, -235)], -15))),
  path("M15.5 8H10.5A2 2 0 0 0 10.5 12H13.5A2 2 0 0 1 13.5 16H8.5"),
  dotEl(20.5, 12, 1.25),
])

def("fujitsu", () => [
  path("M5.5 21V10.5H14M5.5 15.5H12"),
  path("M12 6L14.5 3.5A2.25 2.25 0 1 1 14.5 6.5L12 4A2.25 2.25 0 1 0 12 6"),
])

def("panasonic", () => [
  path("M6.5 21V3.5H12.5A5 5 0 0 1 12.5 13.5H6.5"),
])

def("samsung", () => [
  ellipse(12, 12, 10, 7.5, "t"), ellipse(12, 12, 10, 7.5),
  path("M15.5 8.5H10A1.75 1.75 0 0 0 10 12H14A1.75 1.75 0 0 1 14 15.5H8.5"),
])

def("intel", () => [
  path("M20.5 16A10 8 0 1 1 20.5 8"),
  path("M12 11V17"), dotEl(12, 6.5, 1.25),
])

def("amd", () => [
  // Two stepped ribbons form the arrow; there is no diagonal shaft through it.
  path("M9 3H21V15L16.5 10.5V7.5H13.5Z", "t"),
  path("M9 3H21V15L16.5 10.5V7.5H13.5Z"),
  path("M7.5 9L3 13.5V21H10.5L15 16.5H7.5Z"),
])

def("nvidia", () => [
  path("M12 7V3.5H21V20.5H12V17Z", "t"),
  path("M12 7V3.5H21V20.5H12V17"),
  path("M3 12L7 8A7 7 0 0 1 17 12A7 7 0 0 1 7 16Z"),
  path("M12 9A3 3 0 1 0 12 15"),
])

def("cisco", () => [
  // Nine evenly spaced bridge piers preserve the two-tower silhouette.
  path([[3, 12.5, 16.5], [5.25, 9, 16.5], [7.5, 4.5, 19.5], [9.75, 9, 16.5], [12, 12.5, 16.5], [14.25, 9, 16.5], [16.5, 4.5, 19.5], [18.75, 9, 16.5], [21, 12.5, 16.5]]
    .map(([x, top, bottom]) => `M${x} ${top}V${bottom}`).join("")),
])

def("ubiquiti", () => [
  path("M5 9V14A7 7 0 0 0 19 14V3.5M8.5 3.5V6.5M5 3.5V5.5"),
])

def("mikrotik", () => [
  path("M3.5 20V7L8.5 12L13.5 7V20"),
  path("M16.5 3.5A5 5 0 0 1 21.5 8.5M16.5 7A1.5 1.5 0 0 1 18 8.5"),
])

def("tp-link", () => [
  path("M6.5 8V15A5 5 0 0 0 11.5 20H14.5M3 8H10M12 15V8A4.5 4.5 0 1 1 16.5 12.5H16"),
])

def("netgear", () => [
  // The wordmark has no underline; keep its squared, wide N construction.
  path("M4 20V4L20 20V4"),
])

def("aruba", () => [
  path("M17 11A5.5 5.5 0 1 0 17 16.5V11M17 15V20H20.5"),
  path("M5 6A10 10 0 0 1 18 4.5"),
])

def("juniper", () => [
  path("M5 3.5H19M15 3.5V14.5A5.5 5.5 0 0 1 4 14.5"),
])

def("fortinet", () => {
  const cells = [[3, 3], [10, 3], [17, 3], [3, 10], [17, 10], [3, 17], [10, 17], [17, 17]]
  return [rect(10, 3, 4, 4, 1, "t"), ...cells.map(([x, y]) => rect(x, y, 4, 4, 1))]
})

def("palo-alto", () => {
  const left = shape([[2.5, 10.5], [10.5, 2.5], [15, 7], [7, 15]], 0.5)
  const right = shape([[9, 17], [17, 9], [21.5, 13.5], [13.5, 21.5]], 0.5)
  return [path(left, "t"), path(left), path(right)]
})

def("sonicwall", () => [
  path(d(pl([[19, 4.5], [7, 4.5], [4, 7.5], [4, 10], [17, 14], [20, 17], [17, 20], [5, 20]], 1.5))),
])

def("sophos", () => {
  const body = shape([[12, 2.5], [20.5, 7.5], [20.5, 16.5], [12, 21.5], [3.5, 16.5], [3.5, 7.5]], 1)
  return [path(body, "t"), path(body), path("M15.5 8H10A2 2 0 0 0 10 12H14A2 2 0 0 1 14 16H8.5")]
})

def("watchguard", () => {
  const shield = "M4.5 3.5H19.5V12.5A10 10 0 0 1 12 21A10 10 0 0 1 4.5 12.5Z"
  return [path(shield, "t"), path(shield), path("M7.5 8L9.5 15L12 11.5L14.5 15L16.5 8")]
})

def("ruckus", () => {
  const dog = "M4 20V13.5A7 7 0 0 1 11 6.5L12 3.5L15.5 7L20.5 10.5V14H16.5L13 20Z"
  return [path(dog, "t"), path(dog), path("M9.5 7L7 12"), dotEl(14, 10.5, 1)]
})

def("d-link", () => [
  circle(11, 12.5, 6.5), path("M17.5 3V19"),
])

def("zyxel", () => [
  path("M4 4H20L4 20H20M10 10H16"),
])

def("huawei", () => {
  // Eight paired petals and an open centre distinguish the flower from a star.
  const petals = [-80, -58, -36, -12, 12, 36, 58, 80].map((angle) => {
    const p = [angle < 0 ? 11.25 : 12.75, 19.5]
    const length = Math.min(16, 9 / Math.max(0.01, Math.abs(Math.sin(angle * Math.PI / 180))))
    const half = length / 2, radius = (half * half + 0.64) / 1.6
    const offset = radius - 0.8, q = [p[0], p[1] - length]
    const right = [p[0] + offset, p[1] - half], left = [p[0] - offset, p[1] - half]
    const petal = [arc(right, radius, angleOf(right, p), angleOf(right, q)), arc(left, radius, angleOf(left, q), angleOf(left, p))]
    return d(rotate(petal, angle, p), true)
  })
  return [path(petals.join(""), "t"), path(petals.join(""))]
})

def("synology", () => [
  path("M19.5 5H9A4 4 0 0 0 9 13H15A3 3 0 0 1 15 19H4.5M7 3V7M17 17V21"),
])

def("qnap", () => [
  rect(3.5, 3.5, 17, 17, 2.5, "t"), rect(3.5, 3.5, 17, 17, 2.5),
  circle(11.5, 11.5, 4), path("M14.5 14.5L19 19"),
])

def("seagate", () => [
  // A continuous, tilted spiral rather than three disconnected signal rings.
  path(d(rotate([
    line([9, 10], [13, 10]),
    arc([13, 12], 2, 0, 180),
    line([13, 14], [8, 14]),
    arc([8, 9.5], 4.5, 180, 360),
    line([8, 5], [14, 5]),
    arc([14, 12], 7, 0, 180),
    line([14, 19], [11, 19]),
  ], -30))),
])

def("western-digital", () => [
  path("M2.5 5L5 19L8 11L11 19L13 5M15 5V19A7 7 0 0 0 15 5Z"),
])

def("apc", () => [
  path("M2.5 18L5.5 6L8.5 18M3.5 14H7.5M11 18V6H13A3 3 0 0 1 13 12H11M21.5 7A5.5 5.5 0 0 0 16.5 12A5.5 5.5 0 0 0 21.5 17"),
])

def("eaton", () => [
  // Squared E with the wordmark's interrupted top bar, without an invented arrow.
  path("M11 4H5V20H19M5 12H16M15 4H19"),
])

def("vertiv", () => [
  path("M3.5 4L12 20.5L20.5 4M3.5 10V4H9.5M14.5 4H20.5V10"),
])

def("schneider-electric", () => [
  path("M17 6H10A3.5 3.5 0 0 0 10 13H14A3 3 0 0 1 14 19H7M3 9H5M19 16H21M12 2.5V4M12 21V22.5"),
])
