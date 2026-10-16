import { arc, circle, d, dotEl, line, path, pl, poly, rect, rot } from "../lib.mjs"

// Original monochrome identifiers for communications, printing and AV manufacturers.
// Wordmark-only brands use a simplified initial or monogram rather than tiny lettering.
// Reference identities: each manufacturer's own site; distinctive symbol references:
// https://www.hp.com/us-en/poly.html
// https://www.grandstream.com/hubfs/Grandstream%20Certified%20Partner%20Branding%20Guide.pdf
// https://global.kyocera.com/company/brand/index.html
// https://brand.lexmark.com/en/overview/visual-elements/logo.html
// https://reolink.com/blog/reolink-new-brand-campaign/
// https://www.crestron.com/legal/trademarks
export const icons = {}
const def = (name, fn) => (icons[name] = fn)
const outline = (points, radius = 0.75) => d(poly(points, radius), true)
const stroke = (points, radius = 0) => path(d(pl(points, radius)))
const rotated = (segments, angle) => segments.map((segment) => segment.k === "l"
  ? line(rot(segment.p, [12, 12], angle), rot(segment.q, [12, 12], angle))
  : arc(rot(segment.c, [12, 12], angle), segment.r, segment.a0 + angle, segment.a1 + angle))

// VoIP and conferencing.
def("yealink", () => [
  path("M5 4.5L11 14L18 4.5M11 14L7.5 20H4.5"),
])

def("poly", () => {
  // Three connected, rounded propeller lobes. Rotation is resolved into coordinates.
  const lobe = poly([[12, 12], [7, 11], [5.5, 8], [7, 5], [10, 5], [12, 8]], 1.5)
  const lobes = [0, 120, 240].map((angle) => d(rotated(lobe, angle), true))
  return [path(lobes[0], "t"), path(lobes.join(""))]
})

def("grandstream", () => [
  stroke([[20.5, 7.5], [16, 3], [8, 3], [3.5, 7.5], [3.5, 16.5], [8, 21], [16, 21], [20.5, 16.5], [20.5, 12], [12.5, 12]], 1.5),
  path("M9 16.5H15.5"),
])

def("snom", () => [
  path("M18.5 5.5H9A3.25 3.25 0 0 0 9 12H15A3.25 3.25 0 0 1 15 18.5H5.5"),
])

def("avaya", () => [
  path("M3.5 20.5L10 3.5H14L20.5 20.5M8 15H16"),
])

def("fanvil", () => [
  path("M5 20.5L9 3.5H21M7 12H17"),
])

def("mitel", () => [
  path("M3.5 20V9A4.25 4.25 0 0 1 12 9V20M12 9A4.25 4.25 0 0 1 20.5 9V20"),
])

def("gigaset", () => [
  circle(11, 9, 6.5, "t"), circle(11, 9, 6.5),
  path("M17.5 4V16A5.5 5.5 0 0 1 12 21.5H7"),
])

def("alcatel-lucent", () => [
  circle(12, 12, 9, "t"), circle(12, 12, 9),
  path("M7 16.5L12 7.5L17 16.5M9 13.5H15"),
])

def("audiocodes", () => [
  circle(7, 12, 3.5),
  path("M10.5 8.5V15.5"),
  path(d([arc([17, 12], 3.5, 45, -225)])),
])

// Printers and document capture.
def("brother", () => [
  circle(12.5, 13.5, 6.5, "t"), circle(12.5, 13.5, 6.5),
  path("M6 3.5V20"),
])

def("canon", () => {
  // The open C and its wedge-shaped terminal are kept wider than a text counter.
  const c = "M19 6A8.5 8.5 0 1 0 19 18L16.5 15.5A5 5 0 1 1 16.5 8.5L19 10Z"
  return [path(c, "t"), path(c)]
})

def("epson", () => [
  path("M19.5 3.5H5.5V20.5H19.5M5.5 12H17"),
])

def("kyocera", () => {
  // The angular K encloses a C: the manufacturer's identifying KC construction.
  const k = outline([[3.5, 3.5], [12, 12], [3.5, 20.5]], 0)
  const c = outline([[20.5, 3.5], [12, 12], [20.5, 20.5], [20.5, 15], [17.5, 12], [20.5, 9]], 0)
  return [path(k, "t"), path(k), path(c)]
})

def("ricoh", () => [
  path("M5.5 20.5V3.5H13A5 5 0 0 1 13 13.5H5.5M12 13.5L19.5 20.5"),
])

def("lexmark", () => [
  path(outline([[3.5, 3.5], [12, 3.5], [8, 12], [3.5, 20.5]], 0), "t"),
  rect(3.5, 3.5, 17, 17, 0),
  path(outline([[12, 8], [16, 12], [12, 16], [8, 12]], 0)),
  path("M3.5 3.5L12 8M20.5 20.5L12 16"),
])

def("xerox", () => [
  circle(12, 12, 9, "t"), circle(12, 12, 9),
  path("M6 6A18 18 0 0 1 18 18M18 6A18 18 0 0 0 6 18"),
])

def("zebra", () => {
  const head = outline([[4.5, 20.5], [6, 11.5], [4.5, 7], [9, 3.5], [16, 3.5], [20, 7.5], [17, 13], [12.5, 13], [11, 20.5]], 0.75)
  return [path(head, "t"), path(head), path("M6.5 7H12.5M7 10.5H12M6.5 16H10.5")]
})

def("sharp", () => [
  stroke([[20, 4], [8, 4], [4, 8], [8, 12], [16, 12], [20, 16], [16, 20], [4, 20]], 1),
])

def("oki", () => [
  rect(3, 6, 7, 12, 3.5, "t"), rect(3, 6, 7, 12, 3.5),
  path("M14 6V18M21 6L14 12L21 18"),
])

// Peripherals, cameras, building systems and AV.
def("logitech", () => [
  stroke([[20, 7], [16.5, 3.5], [7.5, 3.5], [3.5, 7.5], [3.5, 16.5], [7.5, 20.5], [16.5, 20.5], [20.5, 16.5], [20.5, 12], [13, 12], [13, 16.5]], 0.5),
])

def("jabra", () => [
  path("M17 3.5V11A5.5 5.5 0 0 1 6 11"),
  dotEl(4, 21, 1), dotEl(8, 21, 1), dotEl(12, 21, 1),
  path("M16 21H20"),
])

def("axis", () => {
  const triangle = outline([[12, 3.5], [21, 20.5], [3, 20.5]], 0.5)
  const facet = outline([[7, 13], [12.5, 13], [16.5, 20.5], [3, 20.5]], 0.25)
  return [path(facet, "t"), path(triangle), path("M7 13H12.5L16.5 20.5")]
})

def("hikvision", () => [
  path("M4 20.5L8 3.5M16 20.5L20 3.5M6 12H18"),
])

def("dahua", () => [
  path(d([arc([10.5, 13], 7.5, 45, -285)])),
  path("M20 3.5L15.5 17.5"),
])

def("reolink", () => [
  // Open camera-shaped R: its hood is separate from the diagonal mounting arm.
  path("M5 20.5V3.5H13.5A5 5 0 0 1 16.5 12.5M5 12H9.5L20 20.5"),
])

def("honeywell", () => [
  path("M5.5 3.5V20.5M18.5 3.5V20.5M5.5 12H18.5M3 3.5H8M16 3.5H21M3 20.5H8M16 20.5H21"),
])

def("bosch", () => [
  circle(12, 12, 9),
  path("M7.5 6.5V17.5M16.5 6.5V17.5M7.5 9.5H16.5M7.5 14.5H16.5"),
])

def("sony", () => [
  path("M18.5 6V3.5M18.5 5.5A11 11 0 0 0 9 3.5A4.25 4.25 0 0 0 8 11.5L15.5 14A3.5 3.5 0 0 1 15 20.5A11 11 0 0 1 5.5 18.5M5.5 17V20.5"),
])

def("philips", () => {
  const shield = "M3.5 3.5H20.5V12.5A9.5 9.5 0 0 1 12 21.5A9.5 9.5 0 0 1 3.5 12.5Z"
  return [path(shield, "t"), path(shield),
    path("M6.5 13A5 5 0 0 1 12 13A5 5 0 0 0 17.5 13M7.5 16.5A4 4 0 0 1 12 16.5A4 4 0 0 0 16.5 16.5"),
    path("M8 6V9M6.5 7.5H9.5M15.5 6V9M14 7.5H17"),
  ]
})

def("crestron", () => [
  // Rotating openings keep the cyclone symbol distinct from an ordinary G.
  path(d([
    arc([12, 12], 9, 40, 320),
    arc([12, 12], 6, 160, 440),
    arc([12, 12], 3, 280, 560),
  ])),
])

def("sonos", () => [
  path("M18.5 6A10 10 0 0 0 9 3.5A4.5 4.5 0 0 0 9 12H15A4.5 4.5 0 0 1 15 20.5A10 10 0 0 1 5.5 18"),
  path("M5.5 7.5H10M14 16.5H18.5"),
])

def("yamaha", () => {
  const fork = [line([10, 6], [10, 8]), arc([12, 8], 2, -90, -270), line([14, 8], [14, 6]), line([12, 10], [12, 14])]
  return [circle(12, 12, 9), path([0, 120, 240].map((angle) => d(rotated(fork, angle))).join(""))]
})
