// Text editing: the marks of a rich text toolbar. Letters are drawn glyphs, never text: `bold`
// is a heavy outline as brand letters are, the rest single strokes. Paragraph glyphs
// share one measure of four rows (4–20) so alignment and indent read as a family.
import { arc, circle, cut, d, dotEl, line, nearPrims, path, pl, poly, polar, rect, rrect, tinted, V } from "../lib.mjs"

export const icons = {}
const def = (name, fn) => (icons[name] = fn)

const ROWS = [5.25, 9.75, 14.25, 18.75]
/** Four rows, the long ones first, each [start, end] on x. */
const rows = (long, short) => ROWS.map((y, i) => {
  const [x0, x1] = i % 2 ? short : long
  return path(`M${x0} ${y}H${x1}`)
})

def("bold", () => {
  // A heavy letter in outline, with its counters as short bars, so it stays heavy without tint.
  const b = "M6 4H13.25A3.9 3.9 0 0 1 15.75 11.1A4.6 4.6 0 0 1 14 20H6Z"
  return [path(b, "t"), path(b), path("M10 8H13"), path("M10 15.75H13.75")]
})
def("underline", () => [path("M7 3.5V11A5 5 0 0 0 17 11V3.5"), path("M5 20.5H19")])
def("strikethrough", () => [
  // The S breaks where the rule crosses it, 3 units clear on each side.
  path(d([arc([11.75, 7.75], 4, 55, -105)])),
  path(d([arc([12.25, 16.25], 4, 235, 75)])),
  path("M4 12H20"),
])
def("heading", () => [path("M6.5 4.5V19.5"), path("M17.5 4.5V19.5"), path("M6.5 12H17.5")])
// Quotation marks: square blocks with 45° tails, so the pair never reads as the digits 66 or 99.
def("quote", () => {
  const mark = (x) => d(poly([[x, 7.25], [x + 6.5, 7.25], [x + 6.5, 13], [x + 2.25, 17.25], [x + 2.25, 13.5], [x, 13.5]], [1.25, 1.25, 1, 0.5, 0, 1.25]), true)
  return [path(mark(3.5) + mark(14), "t"), path(mark(3.5)), path(mark(14))]
})

def("align-start", () => rows([4, 20], [4, 13.5]))
def("align-center", () => rows([4, 20], [7.25, 16.75]))
def("align-end", () => rows([4, 20], [10.5, 20]))

const listRows = () => [6.5, 12, 17.5].map((y) => path(`M11.5 ${y}H20.5`))
def("list-ordered", () => [
  path("M4 5.75L6 4.5V10"),
  path("M3.75 15.25A2 2 0 1 1 7.25 16.5L3.75 19.75H7.75"),
  ...listRows(),
])
def("list-check", () => [
  path("M3.5 6.5L5 8L8 5"),
  path("M3.5 17.5L5 19L8 16"),
  ...listRows(),
])

const indentRows = () => [path("M4 5.25H20"), path("M12 9.75H20"), path("M12 14.25H20"), path("M4 18.75H20")]
def("indent", () => [...indentRows(), path("M4.5 8.75L7.75 12L4.5 15.25")])
def("outdent", () => [...indentRows(), path("M7.75 8.75L4.5 12L7.75 15.25")])

// Highlighter: a broad marker on the 45° axis of `edit`, chisel tip down, on its ink line.
def("highlighter", () => {
  const U = V.norm([1, -1])
  const N = V.norm([1, 1])
  const P = (u, v) => V.add([12, 10.25], V.add(V.mul(U, u), V.mul(N, v)))
  const body = poly([P(-3.5, -3.5), P(9, -3.5), P(9, 3.5), P(-3.5, 3.5), P(-7, 1.25), P(-7, -1.25)], [0.75, 2, 2, 0.75, 0.5, 0.5])
  return [...tinted(body), path(d([line(P(-3.5, -3.5), P(-3.5, 3.5))])), path("M3.5 20.75H13.5")]
})

// Table with a row to add: `table`'s frame knocked out 3 units around the add modifier.
def("table-plus", () => {
  const plus = [line([17.75, 15], [17.75, 20.5]), line([15, 17.75], [20.5, 17.75])]
  const clear = nearPrims(plus, 3)
  const grid = [line([3, 9.5], [21, 9.5]), line([3, 14.75], [21, 14.75]), line([9.5, 9.5], [9.5, 20])]
  return [
    path("M5.5 4H18.5A2.5 2.5 0 0 1 21 6.5V9.5H3V6.5A2.5 2.5 0 0 1 5.5 4Z", "t"),
    path(d(cut(rrect(3, 4, 18, 16, 2.5), clear))),
    path(d(cut(grid, clear))),
    path(d([plus[0]])),
    path(d([plus[1]])),
  ]
})

// Slash command: the key a command menu opens from.
def("slash-command", () => [rect(3.5, 3.5, 17, 17, 2.5, "t"), rect(3.5, 3.5, 17, 17, 2.5), path("M14.25 7.5L9.75 16.5")])

// Text: the text tool's serifed T, as in `file-font`. `file-text` is the document.
def("text", () => [path("M5 7V4.5H19V7"), path("M12 4.5V19.5"), path("M9 19.5H15")])

/**
 * A point on the 45° tool axis of `edit` and `brush`: `u` runs along the handle towards the
 * top right, `v` across it towards the bottom right. Shared by the image-editing tools.
 */
export const toolAxis = (origin, k = 1) => {
  const U = V.norm([1, -1])
  const N = V.norm([1, 1])
  return (u, v) => V.add(origin, V.add(V.mul(U, u * k), V.mul(N, v * k)))
}
/** Round brush on the tool axis: the bristles (tinted) and the handle, scaled by `k`. */
export const brushParts = (origin = [11.25, 12.75], k = 1) => {
  const P = toolAxis(origin, k)
  const f = (p) => `${+p[0].toFixed(2)} ${+p[1].toFixed(2)}`
  const r = +(9 * k).toFixed(2)
  const handle = pl([P(1, -1.75), P(11.5, -1.75), P(11.5, 1.75), P(1, 1.75)], [0, 1.75 * k, 1.75 * k, 0])
  const bristles = `M${f(P(1, -3.25))}L${f(P(1, 3.25))}A${r} ${r} 0 0 1 ${f(P(-9.5, 0))}A${r} ${r} 0 0 1 ${f(P(1, -3.25))}Z`
  return { bristles, handle }
}
// Brush: a round brush on the 45° axis of `edit`, the bristles carrying the tint.
def("brush", () => {
  const { bristles, handle } = brushParts()
  return [path(bristles, "t"), path(bristles), path(d(handle))]
})

// Replace: the old tile, reduced to its corners, turns into the new one.
def("replace", () => {
  const corners = (x, y, s, a) => {
    const e = s - a
    return [`M${x} ${y + a}V${y + 1}A1 1 0 0 1 ${x + 1} ${y}H${x + a}`, `M${x + e} ${y}H${x + s - 1}A1 1 0 0 1 ${x + s} ${y + 1}V${y + a}`, `M${x + s} ${y + e}V${y + s - 1}A1 1 0 0 1 ${x + s - 1} ${y + s}H${x + e}`, `M${x + a} ${y + s}H${x + 1}A1 1 0 0 1 ${x} ${y + s - 1}V${y + e}`].join("")
  }
  return [
    rect(13.5, 13.5, 7, 7, 1.5, "t"),
    path(corners(3.5, 3.5, 7, 2.25)),
    rect(13.5, 13.5, 7, 7, 1.5),
    path("M13.5 6H15A2 2 0 0 1 17 8V10.5"),
    path("M14.5 8L17 10.5L19.5 8"),
  ]
})

// Regex: the dot and star of "any characters".
def("regex", () => {
  const c = [14.75, 9.75]
  const r = 5.25
  return [...[0, 60, 120].map((a) => path(d([line(polar(c[0], c[1], r, a), polar(c[0], c[1], r, a + 180))]))), dotEl(6.5, 17.5, 1.6)]
})

// Letter case: a capital beside a lower-case letter.
def("case-sensitive", () => [
  path("M2.75 19L7.75 5.5L12.75 19"),
  path("M4.75 14.5H10.75"),
  circle(17.75, 15.5, 3.5),
  path("M21.25 11.5V19"),
])
// Whole word: two letters held in the bracket that bounds a word.
def("whole-word", () => [
  circle(7.5, 9.5, 3),
  path("M10.5 6.5V12.5"),
  path("M13.5 3.75V12.5"),
  circle(16.5, 9.5, 3),
  path(d(pl([[3.5, 16.25], [3.5, 19.75], [20.5, 19.75], [20.5, 16.25]], [0, 1, 1, 0]))),
])

// Fold and unfold: arrows closing on or leaving a rule. The rule keeps `unfold` apart from
// `chevrons-up-down`.
def("fold", () => [path("M4 12H20"), path("M12 3V9"), path("M9 6L12 9L15 6"), path("M12 21V15"), path("M9 18L12 15L15 18")])
def("unfold", () => [path("M4 12H20"), path("M12 9V3"), path("M9 6L12 3L15 6"), path("M12 15V21"), path("M9 18L12 21L15 18")])
// Collapse all: a stack of sections with the minus on the front one.
def("collapse-all", () => [
  rect(3.5, 7.5, 13, 13, 2, "t"),
  rect(3.5, 7.5, 13, 13, 2),
  path("M7.5 7.5V5.5A2 2 0 0 1 9.5 3.5H18.5A2 2 0 0 1 20.5 5.5V14.5A2 2 0 0 1 18.5 16.5H16.5"),
  path("M7.25 14H12.75"),
])
