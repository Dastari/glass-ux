/**
 * The geometry of a viewed picture. Pure, so it needs no DOM to test. A scale `k` is in the
 * picture's own pixels: 1 is actual size. The fitted scale depends on the picture's turned
 * shape and on the stage, so every caller reads it afresh.
 */

/** A width and height in pixels. */
export interface PictureBox {
  width: number
  height: number
}

/** How a picture is turned on screen: nothing here changes its pixels. */
export interface PictureView {
  /** Clockwise quarter turns; negative is anticlockwise. */
  turns: number
  flipX: boolean
  flipY: boolean
}

/** The view a picture starts in. */
export const UNTURNED: PictureView = { turns: 0, flipX: false, flipY: false }

/** The shape held for a picture that states no size until it has loaded. */
export const UNKNOWN_SHAPE: PictureBox = { width: 1200, height: 800 }

/** How close two scales must be to count as the same stop, as a ratio. */
const SAME_STOP = 1.03

/** The box a picture takes when turned: a quarter turn swaps its sides. */
export const turnedBox = ({ width, height }: PictureBox, turns: number): PictureBox => (turns % 2 === 0 ? { width, height } : { width: height, height: width })

/** The scale that shows the whole picture, never above actual size. A stage with no size yet does not constrain it. */
export function fitScale(content: PictureBox, stage: PictureBox) {
  const axis = (room: number, size: number) => (room > 0 && size > 0 ? room / size : 1)
  return Math.min(1, axis(stage.width, content.width), axis(stage.height, content.height))
}

/** The scales + and − stop at, ascending: fit, the steps as multiples of fit, actual size, then the limit. */
export function zoomStops(fit: number, steps: readonly number[], max: number) {
  const top = Math.max(fit, max)
  const stops = [fit, top]
  const add = (k: number) => {
    if (k > fit && k < top && stops.every((stop) => Math.max(stop, k) / Math.min(stop, k) >= SAME_STOP)) stops.push(k)
  }
  for (const step of steps) add(step * fit)
  add(1)
  return stops.sort((a, b) => a - b).filter((stop, index, all) => stop !== all[index - 1])
}

/** The next stop from a scale, up (`1`) or down (`-1`); the end stop when there is none further. */
export function nextStop(stops: readonly number[], k: number, direction: 1 | -1) {
  const beyond = direction > 0 ? stops.find((stop) => stop > k * 1.001) : stops.findLast((stop) => stop < k * 0.999)
  return beyond ?? (direction > 0 ? stops.at(-1)! : stops[0]!)
}

/** A view after a quarter turn. A single flip reverses the sense of a stored turn, so the picture still turns the way asked. */
export function turnView(view: PictureView, direction: 1 | -1): PictureView {
  return { ...view, turns: view.turns + (view.flipX === view.flipY ? direction : -direction) }
}

/** The `transform` of a picture about its centre: turned first, then flipped along the screen's axes. */
export const viewTransform = ({ turns, flipX, flipY }: PictureView) => `scale(${flipX ? -1 : 1}, ${flipY ? -1 : 1}) rotate(${turns * 90}deg)`
