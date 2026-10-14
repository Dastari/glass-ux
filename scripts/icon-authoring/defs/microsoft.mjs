import { any, circle, circlePrim, cut, d, disk, dome, dotEl, line, nearPrims, path, rect, rrect } from "../lib.mjs"
import { cloudPrims } from "./rmm.mjs"

export const icons = {}
const def = (name, fn) => (icons[name] = fn)

/** Inside an axis-aligned box (a knockout region that covers a shape's face). */
const inBox = (x0, y0, x1, y1) => (pt) => pt[0] > x0 && pt[0] < x1 && pt[1] > y0 && pt[1] < y1

/** An envelope: the `mail` outline and flap, scaled to its box (mail's proportions). */
function envelope(x, y, w, h, r) {
  const q = (n) => Math.round(n * 4) / 4
  const outline = rrect(x, y, w, h, r)
  const half = q(w * 0.28)
  const top = q(y + h * 0.32)
  const mid = [x + w / 2, q(top + half * 0.7)]
  return { outline, flap: [line([mid[0] - half, top], mid), line(mid, [mid[0] + half, top])] }
}

// ── Microsoft 365 ─────────────────────────────────────────────────────────────
// A customer's Microsoft 365 tenant: the shared cloud with an envelope in front of it (its
// mail). Not Microsoft's logo (R19.3): our cloud, our envelope, the overlay modifier.
def("microsoft-365", () => {
  const env = envelope(10.75, 12, 11, 9, 2)
  const cloud = cut(cloudPrims(-1, -2.25), any(nearPrims(env.outline, 3), inBox(10.75, 12, 21.75, 21)))
  return [path(d(env.outline, true), "t"), path(d(cloud)), path(d(env.outline, true)), path(d(env.flap))]
})

// ── Mailbox kinds ─────────────────────────────────────────────────────────────
// A user mailbox is `mail`. The other kinds Exchange knows:

/** A shared mailbox: the envelope with a person in front of it (people use it, nobody owns it). */
def("mail-shared", () => {
  const env = envelope(2.25, 3.5, 15.5, 11.5, 2)
  const head = circlePrim(17, 12.25, 2.5, 90)
  const shoulders = dome(12.25, 21.75, 20.75, 16.5)
  const knock = any(nearPrims([head, shoulders], 3), disk([17, 12.25], 2.5), inBox(12.25, 16.5, 21.75, 20.75))
  return [path(d(env.outline, true), "t"), path(d(cut(env.outline, knock))), path(d(cut(env.flap, knock))), circle(17, 12.25, 2.5), path(d([shoulders]))]
})

/** A room mailbox (a meeting room you book): a door on its floor, the handle a dot. */
def("room", () => {
  const door = "M6 21V5.5A2.5 2.5 0 0 1 8.5 3H15.5A2.5 2.5 0 0 1 18 5.5V21"
  return [path(`${door}Z`, "t"), path(door), path("M3.5 21H20.5"), dotEl(14.75, 12.5, 1.15)]
})

/** An equipment mailbox (a projector, a pool car): a projector, its lens and status light. */
def("equipment", () => [
  rect(2.5, 5.25, 19, 11, 2.5, "t"),
  rect(2.5, 5.25, 19, 11, 2.5),
  circle(15.25, 10.75, 2.5),
  dotEl(7, 10.75, 1.15),
  path("M6.5 16.25V18.75"),
  path("M17.5 16.25V18.75"),
])
