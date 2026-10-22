/**
 * Full bleed — imagery (a map, a network map) that fills the whole primary window, with
 * the page chrome floating over it on the canvas: the header above, the status strip below,
 * a panel beside it (R4.6, R4.7). The dashboard's map and a network's map use it.
 *
 *   const bleed = useBleed(enabled)
 *   <EntityIdentity tier="header" {...bleed.chrome("top")} />
 *   <div {...bleed.layer("my-map")}><GeoMap insets={bleed.insets} /></div>
 *   <WindowFrame.Body variant="fill" className={bleed.spacer} />
 *   <WindowFrame.StatusBar {...bleed.chrome("bottom")} />
 *
 * The layer is the primary window's first positioned child after the header: it fills the
 * window (its containing block) under everything else. The body becomes a spacer that lets
 * the pointer through to the imagery, except for chrome inside it (a floating panel).
 *
 * `insets` is how far the chrome reaches into the layer from each edge, measured before
 * paint (the header wraps, the strip hides in a narrow window, a panel moves under the map
 * in one), so the imagery frames its content in the part that shows. It is `null` while the
 * layer is on but not yet measured (the server render, the first client render): imagery
 * holds its loading shape back until then, so nothing paints in the wrong place and jumps
 * (docs/performance.md, Dashboard CLS). `undefined` when the layer is off.
 */
import { useCallback, useLayoutEffect, useState } from "react"
import { cx } from "../lib/cx.js"
import { observeElementSizes } from "../lib/resize-observer.js"

const useIsomorphicLayoutEffect = typeof window === "undefined" ? () => {} : useLayoutEffect

/** Which edge a piece of chrome covers. "auto" reads it from the box: a bar spanning the layer is top or bottom by where it sits, anything narrower is a side. */
export type BleedEdge = "top" | "right" | "bottom" | "left" | "auto"

export interface BleedInsets {
  top: number
  right: number
  bottom: number
  left: number
}

export interface BleedChromeOptions {
  /** Put it in the imagery context (R4.7): bare text and controls on the canvas. Default true; a glass panel has its own material, so pass false. */
  imagery?: boolean
}

export interface BleedChromeProps {
  className?: string
  "data-bleed-chrome"?: Exclude<BleedEdge, "auto">
}

export interface Bleed {
  /** Whether the layer is on. */
  on: boolean
  /** The chrome's reach into the layer; null while measuring, undefined when off. */
  insets: BleedInsets | null | undefined
  /** Props for the full-bleed layer (the element that holds the imagery), with its own classes. */
  layer: (className?: string) => { ref: (element: HTMLDivElement | null) => void; className?: string }
  /** The body's class while the layer is on: a spacer the pointer passes through. */
  spacer: string | undefined
  /** Props for a piece of chrome over the layer: the header, the status strip, a floating panel. */
  chrome: (edge?: BleedEdge, options?: BleedChromeOptions) => BleedChromeProps
}

const CHROME_CLASS = "fa-bleed-chrome"
const OFF: BleedChromeProps = {}

/** The full-bleed layout's state: the layer, its insets and the props its chrome carries. */
export function useBleed(enabled: boolean): Bleed {
  const [element, setElement] = useState<HTMLDivElement | null>(null)
  const insets = useBleedInsets(element, enabled)
  const chrome = useCallback(
    (edge: BleedEdge = "auto", { imagery = true }: BleedChromeOptions = {}): BleedChromeProps =>
      enabled ? { className: imagery ? `${CHROME_CLASS} over-imagery` : CHROME_CLASS, "data-bleed-chrome": edge === "auto" ? undefined : edge } : OFF,
    [enabled]
  )
  const layer = useCallback((className?: string) => ({ ref: setElement, className: cx(enabled && "fa-bleed", className) || undefined }), [enabled])
  return { on: enabled, insets, layer, spacer: enabled ? "fa-bleed-spacer" : undefined, chrome }
}

const sameInsets = (a: BleedInsets, b: BleedInsets) => a.top === b.top && a.right === b.right && a.bottom === b.bottom && a.left === b.left

/**
 * Measure the chrome over a full-bleed layer: every `.fa-bleed-chrome` in the layer's parent
 * (the window) outside the layer itself. Chrome that is not displayed covers nothing. Laid out
 * before paint, and again whenever the layer, the window's parts or the chrome resize or the
 * chrome is swapped (a panel showing another thing).
 */
export function useBleedInsets(layer: HTMLElement | null, enabled: boolean): BleedInsets | null | undefined {
  const [insets, setInsets] = useState<BleedInsets | undefined>(undefined)
  useIsomorphicLayoutEffect(() => {
    if (!enabled || !layer) return
    const view = layer.parentElement
    if (!view) return
    const observer = observeElementSizes(() => measure())
    const observed = new Set<Element>()
    const observe = (target: Element) => {
      if (observed.has(target)) return
      observed.add(target)
      observer.observe(target)
    }
    function measure() {
      const box = layer!.getBoundingClientRect()
      const next: BleedInsets = { top: 0, right: 0, bottom: 0, left: 0 }
      for (const chrome of view!.querySelectorAll<HTMLElement>(`.${CHROME_CLASS}`)) {
        if (layer!.contains(chrome)) continue
        observe(chrome)
        // Not displayed (a status strip hidden in a narrow window): it covers nothing.
        if (!chrome.offsetParent) continue
        const rect = chrome.getBoundingClientRect()
        let edge = chrome.dataset.bleedChrome as BleedEdge | undefined
        if (!edge || edge === "auto") {
          const spans = rect.width >= box.width / 2
          const middleX = (rect.left + rect.right) / 2
          const middleY = (rect.top + rect.bottom) / 2
          edge = spans ? (middleY < box.top + box.height / 2 ? "top" : "bottom") : middleX < box.left + box.width / 2 ? "left" : "right"
        }
        if (edge === "top") next.top = Math.max(next.top, rect.bottom - box.top)
        else if (edge === "bottom") next.bottom = Math.max(next.bottom, box.bottom - rect.top)
        else if (edge === "left") next.left = Math.max(next.left, rect.right - box.left)
        else next.right = Math.max(next.right, box.right - rect.left)
      }
      setInsets((current) => (current && sameInsets(current, next) ? current : next))
    }
    measure()
    observe(layer)
    for (const child of view.children) observe(child)
    // Chrome swapped for other chrome (a panel showing another thing) need not resize anything.
    // Changes inside the layer or inside a chrome (a status bar's live text) are left out:
    // the size observer already sees a chrome that changes size.
    const mutations = new MutationObserver((records) => {
      if (records.some((record) => !layer.contains(record.target) && !(record.target as Element).closest?.(`.${CHROME_CLASS}`))) measure()
    })
    mutations.observe(view, { childList: true, subtree: true })
    return () => {
      observer.disconnect()
      mutations.disconnect()
    }
  }, [layer, enabled])
  return enabled ? (insets ?? null) : undefined
}
