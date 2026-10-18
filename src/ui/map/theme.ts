/**
 * Read the map's theme from the CSS: every colour is a component token in map.css derived
 * from Glass UX roles (the data hue, ink, canvas), resolved by the browser on a probe element
 * inside the map (so palette and mode islands apply) and converted to rgba for MapLibre.
 */
import { luminance, parseColour, toCss, type Rgba } from "./colour.js"
import type { MapTheme } from "./style.js"

/** Token for each theme colour (map.css declares them on .fa-map). */
export const MAP_THEME_TOKENS = {
  glow: "--fa-map-glow",
  glowCore: "--fa-map-glow-core",
  land: "--fa-map-land",
  water: "--fa-map-water",
  road: "--fa-map-road",
  roadMajor: "--fa-map-road-major",
  boundary: "--fa-map-boundary",
  building: "--fa-map-building",
  label: "--fa-map-label",
  labelStrong: "--fa-map-label-strong",
  labelHalo: "--fa-map-label-halo",
} as const satisfies Record<Exclude<keyof MapTheme, "mode">, string>

const FALLBACK: Rgba = { r: 128, g: 128, b: 128, a: 1 }

/** Resolve one token to a colour via a probe's computed `color`. */
function resolve(probe: HTMLElement, token: string): Rgba {
  probe.style.color = `var(${token})`
  return parseColour(getComputedStyle(probe).color) ?? FALLBACK
}

export function readMapTheme(root: HTMLElement): MapTheme {
  const probe = document.createElement("span")
  probe.hidden = true
  root.append(probe)
  try {
    const colours = Object.fromEntries(Object.entries(MAP_THEME_TOKENS).map(([key, token]) => [key, toCss(resolve(probe, token))])) as Omit<MapTheme, "mode">
    const canvas = resolve(probe, "--canvas")
    return { mode: luminance(canvas) < 0.2 ? "dark" : "light", ...colours }
  } finally {
    probe.remove()
  }
}

/** A length token in CSS pixels (the fit padding the skeleton and the camera share). */
export function readLength(root: HTMLElement, token: string, fallback = 0): number {
  const probe = document.createElement("span")
  probe.style.position = "absolute"
  probe.style.visibility = "hidden"
  probe.style.width = `var(${token})`
  root.append(probe)
  const width = probe.getBoundingClientRect().width
  probe.remove()
  return Number.isFinite(width) && width > 0 ? width : fallback
}

/** Re-read the theme when the appearance changes: mode, palette, glass, motion, density. */
export function observeAppearance(root: HTMLElement, onChange: () => void): () => void {
  const targets = new Set<Element>([document.documentElement])
  for (let node: Element | null = root; node; node = node.parentElement) if (node.hasAttribute("data-mode") || node.hasAttribute("data-palette")) targets.add(node)
  const observer = new MutationObserver(onChange)
  for (const target of targets) observer.observe(target, { attributes: true, attributeFilter: ["data-mode", "data-palette", "data-glass", "data-motion", "style", "class"] })
  const media = ["(prefers-color-scheme: dark)", "(prefers-reduced-motion: reduce)"].map((query) => window.matchMedia(query))
  for (const query of media) query.addEventListener("change", onChange)
  return () => {
    observer.disconnect()
    for (const query of media) query.removeEventListener("change", onChange)
  }
}
