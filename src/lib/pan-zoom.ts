/**
 * The geometry of a pannable, zoomable stage: a camera in the stage's pixels, as
 * `translate(x, y) scale(k)` applied to the content. Pure, so it needs no DOM to test.
 */

/** Where the content sits: its origin in the stage's pixels, and its scale. */
export interface PanZoomCamera {
  x: number
  y: number
  k: number
}

/** A point in the stage's pixels. */
export interface PanZoomPoint {
  x: number
  y: number
}

/** A wheel's reach: pixels, whatever unit the device reports. */
export const wheelPixels = (delta: number, mode: number, pageHeight: number) => delta * (mode === 1 ? 16 : mode === 2 ? pageHeight : 1)

/** The zoom factor a wheel delta asks for; a trackpad pinch arrives with `ctrlKey`, in small steps. */
export const wheelZoom = (pixels: number, pinch: boolean) => Math.exp(-pixels * (pinch ? 0.01 : 0.0015))

/** Scale by `factor` around a point, which stays where it is. */
export function zoomAround(camera: PanZoomCamera, factor: number, point: PanZoomPoint, minZoom: number, maxZoom: number): PanZoomCamera {
  const k = Math.max(minZoom, Math.min(maxZoom, camera.k * factor))
  const ratio = k / camera.k
  return { k, x: point.x - (point.x - camera.x) * ratio, y: point.y - (point.y - camera.y) * ratio }
}

/** The midpoint of two fingers and the distance between them. */
export const spread = (a: PanZoomPoint, b: PanZoomPoint) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, distance: Math.hypot(a.x - b.x, a.y - b.y) })

/** The camera for a pinch: scaled by how far the fingers have spread and carried with their midpoint. */
export function pinchCamera(start: PanZoomCamera, from: ReturnType<typeof spread>, to: ReturnType<typeof spread>, minZoom: number, maxZoom: number): PanZoomCamera {
  const k = Math.max(minZoom, Math.min(maxZoom, (start.k * to.distance) / Math.max(from.distance, 1)))
  const ratio = k / start.k
  return { k, x: to.x - (from.x - start.x) * ratio, y: to.y - (from.y - start.y) * ratio }
}

/** Keep content of a size covering or centred in a stage, so a picture cannot be lost off screen. */
export function containCamera(camera: PanZoomCamera, content: { width: number; height: number }, stage: { width: number; height: number }): PanZoomCamera {
  const axis = (position: number, size: number, room: number) => (size <= room ? (room - size) / 2 : Math.min(0, Math.max(room - size, position)))
  return { k: camera.k, x: axis(camera.x, content.width * camera.k, stage.width), y: axis(camera.y, content.height * camera.k, stage.height) }
}

/** The value for an element's `transform`. */
export const cameraTransform = ({ x, y, k }: PanZoomCamera) => `translate3d(${x}px, ${y}px, 0) scale(${k})`
