import { angleOf, arc, circle, cut, d, dotEl, ellipse, intersect, line, move, nearPrims, path, pl, poly, rect, rot, tinted, V } from "../lib.mjs"

// Original, monochrome adaptations for identifying external services. These use the
// shared grid and circular geometry rather than importing third-party SVG artwork.
export const icons = {}
const def = (name, fn) => (icons[name] = fn)
const outline = (points, radius = 0.75) => d(poly(points, radius), true)
/** The straight run from circle 1 to circle 2 (s = 1 travels clockwise, -1 counter-clockwise). */
const tangent = (c1, r1, s1, c2, r2, s2) => {
  const D = V.sub(c2, c1)
  const phi = Math.atan2(D[1], D[0])
  const beta = Math.acos((r1 * s1 - r2 * s2) / V.len(D))
  for (const b of [beta, -beta]) {
    const n = [Math.cos(phi + b), Math.sin(phi + b)]
    if (V.dot(D, [-n[1], n[0]]) <= 0) continue
    const p = V.add(c1, V.mul(n, r1 * s1))
    const q = V.add(c2, V.mul(n, r2 * s2))
    return { p, q, a: angleOf(c1, p), b: angleOf(c2, q) }
  }
}
/** An arc from angle a0 to a1, unwrapped to run clockwise (s = 1) or counter-clockwise (s = -1). */
const sweep = (c, r, a0, a1, s) => {
  while (s > 0 && a1 < a0) a1 += 360
  while (s < 0 && a1 > a0) a1 -= 360
  return arc(c, r, a0, a1)
}

def("google", () => [
  path(d([arc([12, 12], 8.5, 45, -270)])),
  path("M20.5 12H12.5"),
])

def("microsoft", () => [
  // Four square-cornered tiles with the logo's tight gutter.
  rect(13.5, 3.5, 7, 7, 0, "t"),
  ...[[3.5, 3.5], [13.5, 3.5], [3.5, 13.5], [13.5, 13.5]].map(([x, y]) => rect(x, y, 7, 7)),
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

def("meta", () => {
  // Meta's loop is not a symmetric infinity: the left loop is narrow, leaning on a long
  // curved outer side to a tight crown; the right loop is broad, with a near-vertical side.
  const side = [11.5, 13.5], lt = [8.42, 9.25], lb = [5.75, 15.2], rt = [16, 10.75], rb = [18.5, 15.2]
  const down = tangent(lt, 2.75, 1, rb, 2, -1)
  const up = tangent(rt, 4.5, -1, lb, 2, 1)
  const at = (c) => angleOf(side, c)
  return [path(d(move([
    line(down.p, down.q),
    sweep(rb, 2, down.b, 90, -1), line([20.5, 15.2], [20.5, 10.75]),
    sweep(rt, 4.5, 90, up.a, -1), line(up.p, up.q),
    sweep(lb, 2, up.b, at(lb), 1), sweep(side, 8, at(lb), at(lt), 1),
    sweep(lt, 2.75, at(lt), down.a, 1),
  ], 0, 0.25), true))]
})

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

def("reddit", () => {
  // Snoo: the wide head with a round ear on each upper side, and the antenna bending out
  // to its ball.
  const head = "M20 14A8 6 0 1 1 4 14A8 6 0 1 1 20 14Z"
  return [
    path("M12 8L14 3.5H18.5"),
    circle(20, 3.5, 1.5),
    path(head, "t"), path(head),
    dotEl(4.25, 9, 1.5),
    dotEl(19.75, 9, 1.5),
    dotEl(8.5, 12.5),
    dotEl(15.5, 12.5),
    path("M9 16.5A5 5 0 0 0 15 16.5"),
  ]
})

def("discord", () => {
  // Clyde: the brow steps down between two raised corners, the cheeks bow out to two
  // lobes, and the chin between them sags in a shallow smile. Oval eyes.
  const body = outline([
    [6, 6.5], [9.5, 5.25], [10.25, 6.5], [13.75, 6.5], [14.5, 5.25], [18, 6.5], [20.1, 10.75],
    [21, 16], [16.5, 19.25], [15.5, 17], [12, 17.75], [8.5, 17], [7.5, 19.25], [3, 16], [3.9, 10.75],
  ], [2, 0.5, 0.5, 0.5, 0.5, 2, 8, 2, 1, 0.5, 8, 0.5, 1, 2, 8])
  return [path(body, "t"), path(body), ellipse(9.25, 12.5, 1.4, 1.65, "d"), ellipse(14.75, 12.5, 1.4, 1.65, "d")]
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
  // The ghost: a round head, small arms flaring from its sides, a skirt sweeping out to
  // the hem corners and a gently wavy hem.
  const half = [[17.25, 4.25], [17.25, 10], [20, 11.5], [16.75, 12.75], [18, 15], [21, 16.75], [18, 18], [17.5, 18.75]]
  const radii = [5.25, 0.5, 1, 0.5, 3, 0.75, 0.5, 0.5]
  const points = [...half, [12, 20], ...half.slice().reverse().map(([x, y]) => [24 - x, y])]
  const ghost = outline(points, [...radii, 6, ...radii.slice().reverse()])
  return [path(ghost, "t"), path(ghost)]
})

def("threads", () => {
  // The outer stroke runs from the top right round a tall loop and curls over the bump into
  // the bowl's bar. The inner hook drops its stem onto that bar.
  const top = [12, 11.1], bottom = [12, 12.9], bump = [17.08, 15.25], r = 8.1
  const loop = [
    arc(top, r, 55, -90),
    line([3.9, 11.1], [3.9, 12.9]),
    arc(bottom, r, 270, 114.8),
    arc(bump, 2.5, 114.8, 0),
    line([17.08, 12.75], [10, 12.75]),
    arc([10, 15.38], 2.63, 0, -180),
    line([10, 18], [12, 18]),
    arc([12, 14.25], 3.75, 180, 125),
  ]
  const hook = [arc([12.5, 10], 3, 300, 450), line([15.5, 10], [15.5, 12.75])]
  return [path(d(move(loop, 0.25, 0))), path(d(move(hook, 0.25, 0)))]
})

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
  // The 2022 tanuki: rounded ears, a flat brow between them, cheeks that round off into
  // straight jaws meeting at the chin. No facet lines.
  const fox = outline([
    [2.5, 9.5], [6, 2.25], [8.5, 8], [15.5, 8], [18, 2.25], [21.5, 9.5], [20, 15.25], [12, 20.5], [4, 15.25],
  ], [1, 1, 0.75, 0.75, 1, 1, 3, 1.25, 3])
  return [path(fox, "t"), path(fox)]
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

def("notion", () => {
  // The block seen from the upper left: a top and a side face (tinted) behind the front
  // face, which carries a serif N.
  const A = [3.5, 5.25], B = [16.25, 3.5], C = [20.5, 6.25], D = [20.5, 20.5], E = [7, 20.5], F = [3.5, 17.5], G = [7, 8]
  const faces = outline([A, B, C, G, E, F], [1, 1, 1, 0, 1, 1])
  return [
    path(faces, "t"),
    path(outline([A, B, C, D, E, F], 1)),
    // The front face's edges stop inside the rounded outline corners they run into.
    path(d(pl([[7, 19.75], G, V.add(G, V.mul(V.sub(C, G), 0.94))]))),
    path("M10 10.5H12.25L16.75 17.5V10.5M15.25 10.5H18M11 10.5V17.5M9.75 17.5H12.25"),
  ]
})

def("dropbox", () => {
  // Four diamonds in two rows, and a fifth tucked into the notch below them.
  const diamond = (x, y) => outline([[x - 4.5, y], [x, y - 2.75], [x + 4.5, y], [x, y + 2.75]], 0)
  const diamonds = [[7.5, 6], [16.5, 6], [7.5, 11.5], [16.5, 11.5], [12, 17.75]].map(([x, y]) => diamond(x, y))
  return [path(diamonds[0], "t"), ...diamonds.map((shape) => path(shape))]
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
