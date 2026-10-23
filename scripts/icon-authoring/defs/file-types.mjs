// File types: the `file` page and fold, unchanged, with the page as the tint and one emblem
// inside it. Emblems sit in the body box 7.5–16.5 × 10.5–18.5 (3 units clear of the outline
// and fold) and reuse the set's own glyphs: image mountains, play, code chevrons, the table
// grid, the terminal prompt, mail, calendar, user, lock, key and the software cube.
import { arc, circle, cut, d, dotEl, line, path, poly, rect } from "../lib.mjs"

export const icons = {}
const def = (name, fn) => (icons[name] = fn)

const PAGE = "M14 2.5H7A2.5 2.5 0 0 0 4.5 5V19A2.5 2.5 0 0 0 7 21.5H17A2.5 2.5 0 0 0 19.5 19V8Z"
const FOLD = "M14 2.5V6A2 2 0 0 0 16 8H19.5"
const page = (...emblem) => [path(PAGE, "t"), path(PAGE), path(FOLD), ...emblem]

def("file", () => page())
def("file-text", () => page(path("M8.5 12.5H15.5"), path("M8.5 16H15.5"), path("M8.5 9H10.5")))

// ── documents ─────────────────────────────────────────────────────────────────
def("file-document", () => page(rect(7.5, 10.5, 3.5, 3.5, 1), path("M14 12.25H16.5"), path("M7.5 17.25H16.5")))
def("file-pdf", () => page(rect(7.5, 10.5, 9, 4.5, 1), path("M7.5 18H16.5")))
def("file-spreadsheet", () => page(rect(7.5, 11, 9, 7.5, 2), path("M7.5 14.75H16.5"), path("M12 11V18.5")))
def("file-presentation", () => page(rect(7.5, 10.5, 9, 5.75, 1.5), path("M12 16.25V18.75")))
def("file-ebook", () => page(
  path("M12 13.5A2 2 0 0 0 10 11.5H8.5A1 1 0 0 0 7.5 12.5V15.5A1 1 0 0 0 8.5 16.5H10A2 2 0 0 1 12 18.5V13.5"),
  path("M12 13.5A2 2 0 0 1 14 11.5H15.5A1 1 0 0 1 16.5 12.5V15.5A1 1 0 0 1 15.5 16.5H14A2 2 0 0 0 12 18.5"),
))

// ── media ─────────────────────────────────────────────────────────────────────
def("file-image", () => page(path("M7.5 18L11 14.5L14.5 18"), path("M13.25 16.75L14.75 15.25L16.5 17"), dotEl(14.25, 11.75, 1.25)))
// A curve between two square anchor nodes; the curve stops at each node's outline.
def("file-vector", () => {
  const nodes = [[9, 11], [15, 17]]
  const inNode = (pt) => nodes.some(([x, y]) => Math.abs(pt[0] - x) < 1.25 && Math.abs(pt[1] - y) < 1.25)
  return page(path(d(cut([arc([9, 17], 6, 0, 90)], inNode))), ...nodes.map(([x, y]) => rect(x - 1.25, y - 1.25, 2.5, 2.5, 1)))
})
def("file-audio", () => page(circle(10.25, 16.25, 2.25), path("M12.5 16.25V10.5L15.5 12")))
def("file-video", () => page(path(d(poly([[9.5, 11], [15.75, 14.75], [9.5, 18.5]], 1.25), true))))
def("file-font", () => page(path("M8.5 12.25V11H15.5V12.25"), path("M12 11V18"), path("M10.5 18H13.5")))
// A tetrahedron: the outline of a solid and its one visible front edge.
def("file-model", () => page(path(d(poly([[12, 10.5], [16.5, 16.25], [11, 18.5], [7.5, 16]], 1), true)), path("M12 11.75L11.1 17.6")))

// ── code and data ─────────────────────────────────────────────────────────────
def("file-code", () => page(path("M10.25 12L7.75 14.5L10.25 17"), path("M13.75 12L16.25 14.5L13.75 17")))
def("file-script", () => page(path("M8.5 12L11 14.5L8.5 17"), path("M13 17H16")))
const brace = (m) => {
  const x = (v) => (m ? 24 - v : v)
  return path(d(poly([[x(10.75), 10.75], [x(9.5), 10.75], [x(9.5), 13.75], [x(8.5), 14.75], [x(9.5), 15.75], [x(9.5), 18.25], [x(10.75), 18.25]], [0, 1, 0.75, 0, 0.75, 1, 0], false)))
}
def("file-data", () => page(brace(false), brace(true)))
def("file-database", () => page(
  path("M7.75 11.75A4.25 1.5 0 0 1 16.25 11.75A4.25 1.5 0 0 1 7.75 11.75Z"),
  path("M7.75 11.75V17A4.25 1.5 0 0 0 16.25 17V11.75"),
))
def("file-archive", () => page(path("M9 5.5H10.5"), path("M10.5 7.25H12"), path("M9 9H10.5"), rect(8.5, 12, 4, 5.5, 1)))

// ── software and storage ──────────────────────────────────────────────────────
def("file-executable", () => {
  const r = 3.75
  const c = [12, 14.75]
  const v = (a) => [c[0] + r * Math.sin((a * Math.PI) / 180), c[1] - r * Math.cos((a * Math.PI) / 180)]
  const hex = poly([0, 60, 120, 180, 240, 300].map(v), 0.75)
  return page(path(d(hex, true)), path(d([line(v(300), c), line(c, v(60))])), path(d([line(c, v(180))])))
})
def("file-disk-image", () => page(circle(12, 14.75, 3.75), dotEl(12, 14.75, 1)))

// ── messages, people and security ─────────────────────────────────────────────
def("file-email", () => page(rect(7.5, 11, 9, 6.5, 1.5), path("M9.75 13.25L12 14.75L14.25 13.25")))
def("file-calendar", () => page(rect(7.5, 12, 9, 6.5, 1.5), path("M7.5 15H16.5"), path("M10 11V13"), path("M14 11V13")))
def("file-contact", () => page(circle(12, 12.25, 1.75), path("M8.5 18.5A3.7 3.7 0 0 1 15.5 18.5")))
def("file-key", () => page(circle(10, 16, 2.25), path("M11.59 14.41L15 11"), path("M14 12L15.25 13.25")))
def("file-lock", () => page(rect(8, 14, 8, 4.5, 1.5), path("M9.75 14V12.5A2.25 2.25 0 0 1 14.25 12.5V14")))
def("file-link", () => page(path("M10.75 12H10.5A3 3 0 0 0 10.5 18H10.75"), path("M13.25 12H13.5A3 3 0 0 1 13.5 18H13.25"), path("M10 15H14")))
