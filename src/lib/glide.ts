import { useDirection } from "./locale/direction.js"
import { useLayoutEffect, useEffect, useState, type DependencyList, type RefObject } from "react"
import { observeElementSizes } from "./resize-observer.js"

/** The axis a glide indicator travels along. */
export type GlideAxis = "x" | "y"

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect
const previous = new WeakMap<HTMLElement, number>()

/**
 * Place a glide indicator (the `fa-glide` recipe in recipes.css) over `target`. Writes the
 * indicator's own `--glide-start` / `--glide-end` (the target's offsets from the container's
 * start and end along `axis`), `--glide-extent` (the container's scrollable length, so the
 * indicator also reaches items scrolled out of view) and `data-direction` (`forward` or
 * `backward` relative to the last placement), so the leading edge springs ahead and the
 * trailing edge follows. The container is the indicator's parent and must be the
 * positioned ancestor `target` is measured from. Nothing is written to an ancestor.
 *
 * Returns whether the indicator has a target. Without one its variables are removed.
 */
export function placeGlide(indicator: HTMLElement, target: HTMLElement | null, axis: GlideAxis = "x"): boolean {
  const container = indicator.parentElement
  if (!target || !container) {
    for (const name of ["--glide-start", "--glide-end", "--glide-extent"]) indicator.style.removeProperty(name)
    indicator.removeAttribute("data-direction")
    previous.delete(indicator)
    return false
  }
  let start = axis === "x" ? target.offsetLeft : target.offsetTop
  const size = axis === "x" ? target.offsetWidth : target.offsetHeight
  // The container's own length, or further when its items scroll beyond it. (scrollWidth
  // would also count the indicator, which never lets the extent shrink.)
  let extent = axis === "x" ? container.clientWidth : container.clientHeight
  for (const child of container.children) {
    if (child === indicator || !(child instanceof HTMLElement)) continue
    extent = Math.max(extent, axis === "x" ? child.offsetLeft + child.offsetWidth : child.offsetTop + child.offsetHeight)
  }
  // RTL overflow extends into negative offsetLeft coordinates. Anchor the physical
  // clipping strip to that edge while keeping clip-path offsets non-negative.
  if (axis === "x") {
    let left = 0
    for (const child of container.children) {
      if (child !== indicator && child instanceof HTMLElement) left = Math.min(left, child.offsetLeft)
    }
    extent -= left
    start -= left
    indicator.style.left = `${left}px`
  }
  const last = previous.get(indicator)
  if (last !== undefined && last !== start) indicator.setAttribute("data-direction", start > last ? "forward" : "backward")
  previous.set(indicator, start)
  indicator.setAttribute("data-axis", axis)
  indicator.style.setProperty("--glide-start", `${start}px`)
  indicator.style.setProperty("--glide-end", `${extent - start - size}px`)
  indicator.style.setProperty("--glide-extent", `${extent}px`)
  return true
}

/**
 * Keep a glide indicator over the item that matches `selector` among the indicator's
 * siblings, following container and item resizes (one placement per animation frame).
 * Place the indicator before the items or give the items a higher stacking order.
 *
 * Returns `true` once the indicator has been placed. Render the indicator `hidden` until
 * then, so it appears in place rather than sliding in, and let the selected item paint its
 * own selected style meanwhile (server rendering, first paint).
 */
export function useGlide(indicator: RefObject<HTMLElement | null>, selector: string, axis: GlideAxis = "x", deps: DependencyList = []): boolean {
  const direction = useDirection()
  const [placed, setPlaced] = useState(false)
  useIsoLayoutEffect(() => {
    const element = indicator.current
    const parent = element?.parentElement
    if (!element || !parent) return
    const place = () => {
      const target = parent.querySelector<HTMLElement>(`:scope > ${selector}`)
      setPlaced(placeGlide(element, target, axis))
    }
    place()
    // The shared observer coalesces a frame's size changes into one call.
    const observer = observeElementSizes(place)
    observer.observe(parent)
    for (const child of parent.children) if (child !== element) observer.observe(child)
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the caller lists what moves the target
  }, [indicator, selector, axis, direction, ...deps])
  return placed
}
