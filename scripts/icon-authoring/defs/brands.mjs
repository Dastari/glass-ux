import { angleOf, arc, circle, cut, d, dotEl, intersect, line, nearPrims, path, pl, poly, rect, rot, tinted } from "../lib.mjs"

// Original, monochrome adaptations for identifying external services. These use the
// shared grid and circular geometry rather than importing third-party SVG artwork.
export const icons = {}
const def = (name, fn) => (icons[name] = fn)
const outline = (points, radius = 0.75) => d(poly(points, radius), true)

def("google", () => [
  path(d([arc([12, 12], 8.5, 45, -270)])),
  path("M20.5 12H12.5"),
])

def("microsoft", () => [
  rect(14, 3.5, 6.5, 6.5, 1.5, "t"),
  ...[[3.5, 3.5], [14, 3.5], [3.5, 14], [14, 14]].map(([x, y]) => rect(x, y, 6.5, 6.5, 1.5)),
])

def("apple", () => {
  const body = "M19.5 8A5 5 0 0 0 13.5 7.5A3 3 0 0 1 10.5 7.5A5 5 0 0 0 3.75 11.5A12 12 0 0 0 7.75 20.5A2.75 2.75 0 0 0 10.5 20.5A3 3 0 0 1 13.5 20.5A2.75 2.75 0 0 0 16.25 20.5A12 12 0 0 0 20 15.75A4.25 4.25 0 0 1 19.5 8Z"
  return [path(body, "t"), path(body), path("M12 4.5A4 4 0 0 1 15.5 2.5")]
})

def("amazon", () => {
  // The lower-case a above the smile, which ends in an up-right arrowhead.
  const tip = [20, 14.5]
  const r = 12
  const c = [tip[0] - r / Math.SQRT2, tip[1] - r / Math.SQRT2]
  return [
    circle(10.5, 9, 3.25),
    path("M13.75 5.75V12.25"),
    path(d([arc(c, r, 222, angleOf(c, tip))])),
    path("M16.75 14.5H20V17.75"),
  ]
})

def("meta", () => [
  path("M12 13.5L8.5 7.25A3 3 0 0 0 3.5 8.5A10 10 0 0 0 2.5 13A3.5 3.5 0 0 0 9 15L15 7.25A3 3 0 0 1 20 8.5A10 10 0 0 1 21 13A3.5 3.5 0 0 1 14.5 15L12 10.5"),
])

def("facebook", () => [
  // The circular badge: the f's stem runs down to meet the rim, as in the app icon.
  circle(12, 12, 9, "t"), circle(12, 12, 9),
  path("M13 20.94V10A3 3 0 0 1 16 7H16.5M9.5 12.5H16.5"),
])

def("instagram", () => [
  rect(3.5, 3.5, 17, 17, 2.5, "t"),
  rect(3.5, 3.5, 17, 17, 2.5),
  circle(12, 12, 4),
  dotEl(17.25, 6.75, 1),
])

def("whatsapp", () => {
  const body = "M6 18.5L3.5 21L4.25 16.5A8.5 8.5 0 1 1 6 18.5Z"
  return [path(body, "t"), path(body), path(d(pl([[8, 8], [8, 11.5], [12.5, 16], [16, 16]], 2))), path("M8 8H10M16 16V14")]
})

def("x", () => {
  const ribbon = outline([[4, 3.5], [8, 3.5], [20, 20.5], [16, 20.5]], 0)
  return [path(ribbon, "t"), path(ribbon), path("M20 3.5L14.5 9M9.5 15L4 20.5")]
})

def("linkedin", () => [
  rect(3.5, 3.5, 17, 17, 2.5, "t"),
  rect(3.5, 3.5, 17, 17, 2.5),
  dotEl(7.5, 7.5, 1),
  path("M7.5 12V16.5M12 16.5V10.5M12 13A2.25 2.25 0 0 1 16.5 13V16.5"),
])

def("youtube", () => [
  rect(3, 5.5, 18, 13, 2.5, "t"),
  rect(3, 5.5, 18, 13, 2.5),
  path(outline([[9.5, 8.5], [15, 12], [9.5, 15.5]], 0.75)),
])

def("tiktok", () => [
  path("M14 3.5V15.5A4.5 4.5 0 1 1 9.5 11H10.5M14 3.5A6.5 6.5 0 0 0 20.5 10"),
])

def("reddit", () => [
  path("M12 8L14 3.5H18.5"),
  circle(20, 3.5, 1.5),
  path("M20 14A8 6 0 1 1 4 14A8 6 0 1 1 20 14Z", "t"),
  path("M20 14A8 6 0 1 1 4 14A8 6 0 1 1 20 14Z"),
  dotEl(8.5, 12.5),
  dotEl(15.5, 12.5),
  path("M9 16.5A5 5 0 0 0 15 16.5"),
])

def("discord", () => {
  const body = outline([[7, 5.5], [17, 5.5], [21.25, 17.5], [17.5, 19.5], [15.5, 17], [8.5, 17], [6.5, 19.5], [2.75, 17.5]], 1)
  return [path(body, "t"), path(body), dotEl(8.5, 12, 1.5), dotEl(15.5, 12, 1.5)]
})

def("telegram", () => {
  // The paper plane inside its circular badge.
  const plane = outline([[6.25, 11.5], [17.5, 7], [15.5, 17], [11.75, 14.25], [9.5, 16.25], [9.5, 13]], 0.5)
  return [circle(12, 12, 9, "t"), circle(12, 12, 9), path(plane), path("M9.5 13L14.5 10.25")]
})

def("bluesky", () => {
  const wings = "M12 12L6.5 5A2.5 2.5 0 0 0 2.5 6.5V11A3.5 3.5 0 0 0 6 14.5A3 3 0 0 0 6 20A6 6 0 0 0 12 14.5A6 6 0 0 0 18 20A3 3 0 0 0 18 14.5A3.5 3.5 0 0 0 21.5 11V6.5A2.5 2.5 0 0 0 17.5 5L12 12Z"
  return [path(wings, "t"), path(wings)]
})

def("mastodon", () => {
  const body = "M20.5 13.5A4 4 0 0 1 16.5 17.5H8.5V21H7.5A4 4 0 0 1 3.5 17V7A4 4 0 0 1 7.5 3H16.5A4 4 0 0 1 20.5 7Z"
  return [path(body, "t"), path(body), path("M8 13.5V9A2 2 0 0 1 12 9V12M12 9A2 2 0 0 1 16 9V13.5")]
})

def("pinterest", () => [
  circle(12, 11.5, 8.5, "t"), circle(12, 11.5, 8.5),
  path("M9 21L12 8M11.5 11A3.25 3.25 0 1 0 11.5 7.5"),
])

def("snapchat", () => {
  const ghost = "M7 11V7.5A5 5 0 0 1 17 7.5V11L20.5 12.5L17.5 15.5L21 17L17 18.5L15 21L12 19.5L9 21L7 18.5L3 17L6.5 15.5L3.5 12.5Z"
  return [path(ghost, "t"), path(ghost)]
})

def("threads", () => [
  path("M18.5 7A8.5 8.5 0 0 0 3.5 12A8.5 8.5 0 0 0 20.5 12A5.5 5.5 0 0 0 11.5 9A3 3 0 1 0 16.5 11.5V9A4.5 4.5 0 0 0 9 6.5"),
])

def("twitch", () => {
  const body = outline([[4, 3.5], [21, 3.5], [21, 15], [15.5, 20.5], [11, 20.5], [7.5, 22.5], [7.5, 18.5], [4, 18.5]], 0)
  return [path(body, "t"), path(body), path("M10 8V12.5M15.5 8V12.5")]
})

def("spotify", () => [
  circle(12, 12, 9, "t"), circle(12, 12, 9),
  path("M6 8.5A20 20 0 0 1 18.5 9.5M7 12.5A16 16 0 0 1 17 13.25M8.5 16.25A12 12 0 0 1 15.5 16.75"),
])

def("github", () => {
  const cat = "M8.5 21V17.5A3 3 0 0 1 9.5 15.25H8A4.5 4.5 0 0 1 3.5 10.75V9.5A5 5 0 0 1 5 6L4.75 2.75L9 4.5A8 8 0 0 1 15 4.5L19.25 2.75L19 6A5 5 0 0 1 20.5 9.5V10.75A4.5 4.5 0 0 1 16 15.25H14.5A3 3 0 0 1 15.5 17.5V21"
  return [path(`${cat}Z`, "t"), path(cat), path("M8.5 18.5H6.5A3 3 0 0 1 3.5 15.5")]
})

def("gitlab", () => {
  const fox = outline([[3, 10], [5.25, 3.5], [8, 9], [16, 9], [18.75, 3.5], [21, 10], [18.5, 17], [12, 21], [5.5, 17]], 0.75)
  return [path("M8 9H16L12 21Z", "t"), path(fox), path("M8 9L12 21L16 9M3.5 11L12 21L20.5 11")]
})

def("bitbucket", () => {
  const bucket = outline([[3.5, 4.5], [20.5, 4.5], [18, 20], [6, 20]], 1)
  return [path(bucket, "t"), path(bucket), path(outline([[9, 10], [15, 10], [14, 15], [10, 15]], 0.75))]
})

def("slack", () => [
  rect(3, 13.5, 7, 3.5, 1.75, "t"),
  rect(3, 13.5, 7, 3.5, 1.75), rect(7, 3, 3.5, 7, 1.75),
  rect(13.5, 7, 7, 3.5, 1.75), rect(13.5, 14, 3.5, 7, 1.75),
  dotEl(4.75, 8.25, 1.5), dotEl(15.25, 4.75, 1.5), dotEl(19.25, 15.25, 1.5), dotEl(8.75, 19.25, 1.5),
])

def("figma", () => {
  const body = "M12 3H8.5A3 3 0 0 0 8.5 9A3 3 0 0 0 8.5 15A3 3 0 1 0 12 18V15H15.5A3 3 0 1 0 15.5 9A3 3 0 0 0 15.5 3Z"
  return [path("M12 9H8.5A3 3 0 0 0 8.5 15H12Z", "t"), path(body), path("M8.5 9H15.5M8.5 15H12M12 3V15")]
})

def("notion", () => [
  rect(3.5, 3.5, 17, 17, 2.5, "t"), rect(3.5, 3.5, 17, 17, 2.5),
  path("M8 16V8L16 16V8"),
])

def("dropbox", () => {
  const diamonds = [
    [[3, 7], [7.5, 4], [12, 7], [7.5, 10]],
    [[12, 7], [16.5, 4], [21, 7], [16.5, 10]],
    [[3, 13], [7.5, 10], [12, 13], [7.5, 16]],
    [[12, 13], [16.5, 10], [21, 13], [16.5, 16]],
  ].map((points) => outline(points, 0))
  return [path(diamonds[0], "t"), ...diamonds.map((shape) => path(shape)), path("M7.5 19L12 22L16.5 19")]
})

def("zoom", () => [
  // The app icon: a rounded square holding the video camera.
  rect(3.5, 3.5, 17, 17, 2.5, "t"), rect(3.5, 3.5, 17, 17, 2.5),
  rect(6.5, 9, 7, 6, 1.5),
  path(outline([[13.5, 11], [17.5, 9], [17.5, 15], [13.5, 13]], 0.5)),
])

def("adobe", () => {
  // The square mark: two tall flanking triangles, and between them a smaller A wedge
  // whose right leg reaches the base and whose left leg ends in a horizontal crossbar.
  const flanks = [[[3, 4], [9.75, 4], [3, 20]], [[21, 4], [14.25, 4], [21, 20]]]
    .map((points) => outline(points, [1, 0.5, 0.5])).join("")
  return [path(flanks, "t"), path(flanks), path("M16.25 20L12 9.75L9 16.75H13.5")]
})

def("docker", () => [
  path("M3 12H18A4 4 0 0 0 21.5 9L22 13H19A10 10 0 0 1 9.5 20A6.5 6.5 0 0 1 3 13.5Z", "t"),
  path("M3 12H18A4 4 0 0 0 21.5 9L22 13H19A10 10 0 0 1 9.5 20A6.5 6.5 0 0 1 3 13.5Z"),
  path("M4 12V8H16V12M8 8V12M12 12V4H16V8"),
])

def("npm", () => {
  // The square mark: the block n, its counter set right of centre.
  const n = outline([[3.5, 19.5], [3.5, 5.5], [20.5, 5.5], [20.5, 19.5], [15.5, 19.5], [15.5, 10], [11, 10], [11, 19.5]], 1)
  return [path(n, "t"), path(n)]
})

def("vercel", () => tinted(poly([[12, 3.5], [21, 20], [3, 20]], 0.75)))

def("cloudflare", () => {
  // One flat-based silhouette with two humps: the large front cloud, its slanted right
  // edge standing on the shared baseline, and a smaller cloud tucked behind its shoulder.
  // The rear hump is knocked out 3 units where it passes behind the front cloud.
  const base = 17.25
  const lobe = [5, 14.5], dome = [10, 12.25], foot = [13.25, base], rear = [17.5, 13.75]
  const [join] = intersect(lobe, 2.75, dome, 4.75)
  const after = (a, from) => (a < from ? a + 360 : a)
  const shoulder = [dome[0] + 4.75 * Math.sin(110 * Math.PI / 180), dome[1] - 4.75 * Math.cos(110 * Math.PI / 180)]
  const front = [
    arc(lobe, 2.75, 180, after(angleOf(lobe, join), 180)),
    arc(dome, 4.75, angleOf(dome, join), 470),
    line(shoulder, foot),
  ]
  const hump = cut([arc(rear, 3.5, 270, 540)], nearPrims(front, 3))
  return [
    path(d([line(foot, [lobe[0], base]), ...front], true), "t"),
    path(d(front)),
    path(d([...hump, line([rear[0], base], [lobe[0], base])])),
  ]
})

def("stripe", () => [
  // The app icon: a rounded square holding the slanted S.
  rect(3.5, 3.5, 17, 17, 2.5, "t"), rect(3.5, 3.5, 17, 17, 2.5),
  path("M15.5 8.5A6 6 0 0 0 10.75 7.5A2.25 2.25 0 0 0 9.75 11.5L14.25 12.75A2 2 0 0 1 13.25 16.5A6 6 0 0 1 8.5 15.5"),
])

def("openai", () => {
  const arm = pl([[9, 5.5], [12, 3.5], [16.5, 6], [16.5, 11], [12, 13.5]], 2)
  const arms = Array.from({ length: 6 }, (_, i) => arm.map((segment) => segment.k === "l"
    ? line(rot(segment.p, [12, 12], i * 60), rot(segment.q, [12, 12], i * 60))
    : arc(rot(segment.c, [12, 12], i * 60), segment.r, segment.a0 + i * 60, segment.a1 + i * 60)))
  return [path(arms.map((segments) => d(segments)).join(""))]
})

def("anthropic", () => [
  path("M3.5 20.5L10 3.5L16.5 20.5M6 14H14M15.5 3.5L22 20.5"),
])
