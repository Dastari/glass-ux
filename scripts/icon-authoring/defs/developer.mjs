// Developer tools. The git glyphs share one node (a ring of r 2.5), with the tint on the node
// that names the operation.
import { circle, d, dotEl, line, path, pl, poly, V } from "../lib.mjs"

export const icons = {}
const def = (name, fn) => (icons[name] = fn)

const NODE = 2.5
const node = (x, y) => circle(x, y, NODE)
const tintNode = (x, y) => circle(x, y, NODE, "t")

def("git-branch", () => [tintNode(17.5, 6.5), node(6.5, 5.5), node(6.5, 18.5), node(17.5, 6.5), path("M6.5 8V16"), path("M17.5 9A5.5 5.5 0 0 1 12 14.5H9.25A2.75 2.75 0 0 0 6.5 16")])
def("git-commit", () => [circle(12, 12, 4, "t"), circle(12, 12, 4), path("M2.5 12H8"), path("M16 12H21.5")])
def("git-merge", () => [tintNode(17.5, 12.5), node(6.5, 5.5), node(6.5, 18.5), node(17.5, 12.5), path("M6.5 8V16"), path("M6.5 8A4.5 4.5 0 0 0 11 12.5H15")])
def("git-pull-request", () => [
  tintNode(17.5, 18.5),
  node(6.5, 5.5),
  node(6.5, 18.5),
  node(17.5, 18.5),
  path("M6.5 8V16"),
  path("M17.5 16V9.5A3 3 0 0 0 14.5 6.5H11.5"),
  path("M14.25 3.75L11.5 6.5L14.25 9.25"),
])

// Webhook: three rings on a turn, each trailing a hook toward the next.
def("webhook", () => {
  const C = [12, 14]
  const P = (a, r) => [C[0] + r * Math.sin((a * Math.PI) / 180), C[1] - r * Math.cos((a * Math.PI) / 180)]
  const f = (p) => `${+p[0].toFixed(2)} ${+p[1].toFixed(2)}`
  const out = []
  for (const a of [0, 120, 240]) {
    const n = P(a, 8)
    out.push(circle(+n[0].toFixed(2), +n[1].toFixed(2), 2.25))
    const start = P(a, 5.75)
    const end = P(a + 104, 8)
    out.push(path(`M${f(start)}A7 7 0 0 0 ${f(end)}`))
  }
  return out
})

def("braces", () => {
  const brace = (m) => {
    const x = (v) => (m ? 24 - v : v)
    return path(d(poly([[x(9.75), 3.5], [x(7.5), 3.5], [x(7.5), 10.25], [x(5), 12], [x(7.5), 13.75], [x(7.5), 20.5], [x(9.75), 20.5]], [0, 2, 1, 0, 1, 2, 0], false)))
  }
  return [brace(false), brace(true)]
})
// Function: the hooked f of a formula bar beside its argument.
def("function", () => [
  path("M12.75 3.5H12A3 3 0 0 0 9 6.5V17.5A3 3 0 0 1 6 20.5H5.25"),
  path("M5.25 10H12.25"),
  path("M14 12.5L18.75 17.25"),
  path("M18.75 12.5L14 17.25"),
])
// Flask: a conical flask, the tint on the liquid it holds.
def("flask", () => {
  const glass = pl([[10, 3.5], [10, 9.5], [3.75, 20.5], [20.25, 20.5], [14, 9.5], [14, 3.5]], [0, 1, 1.5, 1.5, 1, 0])
  const liquid = poly([[7.3, 14.25], [16.7, 14.25], [20.25, 20.5], [3.75, 20.5]], [0, 0, 1.5, 1.5])
  return [path(d(liquid, true), "t"), path(d(glass)), path("M8 3.5H16"), path("M7.3 14.25H16.7")]
})
// Rocket: on the 45° axis, the nose at top right, fins at the tail, and one exhaust line.
def("rocket", () => {
  const U = V.norm([1, -1])
  const N = V.norm([1, 1])
  const P = (u, v) => V.add([12, 12], V.add(V.mul(U, u), V.mul(N, v)))
  const f = (p) => `${+p[0].toFixed(2)} ${+p[1].toFixed(2)}`
  const hull = `M${f(P(12, 0))}A13 13 0 0 1 ${f(P(-3, 4))}L${f(P(-3, -4))}A13 13 0 0 1 ${f(P(12, 0))}Z`
  const dot = P(4.25, 0)
  return [
    path(hull, "t"),
    path(hull),
    path(`M${f(P(-1, 3.75))}L${f(P(-5.5, 6.75))}L${f(P(-3, 4))}`.replace(/L[^L]*$/, "")),
    path(`M${f(P(-1, -3.75))}L${f(P(-5.5, -6.75))}`),
    path(d([line(P(-6.25, 0), P(-9.5, 0))])),
    dotEl(+dot[0].toFixed(2), +dot[1].toFixed(2), 1.25),
  ]
})
