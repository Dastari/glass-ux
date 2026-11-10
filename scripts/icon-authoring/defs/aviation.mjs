// Aviation: the aircraft, its parts and the ground support equipment that services it.
//
// Ground vehicles share the parts of `supplier`: wheels of radius 2 at y 17.5 with the body
// knocked out 1.5 around them, and a cab at the right. Powered carts (`ground-power`,
// `air-start`) share one unit body on two wheels and are told apart by what is inside and
// what leaves it: a bolt and a plugged cable, or a fan and an air hose. Gas carts are told
// apart by silhouette: `nitrogen-cart` a horizontal tank on a trailer, `oxygen-cart` an
// upright cylinder on a hand truck. Raised access is told apart the same way: `ladder` a
// straight ladder, `work-stand` steps to a railed platform, `scissor-lift` a railed basket
// on crossed arms and `airstairs` a flight of steps on a vehicle. The aircraft's wing sweep
// keeps its own angle rather than 45°, so it reads as an airliner, not a fighter.
import { arc, circle, cut, d, disk, band, any, dotEl, line, path, poly, rot, tinted, rect } from "../lib.mjs"

export const icons = {}
const def = (name, fn) => (icons[name] = fn)

const WHEEL_R = 2
/** Wheels as circles, and the region 1.5 around them that bodies are knocked out of. */
const wheelsAt = (centres, r = WHEEL_R) => ({
  els: centres.map(([x, y]) => circle(x, y, r)),
  clear: (pt) => centres.some((c) => disk(c, r + 1.5)(pt)),
})
/** A rectangle as rounded primitives. */
const box = (x0, y0, x1, y1, r) =>
  poly(
    [
      [x0, y0],
      [x1, y0],
      [x1, y1],
      [x0, y1],
    ],
    r
  )
/** A capsule of half-width `w` from a to b (any angle). */
const capsule = (a, b, w) => {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const L = Math.hypot(dx, dy)
  const n = [(-dy / L) * w, (dx / L) * w]
  const pts = [
    [a[0] + n[0], a[1] + n[1]],
    [b[0] + n[0], b[1] + n[1]],
    [b[0] - n[0], b[1] - n[1]],
    [a[0] - n[0], a[1] - n[1]],
  ]
  // The ends become semicircles: poly rounds each corner with radius w, which meet at the
  // end's midpoint, so the outline is a true capsule.
  return poly(pts, w - 0.001)
}
/** The supplier cab, at the right of a vehicle. */
const cab = () =>
  poly(
    [
      [13.5, 8.5],
      [17.5, 8.5],
      [21, 12],
      [21, 15.5],
      [13.5, 15.5],
    ],
    [0, 1, 1, 1.5, 0]
  )

// ── The aircraft ────────────────────────────────────────────────────────────────

// Airplane: an airliner from above, nose up, the whole airframe tinted.
def("airplane", () => {
  const right = [
    [13.25, 5],
    [13.25, 9.25],
    [21.5, 13.75],
    [21.5, 15.75],
    [13.25, 13.75],
    [13.25, 17.75],
    [16.5, 20],
    [16.5, 21.5],
    [12, 20.5],
  ]
  const left = right
    .slice(0, -1)
    .reverse()
    .map(([x, y]) => [24 - x, y])
  const pts = [[12, 2], ...right, ...left]
  const radii = [1.25, 0.75, 0.75, 0.75, 0.75, 0.75, 0.75, 0.75, 0.75, 0, 0.75, 0.75, 0.75, 0.75, 0.75, 0.75, 0.75, 0.75]
  return tinted(poly(pts, radii))
})

// Jet engine: a turbofan from the front, the nacelle lip around a fan of blades on a spinner.
def("jet-engine", () => {
  const c = [12, 12]
  const blades = [0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
    const p = rot([12, 9.25], c, a)
    const q = rot([12, 6], c, a)
    return path(d([line(p, q)]))
  })
  return [circle(12, 12, 9, "t"), circle(12, 12, 9), ...blades, circle(12, 12, 2.25)]
})

// Propeller: three blades around the spinner, the blades tinted together.
def("propeller", () => {
  const c = [12, 12]
  const blades = [0, 120, 240].map((a) => capsule(rot([12, 9.25], c, a), rot([12, 2.75], c, a), 1.75))
  const tint = blades.map((b) => d(b, true)).join("")
  return [path(tint, "t"), ...blades.map((b) => path(d(b, true))), circle(12, 12, 2.25)]
})

// Tyre: an aircraft wheel, the tyre tinted around the rim and hub.
def("tyre", () => [
  circle(12, 12, 9, "t"),
  circle(12, 12, 9),
  circle(12, 12, 5),
  ...[0, 90, 180, 270].map((a) => {
    const [x, y] = rot([12, 9.5], [12, 12], a + 45)
    return dotEl(x, y, 1)
  }),
])

// Landing gear: from the front, the oleo strut over an axle between two tyres, the tyres tinted.
def("landing-gear", () => {
  const tyres = [box(3, 10, 7.5, 20.5, 2), box(16.5, 10, 21, 20.5, 2)]
  return [
    path(tyres.map((t) => d(t, true)).join(""), "t"),
    ...tyres.map((t) => path(d(t, true))),
    path(d(box(10, 2.5, 14, 9, 1), true)),
    path("M12 9V15.25"),
    path("M7.5 15.25H16.5"),
  ]
})

// Seat: a passenger seat in profile, the backrest tinted.
def("seat", () => {
  const back = poly(
    [
      [5.5, 3],
      [9.5, 3],
      [10.5, 13],
      [6.5, 13],
    ],
    1.5
  )
  return [
    ...tinted(back),
    path(d(poly([
      [6.5, 13],
      [18.5, 13],
      [18.5, 16],
      [7, 16],
    ], [0, 1.5, 1.5, 0], false))),
    path("M13 9.5H18.5"),
    path("M12.5 16V20.5"),
    path("M8.5 20.5H16.5"),
  ]
})

// Oil can: a can with a long spout and a drop at its tip, the can tinted.
def("oil-can", () => {
  const can = poly(
    [
      [8, 10],
      [17, 10],
      [18.5, 20.5],
      [6.5, 20.5],
    ],
    [1.5, 1.5, 1.5, 1.5]
  )
  return [
    ...tinted(can),
    path("M10.5 10V7.5H14.5V10"),
    path("M8 12L3.5 7.5"),
    path(d([line([17.5, 13], [19.5, 13]), arc([19.5, 15], 2, 0, 180), line([19.5, 17], [18.5, 17])])),
    dotEl(3.5, 11.5, 1.25),
  ]
})

// Refueller: the supplier truck carrying a tank, the tank tinted.
def("refueller", () => {
  const w = wheelsAt([
    [6.5, 17.5],
    [17.25, 17.5],
  ])
  const tank = box(2.5, 6.5, 13.5, 13, 3.25)
  return [
    ...tinted(tank),
    path(d(cut([line([2.5, 15.5], [13.5, 15.5])], w.clear))),
    path("M5.5 13V15.5"),
    path("M10.5 13V15.5"),
    path(d(cut(cab(), w.clear))),
    ...w.els,
  ]
})

// ── Ground support equipment ───────────────────────────────────────────────────

// Forklift: a mast and forks at the front of a body under its overhead guard.
def("forklift", () => {
  const w = wheelsAt([
    [11.5, 17.5],
    [18.25, 17.5],
  ])
  const body = box(9.5, 11, 21, 15.5, 1.5)
  return [
    path(d(body, true), "t"),
    path(d(cut(body, w.clear))),
    path(d(poly([
      [10.5, 11],
      [10.5, 4.5],
      [17.5, 4.5],
      [19.5, 7.5],
      [19.5, 11],
    ], [0, 1.5, 1, 1, 0], false))),
    path("M6.5 3.5V19.5H2.5"),
    path("M6.5 13H9.5"),
    ...w.els,
  ]
})

// Baggage cart: a suitcase on a cart, its deck knocked out around the wheels.
def("baggage-cart", () => {
  const w = wheelsAt([
    [8, 17.5],
    [17, 17.5],
  ])
  const suitcase = box(8.5, 7, 16.5, 13, 1.5)
  return [
    ...tinted(suitcase),
    path("M10.5 7V5.5A1 1 0 0 1 11.5 4.5H13.5A1 1 0 0 1 14.5 5.5V7"),
    path(d(cut([line([5, 15.5], [21, 15.5])], w.clear))),
    path("M5 15.5L2.5 13"),
    ...w.els,
  ]
})

// De-icer: a truck with a boom spraying the fluid, the cab tinted.
def("de-icer", () => {
  const w = wheelsAt([
    [6.5, 17.5],
    [17.25, 17.5],
  ])
  const c = cab()
  return [
    path(d(c, true), "t"),
    path(d(cut(c, w.clear))),
    path(d(cut([line([2.5, 15.5], [13.5, 15.5])], w.clear))),
    path("M10.5 15.5L5 10L6.5 8.5"),
    dotEl(4, 5, 1),
    dotEl(7, 4, 1),
    dotEl(9.5, 5.5, 1),
    ...w.els,
  ]
})

// Wheelchair: the access symbol, the wheel open where the figure crosses it.
def("wheelchair", () => {
  const C = [10.5, 14.5]
  const wheel = [arc(C, 6, 0, 360)]
  const torso = [[8.5, 7.5], [8.5, 13.5]]
  const leg = [[8.5, 13.5], [14.5, 13.5], [17.5, 18.5], [19.5, 18.5]]
  const clear = any(band(torso[0], torso[1], 1.5), band(leg[1], leg[2], 1.5), band(leg[0], leg[1], 1.5))
  return [
    path(d(cut(wheel, clear))),
    dotEl(8.5, 4.25, 1.5),
    path(`M${torso[0].join(" ")}V${torso[1][1]}H14.5L17.5 18.5H19.5`),
  ]
})

// Pump: a dispenser with its hose and nozzle, the display tinted.
def("pump", () => [
  rect(7, 5.5, 5, 4, 1, "t"),
  path(d(box(4.5, 3, 14.5, 20.5, 2), true)),
  rect(7, 5.5, 5, 4, 1),
  path("M14.5 12H16.25A1.25 1.25 0 0 1 17.5 13.25V17A1.5 1.5 0 0 0 20.5 17V9L18 6.5"),
])

// Marshalling stand: a marshaller on a low stand, raising two lit wands, the wands tinted.
def("marshalling-stand", () => {
  const wands = [capsule([7.5, 6.5], [4.5, 3.5], 1.25), capsule([16.5, 6.5], [19.5, 3.5], 1.25)]
  return [
    path(wands.map((w) => d(w, true)).join(""), "t"),
    ...wands.map((w) => path(d(w, true))),
    dotEl(12, 7, 1.5),
    path("M8.75 7.75L12 11L15.25 7.75"),
    path("M12 11V16"),
    path("M6.5 16H17.5"),
    path("M8 16V20.5"),
    path("M16 16V20.5"),
  ]
})

// Towbar: a tube between the tow eye and the coupling head, on its wheel.
def("towbar", () => [
  ...tinted(box(7.5, 10.5, 18.5, 13.5, 1.5)),
  circle(4.75, 12, 2.25),
  path("M20.5 9V15"),
  path("M18.5 12H20.5"),
  path("M12 13.5V15"),
  circle(12, 17.5, 2.25),
])

// Tug: a low tractor with a canopy over the driver and a tow hitch, the body tinted.
def("tug", () => {
  const w = wheelsAt([
    [7, 17.5],
    [17.5, 17.5],
  ])
  const body = poly(
    [
      [3.5, 15.5],
      [3.5, 12],
      [14, 12],
      [15.5, 10],
      [20.5, 10],
      [20.5, 15.5],
    ],
    [1, 1, 1, 1, 1.5, 1]
  )
  return [
    path(d(body, true), "t"),
    path(d(cut(body, w.clear))),
    path("M5.5 12V5.5A1 1 0 0 1 6.5 4.5H11.5A1 1 0 0 1 12.5 5.5V12"),
    path("M3.5 14H1.75"),
    ...w.els,
  ]
})

// Nitrogen cart: a horizontal pressure tank on a trailer with a drawbar, the tank tinted.
def("nitrogen-cart", () => {
  const w = wheelsAt([[12.5, 17.5]])
  const tank = box(6, 5.5, 21, 12.5, 3.5)
  return [
    ...tinted(tank),
    path("M13.5 5.5V3.5"),
    path(d(cut([line([6, 15.5], [21, 15.5])], w.clear))),
    path("M8.5 12.5V15.5"),
    path("M18.5 12.5V15.5"),
    path("M6 15.5L3 12.5"),
    ...w.els,
  ]
})

// Ground power unit: the unit cart with a bolt inside and a cable to its plug.
const unitCart = (inside, outlet) => {
  const w = wheelsAt([
    [7, 17.5],
    [13.5, 17.5],
  ])
  const unit = box(3, 5.5, 17, 15.5, 2)
  return [path(d(unit, true), "t"), path(d(cut(unit, w.clear))), ...inside, ...outlet, ...w.els]
}
def("ground-power", () =>
  unitCart(
    [path("M11.5 7.5L8.5 10.5H11.5L8.5 13.5")],
    [path("M17 9H18.5A2 2 0 0 1 20.5 11V14"), rect(19, 14, 3, 3.5, 1)]
  )
)

// Air start unit: the unit cart with a fan inside and an air hose leaving it.
def("air-start", () =>
  unitCart(
    [circle(10, 10.5, 3), dotEl(10, 10.5, 1)],
    [path("M17 8.5H18A2.5 2.5 0 0 1 20.5 11V18.5"), path("M17 11.5H17.5")]
  )
)

// Trailer: an empty flat deck on its wheels, with a drawbar and tow eye.
def("trailer", () => {
  const w = wheelsAt([
    [11.5, 17.5],
    [17, 17.5],
  ])
  const deck = box(7, 11.5, 21, 15.5, 1)
  return [path(d(deck, true), "t"), path(d(cut(deck, w.clear))), path("M7 13.5H4.5"), circle(3.25, 13.5, 1.25), ...w.els]
})

// Dolly: a contoured cargo container on a deck with castors, the container tinted.
def("dolly", () => {
  const w = wheelsAt([
    [7, 18.25],
    [17, 18.25],
  ], 1.75)
  const container = poly(
    [
      [4, 13],
      [4, 8],
      [7.5, 4.5],
      [20, 4.5],
      [20, 13],
    ],
    [1, 1, 1, 1.5, 1]
  )
  return [...tinted(container), path(d(cut([line([2.5, 16], [21.5, 16])], w.clear))), ...w.els]
})

// Ladder: two rails and their rungs. A line glyph, untinted.
def("ladder", () => [
  path("M7.5 2.5V21.5"),
  path("M16.5 2.5V21.5"),
  path("M7.5 6.5H16.5"),
  path("M7.5 11H16.5"),
  path("M7.5 15.5H16.5"),
  path("M7.5 20H16.5"),
])

// Scissor lift: a railed basket on crossed arms over a wheeled base, the basket tinted.
def("scissor-lift", () => {
  const w = wheelsAt([
    [7, 19.75],
    [17, 19.75],
  ], 1.5)
  const basket = box(4.5, 3, 19.5, 8, 1.5)
  const behind = [line([8, 8], [16, 16])]
  const front = "M16 8L8 16"
  return [
    ...tinted(basket),
    path(d(cut(behind, disk([12, 12], 1.5)))),
    path(front),
    path(d(cut([line([4, 16.5], [20, 16.5])], w.clear))),
    ...w.els,
  ]
})

// Oxygen cart: an upright cylinder strapped to a hand truck, the cylinder tinted.
def("oxygen-cart", () => {
  const cylinder = box(6.5, 6, 13.5, 16.5, 3.5)
  return [
    ...tinted(cylinder),
    path("M10 6V3.5"),
    path("M8.5 3.5H11.5"),
    path("M13.5 9.5H17"),
    path("M17 2.5V19.5H6"),
    circle(17, 19.5, 2),
  ]
})

// Work stand: steps up to a railed platform, the stand tinted.
def("work-stand", () => {
  const stand = poly(
    [
      [3, 20.5],
      [3, 17],
      [6.5, 17],
      [6.5, 13.5],
      [10, 13.5],
      [10, 10],
      [20.5, 10],
      [20.5, 20.5],
    ],
    [0, 1, 1, 1, 1, 1, 1, 0]
  )
  return [
    ...tinted(stand),
    path(d(poly([
      [12, 10],
      [12, 4.5],
      [20.5, 4.5],
      [20.5, 10],
    ], [0, 1.5, 1.5, 0], false))),
  ]
})

// Aircraft jack: a tripod under its ram, the ram tinted.
def("aircraft-jack", () => [
  ...tinted(box(9.5, 7, 14.5, 14.5, 1)),
  path("M12 7V3.5"),
  path("M10 3.5H14"),
  path("M9.5 14.5L4 20"),
  path("M14.5 14.5L20 20"),
  path("M12 14.5V20.5"),
])

// Airstairs: a flight of steps on a vehicle, up to a railed top step, the steps tinted.
def("airstairs", () => {
  const w = wheelsAt([
    [6, 17.5],
    [17.5, 17.5],
  ])
  const steps = poly(
    [
      [3, 15.5],
      [3, 13],
      [6, 13],
      [6, 10],
      [9, 10],
      [9, 7],
      [12, 7],
      [12, 4.5],
      [17.5, 4.5],
      [17.5, 15.5],
    ],
    [0, 0.75, 0.75, 0.75, 0.75, 0.75, 0.75, 0.75, 1, 0]
  )
  return [
    path(d(steps, true), "t"),
    path(d(cut(steps, w.clear))),
    path(d(cut([line([17.5, 15.5], [21.5, 15.5])], w.clear))),
    path("M17.5 4.5V2"),
    ...w.els,
  ]
})

// Belt loader: an inclined belt on a vehicle base, the belt tinted.
def("belt-loader", () => {
  const w = wheelsAt([
    [7, 17.5],
    [17.5, 17.5],
  ])
  const belt = capsule([4.5, 13], [16.5, 3.5], 1.75)
  return [
    ...tinted(belt),
    path(d(cut([line([3, 15.5], [21.5, 15.5])], w.clear))),
    path("M12 9.4V15.5"),
    ...w.els,
  ]
})

// Ramp: an incline up to a raised deck, the ramp tinted.
def("ramp", () =>
  tinted(
    poly(
      [
        [2.5, 19.5],
        [10.5, 11.5],
        [21.5, 11.5],
        [21.5, 19.5],
      ],
      [0, 1, 1, 1]
    )
  )
)

// Scrubber: a floor scrubber with its handle, brush pad and suds, the body tinted.
def("scrubber", () => [
  ...tinted(box(9, 8.5, 20, 15.5, 2)),
  path("M9 10L5 6H3"),
  rect(10, 17.5, 9, 2.5, 1.25),
  dotEl(5, 16, 1),
  dotEl(6.5, 19.5, 1),
])

// ── Road vehicles, lifting and handling ──────────────────────────────────────────
//
// `van` and `bus` keep the truck's wheels and knock-out; the truck itself is `supplier`, the
// car `vehicle`. `hoist` and `crane` share one hook. `boom-lift` keeps the scissor lift's
// basket and base, on a 45° boom.

// Van: a one-piece body with a short bonnet, the body tinted.
def("van", () => {
  const w = wheelsAt([
    [6.5, 17.5],
    [17.25, 17.5],
  ])
  const body = poly(
    [
      [2.5, 15.5],
      [2.5, 6],
      [14.5, 6],
      [18, 10.5],
      [21.5, 11.5],
      [21.5, 15.5],
    ],
    [1, 1.5, 1, 1, 1, 1]
  )
  return [path(d(body, true), "t"), path(d(cut(body, w.clear))), path("M12 6V12"), ...w.els]
})

// Bus: a long box with a row of windows above the belt line, the body tinted.
def("bus", () => {
  const w = wheelsAt([
    [6.5, 17.5],
    [17.5, 17.5],
  ])
  const body = box(2.5, 4.5, 21.5, 15.5, 2)
  return [
    path(d(body, true), "t"),
    path(d(cut(body, w.clear))),
    path("M2.5 10.5H21.5"),
    path("M9 4.5V10.5"),
    path("M15.5 4.5V10.5"),
    ...w.els,
  ]
})

// Boom lift: the scissor lift's railed basket on a 45° boom from its wheeled base.
def("boom-lift", () => {
  const w = wheelsAt([
    [7, 19.75],
    [17, 19.75],
  ], 1.5)
  const basket = box(14, 3, 20.5, 7.5, 1.5)
  return [
    ...tinted(basket),
    path("M8 16.5L17 7.5"),
    path(d(cut([line([3.5, 16.5], [20.5, 16.5])], w.clear))),
    ...w.els,
  ]
})

/** A lifting hook hanging from (x, top): its shank, then a J ending level with the shank's foot, on the left. */
const hook = (x, top) => path(d([line([x, top], [x, top + 3]), arc([x - 2, top + 3], 2, 90, 270)]))

// Hoist: a chain hoist hanging from its beam, the body tinted, the hook below.
def("hoist", () => [
  ...tinted(box(8, 8.25, 16, 13.75, 2)),
  path("M5 5.25H19"),
  path("M12 5.25V8.25"),
  hook(12, 13.75),
])

// Crane: a tower crane, its jib across the mast under the apex, the counterweight tinted and the hook on its line.
def("crane", () => [
  ...tinted(box(2.5, 4.5, 5.5, 8.5, 1)),
  path("M2.5 4.5H21.5"),
  path("M7 4.5L9.5 2L12 4.5"),
  path("M9.5 2V20.5"),
  path("M6 20.5H13"),
  path("M19 4.5V11"),
  hook(19, 11),
])

// Pallet: a load on a pallet's top deck, the load tinted, the blocks between the decks.
def("pallet", () => {
  const load = poly(
    [
      [5.5, 14],
      [5.5, 5],
      [18.5, 5],
      [18.5, 14],
    ],
    [0, 1.5, 1.5, 0]
  )
  return [
    path(d(load, true), "t"),
    path(d(poly(
      [
        [5.5, 14],
        [5.5, 5],
        [18.5, 5],
        [18.5, 14],
      ],
      [0, 1.5, 1.5, 0],
      false
    ))),
    path("M2.5 14H21.5"),
    path("M2.5 19.5H21.5"),
    path("M4 14V19.5"),
    path("M12 14V19.5"),
    path("M20 14V19.5"),
  ]
})

// Trolley: a flat platform on castors with an upright handle, the platform tinted.
def("trolley", () => {
  const w = wheelsAt([
    [6.5, 18.25],
    [15.5, 18.25],
  ], 1.75)
  const deck = box(3, 12.5, 19, 15.5, 1)
  return [
    path(d(deck, true), "t"),
    path(d(cut(deck, w.clear))),
    path("M19 12.5V5.5A1 1 0 0 1 20 4.5H21.5"),
    ...w.els,
  ]
})

// Gas cylinder: an upright cylinder with a domed shoulder and its valve, the cylinder tinted.
def("gas-cylinder", () => {
  const cylinder = poly(
    [
      [7.5, 20.5],
      [7.5, 7],
      [16.5, 7],
      [16.5, 20.5],
    ],
    [1.5, 4.5, 4.5, 1.5]
  )
  return [...tinted(cylinder), path("M12 7V3.5"), path("M9.5 3.5H14.5")]
})

// Sprayer: a pressure tank with its pump handle and a wand, spraying as the de-icer does.
def("sprayer", () => [
  ...tinted(box(11.5, 8.5, 20, 20.5, 2.5)),
  path("M15.75 8.5V5"),
  path("M13.75 5H17.75"),
  path("M11.5 13H9.5L5.5 9L7 7.5"),
  dotEl(4, 4, 1),
  dotEl(7, 3, 1),
  dotEl(9.5, 4.5, 1),
])

// Snowflake: four arms on the 45° axes, the upright and level ones branched. A line glyph.
def("snowflake", () => [
  path("M12 3V21"),
  path("M3 12H21"),
  path("M6 6L18 18"),
  path("M18 6L6 18"),
  path("M9.75 3.5L12 5.75L14.25 3.5"),
  path("M9.75 20.5L12 18.25L14.25 20.5"),
  path("M3.5 9.75L5.75 12L3.5 14.25"),
  path("M20.5 9.75L18.25 12L20.5 14.25"),
])
