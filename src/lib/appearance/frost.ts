/**
 * Baked frost: the rendering an application selects with
 * `configureAppearance({ glassRendering: "baked" })`.
 *
 * Panel and chrome layers on the page canvas show the canvas blurred once into a bitmap,
 * under their own fill, instead of blurring what is behind them on every frame. The canvas
 * does not move, so at rest the result matches the live blur; a layer pays nothing to redraw
 * when something animates inside or near it (docs/performance.md, "Baked frost").
 *
 * The live blur returns wherever the bitmap would be wrong or dear: while a scroller moves
 * layers (`data-frost-live` on it), while a layer slides (a transform transition), while the
 * window is resized and before the first bake. Overlays, floating windows, mode islands and
 * layers on any other canvas always blur live (glass.css). Browsers without
 * `background-clip: border-area`, and iOS/iPadOS (fixed backgrounds scroll there), keep the
 * live blur. The renderer itself (frost-render.ts) loads only when baked rendering is on.
 */
import type { FrostFilter } from "./frost-render.js";

/** Set on a scroller while it scrolls, and on a layer while it slides: its layers blur live. */
export const FROST_LIVE_ATTRIBUTE = "data-frost-live";
/** Set on <html> once the frost is baked; glass.css shows it only then. */
export const FROST_READY_ATTRIBUTE = "data-frost";
/** Set on the canvas element the frost was baked from. */
export const FROST_CANVAS_ATTRIBUTE = "data-frost-canvas";

const LAYERS = ".glass-panel, .glass-chrome";
/** How long a scroller stays live after its last scroll event. */
const SETTLE_MS = 200;
const LEVELS = ["full", "reduced"] as const;
const MATERIALS = ["panel", "chrome"] as const;

let installs = 0;
let uninstall: (() => void) | null = null;

/**
 * Bake the canvas for panels and chrome while the document selects baked rendering
 * (`data-glass-rendering="baked"` on <html>, from `configureAppearance`). Re-bakes when the
 * mode, palette, background, material level or window size changes.
 *
 * `AppearanceProvider` installs it. Call it yourself only without the provider. Calls are
 * reference-counted; the returned function removes this installation.
 */
export function installBakedFrost(): () => void {
  if (typeof document === "undefined") return () => {};
  installs += 1;
  if (installs === 1) uninstall = listen();
  let removed = false;
  return () => {
    if (removed) return;
    removed = true;
    installs -= 1;
    if (installs === 0) {
      uninstall?.();
      uninstall = null;
    }
  };
}

/** Whether this browser can show baked frost: border-area materials and fixed backgrounds. */
function supported() {
  if (typeof CSS === "undefined" || !CSS.supports("background-clip", "border-area")) return false;
  const apple = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  return !apple;
}

/** Each level's blur and saturation as a hidden probe resolves them (a level is never more transparent than the page's). */
function filters(): Record<(typeof LEVELS)[number], Record<(typeof MATERIALS)[number], FrostFilter>> {
  const out = {} as ReturnType<typeof filters>;
  for (const level of LEVELS) {
    const probe = document.createElement("div");
    probe.hidden = true;
    probe.dataset.glass = level;
    document.body.append(probe);
    const style = getComputedStyle(probe);
    const saturate = parseFloat(style.getPropertyValue("--glass-saturate")) || 1;
    out[level] = {
      panel: { blur: parseFloat(style.getPropertyValue("--glass-blur-panel")) || 0, saturate },
      chrome: { blur: parseFloat(style.getPropertyValue("--glass-blur-chrome")) || 0, saturate },
    };
    probe.remove();
  }
  return out;
}

function listen(): () => void {
  const root = document.documentElement;
  const sheet = document.createElement("style");
  sheet.dataset.glassFrost = "";
  document.head.append(sheet);
  let urls: string[] = [];
  let generation = 0;
  let timer = 0;
  let canvas: Element | null = null;

  const active = () => root.dataset.glassRendering === "baked" && supported();
  const unready = () => {
    root.removeAttribute(FROST_READY_ATTRIBUTE);
    canvas?.removeAttribute(FROST_CANVAS_ATTRIBUTE);
    canvas = null;
  };

  const bake = async () => {
    const id = ++generation;
    if (!active()) return unready();
    const page = document.querySelector(".canvas-ambient, .canvas-background");
    const levels = filters();
    const wanted = LEVELS.flatMap((level) => MATERIALS.map((material) => ({ level, material, filter: levels[level][material] })));
    const distinct = [...new Map(wanted.filter((entry) => entry.filter.blur > 0).map((entry) => [`${entry.filter.blur}/${entry.filter.saturate}`, entry.filter])).entries()];
    if (!page || !distinct.length) return unready();
    try {
      const { renderFrost } = await import("./frost-render.js");
      const { clientWidth: width, clientHeight: height } = root;
      const blobs = await renderFrost(page, document.querySelector(".canvas-silk"), width, height, distinct.map(([, filter]) => filter));
      if (id !== generation) return;
      const next = blobs.map((blob) => URL.createObjectURL(blob));
      const byKey = new Map(distinct.map(([key], index) => [key, next[index]]));
      const declarations = wanted.map(({ level, material, filter }) => {
        const url = byKey.get(`${filter.blur}/${filter.saturate}`);
        return `--glass-baked-${material}-${level}: ${url ? `url("${url}")` : "none"};`;
      });
      sheet.textContent = `:root { ${declarations.join(" ")} }`;
      for (const url of urls) URL.revokeObjectURL(url);
      urls = next;
      if (canvas !== page) {
        canvas?.removeAttribute(FROST_CANVAS_ATTRIBUTE);
        canvas = page;
        canvas.setAttribute(FROST_CANVAS_ATTRIBUTE, "");
      }
      root.setAttribute(FROST_READY_ATTRIBUTE, "");
    } catch (error) {
      // An unsupported canvas (or a failed load) keeps the live blur.
      if (id === generation) unready();
      if (!(error instanceof Error && error.name === "Unsupported")) console.warn("glass-ux: baked frost unavailable", error);
    }
  };

  const schedule = (delay = 0) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      timer = 0;
      if (typeof requestIdleCallback === "function") requestIdleCallback(() => void bake(), { timeout: 500 });
      else void bake();
    }, delay);
  };

  // While the window changes size the old bake no longer lines up: blur live until it is redone.
  const resize = () => {
    if (!root.hasAttribute(FROST_READY_ATTRIBUTE)) return schedule(250);
    root.removeAttribute(FROST_READY_ATTRIBUTE);
    schedule(250);
  };

  // A scroller that moves layers, and a layer that slides, blur live for the movement.
  const moving = new Map<Element, number>();
  const settle = (element: Element) => {
    window.clearTimeout(moving.get(element));
    moving.delete(element);
    element.removeAttribute(FROST_LIVE_ATTRIBUTE);
  };
  const scroll = (event: Event) => {
    if (!root.hasAttribute(FROST_READY_ATTRIBUTE)) return;
    const target = event.target === document ? root : event.target;
    if (!(target instanceof Element)) return;
    if (!moving.has(target)) {
      if (!target.querySelector(LAYERS)) return;
      target.setAttribute(FROST_LIVE_ATTRIBUTE, "");
    }
    // Settle once scrolling has paused, not at each scrollend: wheel steps a moment apart
    // would otherwise switch between the bitmap and the live blur at every step.
    window.clearTimeout(moving.get(target));
    moving.set(target, window.setTimeout(() => settle(target), SETTLE_MS));
  };
  const slides = new WeakMap<Element, number>();
  const transitionStart = (event: TransitionEvent) => {
    if (!root.hasAttribute(FROST_READY_ATTRIBUTE)) return;
    const target = event.target;
    if (!(target instanceof Element) || !/^(transform|translate)$/.test(event.propertyName) || !target.matches(LAYERS)) return;
    slides.set(target, (slides.get(target) ?? 0) + 1);
    target.setAttribute(FROST_LIVE_ATTRIBUTE, "");
  };
  const transitionEnd = (event: TransitionEvent) => {
    const target = event.target;
    if (!(target instanceof Element) || !slides.has(target) || !/^(transform|translate)$/.test(event.propertyName)) return;
    const count = slides.get(target)! - 1;
    if (count > 0) return void slides.set(target, count);
    slides.delete(target);
    target.removeAttribute(FROST_LIVE_ATTRIBUTE);
  };

  const observer = new MutationObserver(() => schedule());
  observer.observe(root, { attributes: true, attributeFilter: ["data-glass-rendering", "data-mode", "data-palette", "data-background", "data-glass", "style", "class"] });
  if (document.body) observer.observe(document.body, { attributes: true, attributeFilter: ["data-mode", "data-palette", "data-background", "data-glass", "style", "class"] });
  const media = ["(prefers-color-scheme: dark)", "(prefers-reduced-transparency: reduce)"].map((query) => window.matchMedia(query));
  const change = () => schedule();
  for (const query of media) query.addEventListener("change", change);
  window.addEventListener("resize", resize, { passive: true });
  document.addEventListener("scroll", scroll, { capture: true, passive: true });
  document.addEventListener("transitionrun", transitionStart, true);
  document.addEventListener("transitionend", transitionEnd, true);
  document.addEventListener("transitioncancel", transitionEnd, true);
  schedule();

  return () => {
    generation += 1;
    window.clearTimeout(timer);
    observer.disconnect();
    for (const query of media) query.removeEventListener("change", change);
    window.removeEventListener("resize", resize);
    document.removeEventListener("scroll", scroll, true);
    document.removeEventListener("transitionrun", transitionStart, true);
    document.removeEventListener("transitionend", transitionEnd, true);
    document.removeEventListener("transitioncancel", transitionEnd, true);
    for (const element of moving.keys()) settle(element);
    unready();
    sheet.remove();
    for (const url of urls) URL.revokeObjectURL(url);
  };
}
