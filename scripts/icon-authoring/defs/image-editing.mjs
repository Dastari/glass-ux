// Image editing: the tools, adjustments and views of a photo or image editor, named as general
// image-editing vocabulary so a CMS, a file manager or an avatar editor can use them too.
//
// Families share parts, exported for later sets:
//   - the picture frame of `image` (FRAME) for the image and view glyphs, knocked out 3 units
//     around an overlay badge (`image-info`, `image-metadata`, `fill-edges`);
//   - the sparkle of `sparkle` for what an editor works out by itself (`fill-edges`,
//     `auto-enhance`), and the wand for `effects`;
//   - the 45° tool axis of `edit` and `brush` (toolAxis, brushParts) for the retouch tools;
//   - the mask (a frame with a round window) for `mask`, `mask-plus` and `mask-apply`;
//   - the layer plate of `layers` for `merge-down`, `flatten` and `file-layers`;
//   - the medical cross for the healing tools; `patch` is the plaster and keeps that meaning.
import { arc, circle, circlePrim, cut, d, dotEl, any, line, nearPrims, path, pl, poly, polar, rect, rrect, tinted, V } from "../lib.mjs"
import { brushParts, toolAxis } from "./editor.mjs"
import { sparkle } from "./core.mjs"
import { pointer } from "./rmm.mjs"
import { eyePrims } from "./actions.mjs"
import { page } from "./file-types.mjs"

export const icons = {}
const def = (name, fn) => (icons[name] = fn)
const fx = (n) => +n.toFixed(2)

// ── shared parts ──────────────────────────────────────────────────────────────
/** The picture frame of `image`: x, y, width, height, radius. */
export const FRAME = [3, 4, 18, 16, 2.5]
export const framePrims = () => rrect(...FRAME)
/** Stroke a list of primitives, one path per touching chain. */
const strokes = (prims) => (prims.length ? [path(d(prims))] : [])

/** Medical cross, outlined: centre, half length, half arm width. */
export const crossPrims = (cx, cy, L = 4.5, w = 1.75, r = 0.75) =>
  poly(
    [
      [cx - w, cy - L], [cx + w, cy - L], [cx + w, cy - w], [cx + L, cy - w], [cx + L, cy + w], [cx + w, cy + w],
      [cx + w, cy + L], [cx - w, cy + L], [cx - w, cy + w], [cx - L, cy + w], [cx - L, cy - w], [cx - w, cy - w],
    ],
    [r, r, 0, r, r, 0, r, r, 0, r, r, 0]
  )

/** A layer plate of `layers`: a flat rhombus with soft corners. */
export const platePrims = (cx, cy, hw = 8.5, hh = 4.5, r = 1) =>
  poly([[cx, cy - hh], [cx + hw, cy], [cx, cy + hh], [cx - hw, cy]], r)

/** The mask: a frame with a round window; the tint is the frame minus the window. */
export const maskParts = (x = 3, y = 4, w = 18, h = 16, rr = 2.5, c = [12, 12], R = 4.5) => {
  const outer = rrect(x, y, w, h, rr)
  const hole = `M${fx(c[0])} ${fx(c[1] - R)}A${R} ${R} 0 0 0 ${fx(c[0])} ${fx(c[1] + R)}A${R} ${R} 0 0 0 ${fx(c[0])} ${fx(c[1] - R)}Z`
  return { outer, window: [circlePrim(c[0], c[1], R)], tint: d(outer, true) + hole }
}

/** A dashed rounded rectangle: arcs at the corners, `dash` long dashes centred on each side. */
export const dashedRect = (x, y, w, h, r, dash) => {
  const prims = []
  const cx = x + w / 2
  const cy = y + h / 2
  const corner = (c, a0, a1) => prims.push(arc(c, r, a0, a1))
  corner([x + r, y + r], 270, 360)
  corner([x + w - r, y + r], 0, 90)
  corner([x + w - r, y + h - r], 90, 180)
  corner([x + r, y + h - r], 180, 270)
  prims.push(line([cx - dash / 2, y], [cx + dash / 2, y]), line([cx - dash / 2, y + h], [cx + dash / 2, y + h]))
  prims.push(line([x, cy - dash / 2], [x, cy + dash / 2]), line([x + w, cy - dash / 2], [x + w, cy + dash / 2]))
  return prims
}

/** Strokes of `prims` cut back 3 units around `keep` (the overlay rule). */
const under = (prims, keep, gap = 3) => cut(prims, nearPrims(keep, gap))

/** Point in polygon (sampled outline). */
const inPoly = (prims) => {
  const pts = []
  for (const s of prims) for (let i = 0; i <= 20; i++) {
    const t = i / 20
    pts.push(s.k === "l" ? [s.p[0] + (s.q[0] - s.p[0]) * t, s.p[1] + (s.q[1] - s.p[1]) * t] : polar(s.c[0], s.c[1], s.r, s.a0 + (s.a1 - s.a0) * t))
  }
  return (pt) => {
    let c = false
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i]
      const [xj, yj] = pts[j]
      if (yi > pt[1] !== yj > pt[1] && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) c = !c
    }
    return c
  }
}
/** Cut strokes inside or within `gap` of a closed shape. */
export const behind = (prims, front, gap = 3) => cut(prims, any(inPoly(front), nearPrims(front, gap)))

/**
 * Hills on a baseline: convex peaks [cx, cy, r] joined by concave valleys of radius `rv`, with
 * concave feet of radius `rf` meeting the baseline, every join tangent.
 */
export const hills = (base, peaks, rv, rf) => {
  const ang = (c, p) => {
    const a = (Math.atan2(p[0] - c[0], -(p[1] - c[1])) * 180) / Math.PI
    return a < 0 ? a + 360 : a
  }
  const touch = (c1, r1, c2) => V.add(c1, V.mul(V.norm(V.sub(c2, c1)), r1))
  const foot = (pk, side) => {
    const [x, y, r] = pk
    const dy = base - rf - y
    const F = [x + side * Math.sqrt((r + rf) ** 2 - dy * dy), base - rf]
    return { F, T: touch([x, y], r, F) }
  }
  const valleys = []
  for (let i = 0; i + 1 < peaks.length; i++) {
    const [x1, y1, r1] = peaks[i]
    const [x2, y2, r2] = peaks[i + 1]
    // centre above both peaks, at r1 + rv and r2 + rv
    const A = [x1, y1]
    const B = [x2, y2]
    const ra = r1 + rv
    const rb = r2 + rv
    const dd = V.len(V.sub(B, A))
    const a = (dd * dd + ra * ra - rb * rb) / (2 * dd)
    const h = Math.sqrt(ra * ra - a * a)
    const m = V.add(A, V.mul(V.sub(B, A), a / dd))
    const n = V.norm(V.sub(B, A))
    const c1 = [m[0] + n[1] * h, m[1] - n[0] * h]
    const c2 = [m[0] - n[1] * h, m[1] + n[0] * h]
    const C = c1[1] < c2[1] ? c1 : c2
    valleys.push({ C, Ta: touch(A, r1, C), Tb: touch(B, r2, C) })
  }
  const L = foot(peaks[0], -1)
  const R = foot(peaks.at(-1), 1)
  const prims = [arc(L.F, rf, 180, ang(L.F, L.T))]
  peaks.forEach(([x, y, r], i) => {
    const from = i === 0 ? L.T : valleys[i - 1].Tb
    const to = i === peaks.length - 1 ? R.T : valleys[i].Ta
    let a0 = ang([x, y], from)
    let a1 = ang([x, y], to)
    if (a0 > 180) a0 -= 360
    if (a1 < a0) a1 += 360
    prims.push(arc([x, y], r, a0, a1))
    if (i < valleys.length) {
      const v = valleys[i]
      prims.push(arc(v.C, rv, ang(v.C, v.Ta), ang(v.C, v.Tb)))
    }
  })
  prims.push(arc(R.F, rf, ang(R.F, R.T), 180))
  return { prims, x0: L.F[0], x1: R.F[0] }
}
// ── select ────────────────────────────────────────────────────────────────────
// Select an object: the pointer of `cursor` over a layer's box, the box knocked out around it.
def("select-object", () => {
  const p = pointer(10.5, 10.5, 0.7)
  const box = rrect(3.5, 3.5, 12, 12, 2)
  return [path(d(box, true), "t"), ...strokes(under(box, p)), path(d(p, true))]
})
// Marquee: the dashed rectangle of a rectangular selection.
def("marquee", () => [path(d(dashedRect(3.5, 3.5, 17, 17, 2.5, 3.5)))])

// ── geometry ──────────────────────────────────────────────────────────────────
// Straighten: a spirit level, its bubble centred between the vial marks.
def("straighten", () => [
  rect(2.5, 7.5, 19, 9, 2, "t"),
  rect(2.5, 7.5, 19, 9, 2),
  path("M8.5 10.5V13.5"),
  path("M15.5 10.5V13.5"),
  dotEl(12, 12, 1.5),
])
// Image size: the picture scales from its corner to fill the larger frame.
def("image-size", () => [
  rect(6.5, 10.5, 7, 7, 1.5, "t"),
  rect(3.5, 3.5, 17, 17, 2.5),
  rect(6.5, 10.5, 7, 7, 1.5),
  path("M15.25 8.75L17.5 6.5"),
  path("M13.5 6.5H17.5V10.5"),
])
// Canvas size: the picture stays as it is and the canvas grows to the crop marks around it.
def("canvas-size", () => [
  rect(8, 8, 8, 8, 2, "t"),
  rect(8, 8, 8, 8, 2),
  path("M3.5 8V5.5A2 2 0 0 1 5.5 3.5H8"),
  path("M16 3.5H18.5A2 2 0 0 1 20.5 5.5V8"),
  path("M20.5 16V18.5A2 2 0 0 1 18.5 20.5H16"),
  path("M8 20.5H5.5A2 2 0 0 1 3.5 18.5V16"),
])
// Free transform: a bounding box with its corner handles.
def("transform", () => {
  const hs = [[5.5, 5.5], [18.5, 5.5], [18.5, 18.5], [5.5, 18.5]]
  return [
    rect(5.5, 5.5, 13, 13, 0, "t"),
    path("M7.5 5.5H16.5"),
    path("M18.5 7.5V16.5"),
    path("M16.5 18.5H7.5"),
    path("M5.5 16.5V7.5"),
    ...hs.map(([x, y]) => rect(x - 2, y - 2, 4, 4, 1)),
  ]
})
// Perspective: a keystone, its grid lines converging towards the far edge.
def("perspective", () => {
  const t = poly([[7.5, 4.5], [16.5, 4.5], [21, 19.5], [3, 19.5]], [1.5, 1.5, 1.25, 1.25])
  return [...tinted(t), path("M10.5 4.5L9 19.5"), path("M13.5 4.5L15 19.5")]
})
// Fill edges: content-aware fill of the band an edit leaves empty, marked with the sparkle.
def("fill-edges", () => {
  const s = sparkle(17.75, 6.25, 4.25)
  const frame = framePrims()
  const inner = rrect(6.5, 7.5, 9.5, 9, 1.5)
  const hole = `M6.5 9V15A1.5 1.5 0 0 0 8 16.5H14.5A1.5 1.5 0 0 0 16 15V9A1.5 1.5 0 0 0 14.5 7.5H8A1.5 1.5 0 0 0 6.5 9Z`
  return [path(d(frame, true) + hole, "t"), ...strokes(under(frame, s)), ...strokes(under(inner, s)), path(d(s, true))]
})

// ── tone and colour ───────────────────────────────────────────────────────────
// Develop: the aperture of a lens, the opening tinted.
def("develop", () => {
  const c = [12, 12]
  const R = 9
  const h = 4.25
  const hex = [0, 1, 2, 3, 4, 5].map((k) => polar(c[0], c[1], h, 30 + 60 * k))
  const blades = []
  for (let k = 0; k < 6; k++) {
    const a = hex[k]
    const b = hex[(k + 1) % 6]
    const dir = V.norm(V.sub(b, a))
    // extend the hexagon edge past b to the outer circle
    const rel = V.sub(b, c)
    const t = -V.dot(rel, dir) + Math.sqrt(V.dot(rel, dir) ** 2 - (V.dot(rel, rel) - R * R))
    blades.push(path(d([line(a, V.add(b, V.mul(dir, t)))])))
  }
  return [path(d(poly(hex, 0), true), "t"), circle(12, 12, R), ...blades]
})
// Exposure: plus and minus across the diagonal of a square, the darker half tinted.
def("exposure", () => {
  const half = [
    line([4.23, 19.77], [19.77, 4.23]),
    arc([18, 6], 2.5, 45, 90),
    line([20.5, 6], [20.5, 18]),
    arc([18, 18], 2.5, 90, 180),
    line([18, 20.5], [6, 20.5]),
    arc([6, 18], 2.5, 180, 225),
  ]
  return [
    path(d(half, true), "t"),
    rect(3.5, 3.5, 17, 17, 2.5),
    path("M4.23 19.77L19.77 4.23"),
    path("M8.75 6.75V10.75"),
    path("M6.75 8.75H10.75"),
    path("M13.25 15.25H17.25"),
  ]
})
// Curves: the tone curve's S across its graph.
def("curves", () => [
  rect(3.5, 3.5, 17, 17, 2.5, "t"),
  rect(3.5, 3.5, 17, 17, 2.5),
  path(d([arc([6.5, 12], 5.5, 180, 90), arc([17.5, 12], 5.5, 270, 360)])),
])
// HSL: the hue ring in three bands, one tinted.
def("hsl", () => {
  const R = 9
  const r = 4.5
  const seg = (a0, a1) => [arc([12, 12], R, a0, a1), line(polar(12, 12, R, a1), polar(12, 12, r, a1)), arc([12, 12], r, a1, a0), line(polar(12, 12, r, a0), polar(12, 12, R, a0))]
  return [
    path(d(seg(0, 120), true), "t"),
    circle(12, 12, R),
    circle(12, 12, r),
    ...[0, 120, 240].map((a) => path(d([line(polar(12, 12, r, a), polar(12, 12, R, a))]))),
  ]
})
// Colour balance: a colour wheel, marked at its rim, with its puck pulled off centre.
def("colour-balance", () => {
  const p = polar(12, 12, 4.75, 45)
  const ticks = [line([12, 3], [12, 5.5]), line([12, 18.5], [12, 21]), line([3, 12], [5.5, 12]), line([18.5, 12], [21, 12])]
  return [circle(fx(p[0]), fx(p[1]), 2.5, "t"), circle(12, 12, 9), ...ticks.map((t) => path(d([t]))), circle(fx(p[0]), fx(p[1]), 2.5)]
})
// Histogram: the distribution of tones, two hills on the baseline.
def("histogram", () => {
  const b = hills(19.5, [[8, 14, 3], [15, 10.5, 4.5]], 1.25, 3)
  return [path(d([...b.prims, line([b.x1, 19.5], [b.x0, 19.5])], true), "t"), path(d(b.prims)), path("M2.5 19.5H21.5")]
})
// Levels: the histogram over its black, grey and white point markers.
def("levels", () => {
  const b = hills(13.5, [[8, 9.25, 2.25], [14, 6.75, 3.5]], 1, 2)
  const tri = (x) => path(d(poly([[x, 17], [x + 2.5, 20.75], [x - 2.5, 20.75]], 0.75), true))
  return [path(d([...b.prims, line([b.x1, 13.5], [b.x0, 13.5])], true), "t"), path(d(b.prims)), path("M2.5 13.5H21.5"), tri(5), tri(12), tri(19)]
})
// Detail: the magnifier of `search` on a fine peak, for sharpening and clarity.
def("detail", () => [
  circle(10.75, 10.75, 6.75, "t"),
  circle(10.75, 10.75, 6.75),
  path("M15.75 15.75L20 20"),
  path("M7.75 12.5L10.75 9.5L13.75 12.5"),
])
// Auto enhance: the tracks of `sliders`, set by the sparkle.
def("auto-enhance", () => {
  const s = sparkle(17, 7, 4.25)
  const track = [line([3.5, 9.5], [4.75, 9.5]), line([10.25, 9.5], [20.5, 9.5])]
  return [
    path(d(s, true), "t"),
    ...strokes(behind(track, s)),
    circle(7.5, 9.5, 2.75),
    path("M3.5 17H11.75"),
    circle(14.5, 17, 2.75),
    path("M17.25 17H20.5"),
    path(d(s, true)),
  ]
})

// ── retouch ───────────────────────────────────────────────────────────────────
// Clone stamp: the rubber stamp and the impression it leaves.
def("clone-stamp", () => [
  rect(4.5, 12.5, 15, 5, 1.5, "t"),
  circle(12, 6, 2.75),
  path("M10.5 8.4V12.5"),
  path("M13.5 8.4V12.5"),
  rect(4.5, 12.5, 15, 5, 1.5),
  path("M5.5 20.5H18.5"),
])
/** The brush of `brush`, smaller and moved down-right, clear of a badge at the top left. */
export const smallBrush = () => brushParts([12.75, 14.25], 0.82)
// Healing brush: the brush with the medical cross.
def("healing-brush", () => {
  const { bristles, handle } = smallBrush()
  return [path(bristles, "t"), path(bristles), path(d(handle)), path(d(crossPrims(7.25, 7.25, 4, 1.75, 0.75), true))]
})
// Spot healing: the medical cross beside the spot it clears.
def("spot-healing", () => {
  const cr = crossPrims(14, 10, 6, 2.25, 1)
  return [...tinted(cr), circle(6.5, 17.5, 2.5)]
})
// Patch: a sewn patch, its stitches running inside the edge.
def("patch-region", () => [
  rect(3.5, 3.5, 17, 17, 2.5, "t"),
  rect(3.5, 3.5, 17, 17, 2.5),
  path(d(dashedRect(7.5, 7.5, 9, 9, 1.5, 0).slice(0, 4))),
  dotEl(12, 7.5, 1),
  dotEl(12, 16.5, 1),
  dotEl(7.5, 12, 1),
  dotEl(16.5, 12, 1),
])
// Blur: a disc whose right half dissolves into points.
def("blur", () => [
  path(d([arc([12, 12], 7.5, 180, 360)])),
  ...[30, 70, 110, 150].map((a) => {
    const p = polar(12, 12, 7.5, a)
    return dotEl(fx(p[0]), fx(p[1]), 1.15)
  }),
  ...[50, 90, 130].map((a) => {
    const p = polar(12, 12, 4, a)
    return dotEl(fx(p[0]), fx(p[1]), 1)
  }),
])
// Sharpen: the cone of the sharpen tool on the tool axis, its point down.
def("sharpen", () => {
  const P = toolAxis([12.5, 11.5])
  const tip = P(-9, 0)
  const a = P(5, -4.5)
  const b = P(5, 4.5)
  const c = P(-9.5, 0)
  const R = V.len(V.sub(a, c))
  const ang = (p) => (Math.atan2(p[0] - c[0], -(p[1] - c[1])) * 180) / Math.PI
  const cone = [line(tip, a), arc(c, R, ang(a), ang(b)), line(b, tip)]
  return [path(d(cone, true), "t"), path(d(cone, true))]
})
// Smudge: a fingertip dragging a smear.
def("smudge", () => {
  const P = toolAxis([14.25, 9.75])
  const finger = poly([P(-6, -3), P(7.5, -3), P(7.5, 3), P(-6, 3)], [3, 0, 0, 3])
  return [
    path(d(finger, true), "t"),
    path(d(finger, true)),
    path("M3 18A2.25 2.25 0 0 1 7.5 18A2.25 2.25 0 0 0 12 18A2.25 2.25 0 0 1 16.5 18"),
  ]
})
/** Dodge and burn: a paddle on its stick. */
const paddle = (...inner) => [circle(12, 8.5, 5.5, "t"), circle(12, 8.5, 5.5), path("M12 14V21"), ...inner]
// Dodge: the paddle that holds light back, so the area lightens.
def("dodge", () => paddle())
// Burn: the card with a hole that lets more light through, so the area darkens.
def("burn", () => paddle(dotEl(12, 8.5, 1.6)))
// Sponge: a sponge with a soft top and open pores.
def("sponge", () => {
  const n = 3
  const w = 16 / n
  const sag = 1.5
  const R = ((w / 2) ** 2 + sag ** 2) / (2 * sag)
  const half = (Math.asin(w / 2 / R) * 180) / Math.PI
  const top = Array.from({ length: n }, (_, i) => arc([4 + w * (i + 0.5), 8.5 + R], R, -half, half))
  const body = [...top, line([20, 10], [20, 18]), arc([18, 18], 2, 90, 180), line([18, 20], [6, 20]), arc([6, 18], 2, 180, 270), line([4, 18], [4, 10])]
  return [path(d(body, true), "t"), path(d(body, true)), dotEl(8.5, 14, 1.15), dotEl(15.5, 14, 1.15), dotEl(12, 16.75, 1.15)]
})
// Colour replacement: the brush with the turning arrow of `replace`.
def("colour-replace", () => {
  const { bristles, handle } = smallBrush()
  return [path(bristles, "t"), path(bristles), path(d(handle)), path("M3.5 10.5V7A3 3 0 0 1 6.5 4H10"), path("M8 2L10 4L8 6")]
})
// Red-eye: an eye whose pupil is a target.
def("red-eye", () => {
  const e = eyePrims()
  return [circle(12, 12, 3.25, "t"), path(d(e, true)), circle(12, 12, 3.25), dotEl(12, 12, 1.25), path("M5.75 12H7.25"), path("M16.75 12H18.25")]
})
// Liquify: a swirl pushed through the pixels.
def("liquify", () => {
  const prims = [
    arc([12, 12], 9, 270, 450),
    arc([10.5, 12], 7.5, 90, 270),
    arc([12, 12], 6, 270, 450),
    arc([10.5, 12], 4.5, 90, 270),
    arc([12, 12], 3, 270, 360),
  ]
  return [path(d(prims))]
})
// Eraser: the block on the tool axis, its rubber end tinted, over the line it clears.
def("eraser", () => {
  const P = toolAxis([13.25, 10.25])
  const block = poly([P(-7.5, -3.5), P(7.5, -3.5), P(7.5, 3.5), P(-7.5, 3.5)], 2)
  const rub = poly([P(-7.5, -3.5), P(-1.5, -3.5), P(-1.5, 3.5), P(-7.5, 3.5)], [2, 0, 0, 2])
  return [path(d(rub, true), "t"), path(d(block, true)), path(d([line(P(-1.5, -3.5), P(-1.5, 3.5))])), path("M12.5 20.5H20.5")]
})

// ── layers ────────────────────────────────────────────────────────────────────
// Mask: a layer mask, the frame with its round window.
def("mask", () => {
  const m = maskParts()
  return [path(m.tint, "t"), path(d(m.outer, true)), circle(12, 12, 4.5)]
})
/** The mask, smaller, with a badge at its lower right. */
const maskWith = (badge) => {
  const m = maskParts(3, 4, 15.5, 13.5, 2.5, [10.75, 10.75], 3.75)
  return [path(m.tint, "t"), ...strokes(under(m.outer, badge)), circle(10.75, 10.75, 3.75), path(d(badge))]
}
// Add mask: the mask with the add modifier.
def("mask-plus", () => maskWith([line([18, 14.75], [18, 20.25]), line([15.25, 17.5], [20.75, 17.5])]))
// Apply mask: the mask with the check, committed to the layer.
def("mask-apply", () => maskWith(pl([[14.25, 17.75], [16.5, 20], [21, 15.5]])))
// Merge down: the layer above moves down into the plate below.
def("merge-down", () => {
  const plate = platePrims(12, 15.5, 8.5, 4.5)
  return [...tinted(plate), path("M12 2.5V8"), path("M8.5 4.5L12 8L15.5 4.5")]
})
// Flatten: every layer pressed into one plate.
def("flatten", () => {
  const plate = platePrims(12, 12, 8.5, 3.5)
  return [...tinted(plate), path("M9 2.5L12 5.5L15 2.5"), path("M9 21.5L12 18.5L15 21.5")]
})

// ── effects ───────────────────────────────────────────────────────────────────
// Effects: a wand whose tip sparks.
def("effects", () => {
  const s = sparkle(15.75, 8.25, 4.75)
  return [...tinted(s), path("M3.5 20.5L10.5 13.5"), dotEl(7, 6, 1.15), dotEl(19.5, 17, 1.15)]
})
// Looks: three overlapping colour discs, the saved looks and presets.
def("looks", () => [
  circle(12, 8.5, 5, "t"),
  circle(12, 8.5, 5),
  circle(8.5, 14.5, 5),
  circle(15.5, 14.5, 5),
])

// ── file and info ─────────────────────────────────────────────────────────────
/** The picture frame with a badge at its lower right; the frame is knocked out around it. */
const frameWith = (badge, extra = []) => [
  path(d(framePrims(), true), "t"),
  ...strokes(under(framePrims(), badge)),
  circle(8.5, 9.5, 1.75),
  path("M3.5 17.5L7.5 13.5L10 16"),
  ...extra,
]
// Image information: `info` over the picture.
def("image-info", () => {
  const ring = [circlePrim(16.5, 16, 4.75)]
  return frameWith(ring, [path(d(ring)), path("M16.5 15.5V18.25"), dotEl(16.5, 13.25, 1)])
})
// Image metadata: the `tag` on the picture, for EXIF, IPTC and XMP fields.
def("image-metadata", () => {
  const t = poly([[12.25, 12.25], [16.75, 12.25], [21.75, 17.25], [17.25, 21.75], [12.25, 16.75]], 1.25)
  return frameWith(t, [path(d(t, true)), dotEl(15, 15, 1)])
})
// Batch: a stack of pictures handled as one job.
def("batch", () => [
  rect(3, 9.5, 12, 11, 2, "t"),
  rect(3, 9.5, 12, 11, 2),
  path("M6 9.5V8.5A2 2 0 0 1 8 6.5H16A2 2 0 0 1 18 8.5V15.5A2 2 0 0 1 16 17.5H15"),
  path("M9 6.5V5.5A2 2 0 0 1 11 3.5H19A2 2 0 0 1 21 5.5V12.5A2 2 0 0 1 19 14.5H18"),
  path("M3.5 18.5L7.5 14.5L11.5 18.5"),
])
// Layered image file: the page of `file` with a layer stack.
def("file-layers", () => page(path(d(platePrims(12, 13, 4.5, 2.5, 0.75), true)), path("M7.5 16L12 18.5L16.5 16")))

// ── view ──────────────────────────────────────────────────────────────────────
// Before and after: the picture split by a compare handle that runs past its edges.
def("before-after", () => [
  path("M12 4H5.5A2.5 2.5 0 0 0 3 6.5V17.5A2.5 2.5 0 0 0 5.5 20H12Z", "t"),
  rect(3, 4, 18, 16, 2.5),
  path("M12 2V22"),
])
// Focus mode: the viewfinder marks around the subject, everything else put away.
def("focus-mode", () => [
  circle(12, 12, 3.5, "t"),
  path("M3.5 8V5.5A2 2 0 0 1 5.5 3.5H8"),
  path("M16 3.5H18.5A2 2 0 0 1 20.5 5.5V8"),
  path("M20.5 16V18.5A2 2 0 0 1 18.5 20.5H16"),
  path("M8 20.5H5.5A2 2 0 0 1 3.5 18.5V16"),
  circle(12, 12, 3.5),
])
// Fit to screen: the picture grown to the edges of the view.
def("fit-screen", () => [
  rect(3, 4, 18, 16, 2.5),
  path("M13.75 10.25L17.5 6.5"),
  path("M14 6.5H17.5V10"),
  path("M10.25 13.75L6.5 17.5"),
  path("M6.5 14V17.5H10"),
])
// Actual size: one image pixel to one screen pixel.
def("actual-size", () => [
  rect(3, 4, 18, 16, 2.5),
  path("M7.25 9.5L8.75 8V16"),
  dotEl(12, 10.25, 1.1),
  dotEl(12, 13.75, 1.1),
  path("M15.25 9.5L16.75 8V16"),
])
// Transparency grid: the checkerboard behind transparent pixels.
def("transparency", () => [
  path("M6.5 7.5A1 1 0 0 1 7.5 6.5H10.5A1 1 0 0 1 11.5 7.5V10.5A1 1 0 0 1 10.5 11.5H7.5A1 1 0 0 1 6.5 10.5ZM12.5 13.5A1 1 0 0 1 13.5 12.5H16.5A1 1 0 0 1 17.5 13.5V16.5A1 1 0 0 1 16.5 17.5H13.5A1 1 0 0 1 12.5 16.5Z", "t"),
  rect(3.5, 3.5, 17, 17, 2.5),
  rect(6.5, 6.5, 5, 5, 1),
  rect(12.5, 12.5, 5, 5, 1),
])
