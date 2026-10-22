import { prefersReducedMotion } from "../motion.js"
import { mediaList } from "../use-media-query.js"

/**
 * Runtime side of the material switch, for optics that script drives.
 *
 * CSS honours the switches through tokens (--motion-scale, the optics tokens in glass.css).
 * Script that animates or tracks the pointer reads the same rules here, so an effect never
 * keeps moving after the CSS has stopped.
 */

const REDUCED_TRANSPARENCY = "(prefers-reduced-transparency: reduce)"
const FINE_POINTER = "(hover: hover) and (pointer: fine)"
/** Longer than the highlight's fade-out (--duration-base). */
const FADE_MS = 600

const matches = (query: string) => typeof window !== "undefined" && typeof window.matchMedia === "function" && mediaList(query).matches

/**
 * Whether glass optics (lensing, specular highlights) are off: the Solid material, or the
 * operating system's reduced-transparency preference unless Appearance selects Glass
 * (`data-glass="full"`). This is the rule glass.css applies to the optics tokens.
 */
export function isTransparencyReduced(root: HTMLElement | null = typeof document === "undefined" ? null : document.documentElement): boolean {
  const glass = root?.dataset.glass
  if (glass === "solid") return true
  if (glass === "full") return false
  return matches(REDUCED_TRANSPARENCY)
}

/** Elements that catch the pointer's light: the `fa-lit` recipe (recipes.css). */
export const POINTER_LIGHT_SELECTOR = ".fa-lit"

let installs = 0
let uninstall: (() => void) | null = null

/**
 * Let lit glass (`fa-lit`) reflect the pointer: a specular highlight follows a fine pointer
 * across the hovered control. One passive document listener, throttled to one write per
 * animation frame, sets `--light-x` and `--light-y` on the hovered element only — never on an
 * ancestor, so nothing else restyles. It writes nothing for touch, while motion is reduced or
 * in the Solid material; the highlight then rests at the element's top edge.
 *
 * `AppearanceProvider` installs it. Call it yourself only without the provider. Calls are
 * reference-counted; the returned function removes this installation.
 */
export function installPointerLight(): () => void {
  if (typeof document === "undefined") return () => {}
  installs += 1
  if (installs === 1) uninstall = listen()
  let removed = false
  return () => {
    if (removed) return
    removed = true
    installs -= 1
    if (installs === 0) {
      uninstall?.()
      uninstall = null
    }
  }
}

function listen(): () => void {
  const fine = window.matchMedia(FINE_POINTER)
  let lit: HTMLElement | null = null
  let target: Element | null = null
  let x = 0
  let y = 0
  let frame = 0

  const clear = (element: HTMLElement | null) => {
    element?.style.removeProperty("--light-x")
    element?.style.removeProperty("--light-y")
  }
  const release = () => {
    clear(lit)
    lit = null
  }
  const paint = () => {
    frame = 0
    if (!fine.matches || prefersReducedMotion() || isTransparencyReduced()) {
      release()
      return
    }
    const next = target?.closest<HTMLElement>(POINTER_LIGHT_SELECTOR) ?? null
    if (!next) return
    if (next !== lit) {
      // The previous element's light fades out where it was, then returns to rest.
      const previous = lit
      if (previous) window.setTimeout(() => previous !== lit && clear(previous), FADE_MS)
      lit = next
    }
    const rect = next.getBoundingClientRect()
    next.style.setProperty("--light-x", `${Math.round(x - rect.left)}px`)
    next.style.setProperty("--light-y", `${Math.round(y - rect.top)}px`)
  }
  const move = (event: PointerEvent) => {
    if (event.pointerType === "touch") return
    target = event.target instanceof Element ? event.target : null
    x = event.clientX
    y = event.clientY
    if (!frame) frame = requestAnimationFrame(paint)
  }

  document.addEventListener("pointermove", move, { passive: true })
  document.addEventListener("pointerdown", move, { passive: true })
  return () => {
    document.removeEventListener("pointermove", move)
    document.removeEventListener("pointerdown", move)
    if (frame) cancelAnimationFrame(frame)
    release()
  }
}
