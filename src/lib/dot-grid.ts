/**
 * Hand a canvas's camera to its `fa-dot-grid` backdrop (recipes.css): the world origin in the
 * element's pixels and the zoom. Called from the canvas's per-frame camera write, so the dots
 * pan and scale with the content without a React render.
 */
export function paintDotGrid(element: HTMLElement | null, camera: { x: number; y: number; k: number }) {
  if (!element) return
  element.style.setProperty("--dot-grid-x", `${camera.x}px`)
  element.style.setProperty("--dot-grid-y", `${camera.y}px`)
  element.style.setProperty("--dot-grid-scale", String(camera.k))
}
