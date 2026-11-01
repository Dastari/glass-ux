// Media controls. `play` lends its triangle to the skip and speed glyphs, the window frame
// carries the screen glyphs, and the speaker keeps one position across the volume levels so
// nothing jumps when a control changes icon. Media keeps its physical axis in RTL.
import { arc, band, circle, cut, d, disk, dotEl, line, mirrorX, nearPrims, path, poly, rect, rrect, tinted } from "../lib.mjs"
import { slashed, slashPath } from "./actions.mjs"
import { wifiArcs } from "./rmm.mjs"
import { rotateArc, rotateArcBack } from "./transforms.mjs"

export const icons = {}
const def = (name, fn) => (icons[name] = fn)

// ── volume ────────────────────────────────────────────────────────────────────
const speaker = () => poly([[2.5, 9.5], [6.5, 9.5], [11.5, 5], [11.5, 19], [6.5, 14.5], [2.5, 14.5]], [1.25, 0.75, 1, 1, 0.75, 1.25])
const WAVE_C = [10.75, 12]
const wave = (r) => path(d([arc(WAVE_C, r, 45, 135)]))
def("volume", () => [...tinted(speaker()), wave(6), wave(10)])
def("volume-low", () => [...tinted(speaker()), wave(6)])
def("volume-off", () => [path(d(slashed([...speaker(), arc(WAVE_C, 6, 45, 135)], 2.5))), slashPath()])

// ── transport ─────────────────────────────────────────────────────────────────
const triangle = (x0, x1) => poly([[x0, 5], [x1, 12], [x0, 19]], [2, 1.75, 2])
def("skip-forward", () => [...tinted(triangle(5, 15.75)), path("M19 5.5V18.5")])
def("skip-back", () => [...tinted(mirrorX(triangle(5, 15.75))), path("M5 5.5V18.5")])

// Seek: the rotate ring around a double chevron. The step is the application's to state.
def("seek-forward", () => [...rotateArc(), path("M9 9.75L11.25 12L9 14.25"), path("M12.5 9.75L14.75 12L12.5 14.25")])
def("seek-back", () => [...rotateArcBack(), path("M15 9.75L12.75 12L15 14.25"), path("M11.5 9.75L9.25 12L11.5 14.25")])

const LOOP_TOP = "M4 12.5V10.5A3.5 3.5 0 0 1 7.5 7H20"
const LOOP_BOTTOM = "M20 11.5V13.5A3.5 3.5 0 0 1 16.5 17H4"
const loop = () => [path(LOOP_TOP), path("M16.75 3.75L20 7L16.75 10.25"), path(LOOP_BOTTOM), path("M7.25 13.75L4 17L7.25 20.25")]
def("repeat", loop)
def("repeat-one", () => [...loop(), path("M10.75 10.75L12 9.75V14.25")])
// Shuffle: two strands; the one rising across breaks 3 units either side of the other.
def("shuffle", () => {
  const over = [...poly([[3, 7.25], [7.5, 7.25], [17, 16.75], [20.5, 16.75]], [0, 2, 2, 0], false)]
  const under = cut(poly([[3, 16.75], [7.5, 16.75], [17, 7.25], [20.5, 7.25]], [0, 2, 2, 0], false), band([7.5, 7.25], [17, 16.75], 3))
  return [path(d(over)), path(d(under)), path("M17.25 4L20.5 7.25L17.25 10.5"), path("M17.25 13.5L20.5 16.75L17.25 20")]
})
// Playback speed: `play` with the lines of its motion trailing behind.
def("playback-speed", () => [...tinted(poly([[11, 5], [22, 12], [11, 19]], [2, 1.75, 2])), path("M4.5 7.5H7"), path("M3.5 12H7"), path("M4.5 16.5H7")])

// ── sound ─────────────────────────────────────────────────────────────────────
def("music", () => {
  const head = (x, y) => `M${x + 2.75} ${y}A2.75 2.75 0 1 1 ${x - 2.75} ${y}A2.75 2.75 0 1 1 ${x + 2.75} ${y}Z`
  return [path(head(6.75, 18) + head(17.75, 16), "t"), circle(6.75, 18, 2.75), circle(17.75, 16, 2.75), path("M9.5 18V6A2 2 0 0 1 11.5 4H18.5A2 2 0 0 1 20.5 6V16"), path("M9.5 9H20.5")]
})
def("headphones", () => {
  const cup = (x) => `M${x + 1.5} 13.5H${x + 3}A1.5 1.5 0 0 1 ${x + 4.5} 15V19A1.5 1.5 0 0 1 ${x + 3} 20.5H${x + 1.5}A1.5 1.5 0 0 1 ${x} 19V15A1.5 1.5 0 0 1 ${x + 1.5} 13.5Z`
  return [path(cup(3.5) + cup(16), "t"), path("M3.5 16V12A8.5 8.5 0 0 1 20.5 12V16"), rect(3.5, 13.5, 4.5, 7, 1.5), rect(16, 13.5, 4.5, 7, 1.5)]
})

// ── video and screens ─────────────────────────────────────────────────────────
const camBody = () => rrect(2.5, 6, 13.5, 12, 2.5)
const camLens = () => poly([[16, 10.5], [21.5, 7.5], [21.5, 16.5], [16, 13.5]], [0.75, 0.75, 0.75, 0.75])
def("video", () => [...tinted(camBody()), path(d(camLens(), true))])
def("video-off", () => [path(d(slashed(camBody(), 2.5))), path(d(slashed(camLens(), 2.5))), slashPath()])

const CAP = [2.5, 5, 19, 14]
const capLines = [line([6.25, 11.25], [11, 11.25]), line([14, 11.25], [17.75, 11.25]), line([6.25, 15], [9, 15]), line([12, 15], [17.75, 15])]
def("captions", () => [rect(...CAP, 2.5, "t"), rect(...CAP, 2.5), ...capLines.map((l) => path(d([l])))])
def("captions-off", () => {
  const kept = slashed(capLines, 2.5).filter((s) => Math.hypot(s.q[0] - s.p[0], s.q[1] - s.p[1]) >= 1.5)
  return [path(d(slashed(rrect(...CAP, 2.5), 2.5))), ...kept.map((l) => path(d([l]))), slashPath()]
})

// Cast: `wifi`'s arcs and dot rising into a screen from under its foot. `sessions` owns the
// corner arcs of the Google Cast mark, and the frame opens around this one.
def("cast", () => {
  const arcs = wifiArcs([12, 19.75], [4, 8])
  const frame = cut(rrect(3, 3.25, 18, 13, 2.5), disk([12, 19.75], 7.5))
  return [rect(3, 3.25, 18, 13, 2.5, "t"), path(d(frame)), ...arcs.map((a) => path(d([a]))), dotEl(12, 19.75, 1.3)]
})
// Screen share: the frame opens around a triangle rising from its foot.
def("screen-share", () => {
  const tri = poly([[12, 13], [17.5, 20.5], [6.5, 20.5]], [1, 1, 1])
  const frame = cut(rrect(3, 3.5, 18, 13.5, 2.5), nearPrims(tri, 3))
  return [...tinted(tri), path(d(frame))]
})
const FRAME = [3, 4, 18, 16]
def("picture-in-picture", () => [rect(11, 11.5, 7, 5.5, 1.5, "t"), rect(...FRAME, 2.5), rect(11, 11.5, 7, 5.5, 1.5)])
// Mini player: a small player with `play` on it, the page it left behind knocked out.
def("mini-player", () => {
  const player = rrect(9.5, 10, 12, 10, 2)
  const page = cut(rrect(2.5, 3.5, 17, 14.5, 2.5), nearPrims(player, 3))
  return [...tinted(player), path(d(page)), path(d(poly([[13.75, 12.25], [18, 15], [13.75, 17.75]], [0.75, 0.75, 0.75]), true))]
})
// Theater mode: the picture runs edge to edge across the frame, between two letterbox bars.
def("theater-mode", () => [
  rect(3, 8, 18, 8, 0, "t"),
  rect(...FRAME, 2.5),
  path("M3 8H21"),
  path("M3 16H21"),
])
