/**
 * Appearance preferences: the runtime side of the token knobs.
 *
 * Preferences are applied to <html> as data attributes (mode, palette, density, glass,
 * motion, font roles) and inline custom properties (radius scale, border width, UI scale,
 * custom accent). The same logic runs as a blocking inline script before first paint, so
 * the first frame is already in the right theme and font.
 *
 * A project configures its defaults and can lock any knob (`configureAppearance`). A
 * locked knob always takes the project's value: stored user preferences cannot change it,
 * and the Appearance UI shows it as fixed.
 */
import { FONT_DEFAULTS, FONT_OPTIONS, FONT_PRELOAD } from "./fonts.js";

/** Colour modes a person can choose; `system` follows the operating system's light or dark setting. */
export const MODES = ["system", "light", "dark"] as const;
/** Palette ids the appearance controls offer and stored preferences accept; `definePalette` appends application palettes. */
export const PALETTES: string[] = [
  "ocean",
  "aurora",
  "emerald",
  "sunset",
  "graphite",
  "ruby",
];
/** Spacing densities: `comfortable` (the default) or `compact`. */
export const DENSITIES = ["comfortable", "compact"] as const;
/** Material transparency levels, from translucent glass (`full`) to opaque (`solid`); labels are in GLASS_LABELS. */
export const GLASS_LEVELS = ["full", "reduced", "solid"] as const;
/** Motion preferences; `system` follows the operating system's reduced-motion setting. */
export const MOTION_LEVELS = ["system", "full", "reduced"] as const;
/** Palette-aware canvas styles, from textured to plain. */
export const BACKGROUNDS = [
  "silk",
  "mesh",
  "grid",
  "contours",
  "facets",
  "plain",
] as const;
/** Canvas treatment used by the `canvas-ambient` and `canvas-background` utilities. */
export type BackgroundStyle = (typeof BACKGROUNDS)[number];
/** Informational labels shared by appearance controls. */
export const BACKGROUND_LABELS: Record<BackgroundStyle, string> = {
  silk: "Silk",
  mesh: "Mesh",
  grid: "Grid",
  contours: "Contours",
  facets: "Facets",
  plain: "Plain",
};

export type Mode = (typeof MODES)[number];
export type Palette = (typeof PALETTES)[number];
export type Density = (typeof DENSITIES)[number];
export type GlassLevel = (typeof GLASS_LEVELS)[number];
export type MotionLevel = (typeof MOTION_LEVELS)[number];

/** Accepted font ids per role, from FONT_OPTIONS; `display` also accepts "match" (use the interface face). */
export const FONT_IDS = {
  sans: FONT_OPTIONS.sans.map((option) => option.id) as string[],
  display: [
    "match",
    ...FONT_OPTIONS.display.map((option) => option.id),
  ] as string[],
  mono: FONT_OPTIONS.mono.map((option) => option.id) as string[],
};

export interface Appearance {
  /** Active display or interaction mode. */
  mode: Mode;
  palette: Palette;
  density: Density;
  glass: GlassLevel;
  motion: MotionLevel;
  /** Palette-aware canvas style. Defaults to "silk". Mount `canvas-silk` for Silk's line overlay. */
  background?: BackgroundStyle;
  /** 0 – 1.5; multiplies every radius except pills. */
  radiusScale: number;
  /** 0.5 – 2 px hairline. */
  borderWidth: number;
  /** 0.875 – 1.25; scales type, spacing and controls together. */
  uiScale: number;
  /** Optional custom accent hue (0–360) layered over the palette. */
  accentHue: number | null;
  /** Interface face (FONT_OPTIONS.sans). */
  fontSans: string;
  /** Display face for display and headline text, or "match" to use the interface face. */
  fontDisplay: string;
  /** Code, identifiers and addresses (FONT_OPTIONS.mono). */
  fontMono: string;
}

/** The library's built-in appearance, before project defaults, locks or stored preferences apply. */
export const BASE_APPEARANCE: Appearance = {
  mode: "system",
  palette: "graphite",
  density: "comfortable",
  glass: "full",
  motion: "system",
  background: "silk",
  radiusScale: 1,
  borderWidth: 1,
  uiScale: 1,
  accentHue: null,
  fontSans: FONT_DEFAULTS.sans,
  fontDisplay: FONT_DEFAULTS.display,
  fontMono: FONT_DEFAULTS.mono,
};

export interface AppearanceConfig {
  /** Namespace for stored preferences. Default: glass-ux.appearance.v1. */
  storageKey?: string;
  /** The project's starting values (users may change them unless locked). */
  defaults?: Partial<Appearance>;
  /** Knobs fixed by the project; user preferences never override them. */
  locked?: Partial<Appearance>;
}

let config: { defaults: Partial<Appearance>; locked: Partial<Appearance> } = {
  defaults: {},
  locked: {},
};

/** Set the project's appearance defaults and locks. Call once at module scope (server and client). */
export function configureAppearance(next: AppearanceConfig) {
  config = { defaults: next.defaults ?? {}, locked: next.locked ?? {} };
  APPEARANCE_STORAGE_KEY = next.storageKey ?? "glass-ux.appearance.v1";
}

/** The project's current defaults and locks, as last set by `configureAppearance` (both empty until then). */
export function appearanceConfig() {
  return config;
}

/** The appearance with no stored preferences: the built-in values, then the project's defaults, then its locks. Reset returns to this. */
export function defaultAppearance(): Appearance {
  return { ...BASE_APPEARANCE, ...config.defaults, ...config.locked };
}

/** Whether the project has fixed this knob with `configureAppearance({ locked })`, so preferences cannot change it. */
export function isLocked(key: keyof Appearance) {
  return key in config.locked;
}

/** The localStorage key preferences are stored under: `glass-ux.appearance.v1` unless `configureAppearance` sets `storageKey`. */
export let APPEARANCE_STORAGE_KEY = "glass-ux.appearance.v1";

/** Display names for each palette id, as appearance controls show them; `definePalette` adds application palettes. */
export const PALETTE_LABELS: Record<Palette, string> = {
  ocean: "Ocean",
  aurora: "Aurora",
  emerald: "Emerald",
  sunset: "Sunset",
  graphite: "Graphite",
  ruby: "Ruby",
};

/** The transparency levels' names, as every appearance control shows them. */
export const GLASS_LABELS: Record<GlassLevel, string> = {
  full: "Glass",
  reduced: "Frosted",
  solid: "Solid",
};

const clamp = (value: unknown, min: number, max: number, fallback: number) =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;

const pick = <T extends string>(
  value: unknown,
  options: readonly T[],
  fallback: T,
): T => (options.includes(value as T) ? (value as T) : fallback);

/**
 * Read any value (typically parsed stored preferences) as a complete Appearance: unknown
 * options fall back to the project defaults, numbers are clamped to their ranges and
 * locked knobs always take the project's values.
 */
export function normalizeAppearance(input: unknown): Appearance {
  const raw = (
    typeof input === "object" && input !== null ? input : {}
  ) as Partial<Record<keyof Appearance, unknown>>;
  const d = { ...BASE_APPEARANCE, ...config.defaults };
  const value: Appearance = {
    mode: pick(raw.mode, MODES, d.mode),
    palette: pick(raw.palette, PALETTES, d.palette),
    density: pick(raw.density, DENSITIES, d.density),
    glass: pick(raw.glass, GLASS_LEVELS, d.glass),
    motion: pick(raw.motion, MOTION_LEVELS, d.motion),
    background: pick(raw.background, BACKGROUNDS, d.background ?? "silk"),
    radiusScale: clamp(raw.radiusScale, 0, 1.5, d.radiusScale),
    borderWidth: clamp(raw.borderWidth, 0.5, 2, d.borderWidth),
    uiScale: clamp(raw.uiScale, 0.875, 1.25, d.uiScale),
    accentHue:
      raw.accentHue === null || raw.accentHue === undefined
        ? d.accentHue
        : clamp(raw.accentHue, 0, 360, 25),
    fontSans: pick(raw.fontSans, FONT_IDS.sans, d.fontSans),
    fontDisplay: pick(raw.fontDisplay, FONT_IDS.display, d.fontDisplay),
    fontMono: pick(raw.fontMono, FONT_IDS.mono, d.fontMono),
  };
  return { ...value, ...config.locked };
}

/** The mode actually shown: `light` or `dark`, using `prefersDark` (the operating system setting) when `mode` is `system`. */
export function resolveMode(
  mode: Mode,
  prefersDark: boolean,
): "light" | "dark" {
  return mode === "system" ? (prefersDark ? "dark" : "light") : mode;
}

/** Preload the active font files so a non-default choice paints in its face on the first frame. */
function preloadFonts(appearance: Appearance) {
  for (const id of [
    appearance.fontSans,
    appearance.fontDisplay,
    appearance.fontMono,
  ]) {
    const href = FONT_PRELOAD[id];
    if (
      !href ||
      document.head.querySelector(`link[rel="preload"][href="${href}"]`)
    )
      continue;
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "font";
    link.type = "font/woff2";
    link.crossOrigin = "anonymous";
    link.href = href;
    document.head.append(link);
  }
}

/** Apply preferences to the document element. Pure DOM; safe to call repeatedly. */
export function applyAppearance(
  root: HTMLElement,
  appearance: Appearance,
  prefersDark: boolean,
) {
  root.dataset.mode = resolveMode(appearance.mode, prefersDark);
  root.dataset.palette = appearance.palette;
  root.dataset.density = appearance.density;
  root.dataset.glass = appearance.glass;
  root.dataset.background = appearance.background ?? "silk";
  if (appearance.motion === "system") delete root.dataset.motion;
  else root.dataset.motion = appearance.motion;
  root.dataset.fontSans = appearance.fontSans;
  root.dataset.fontDisplay = appearance.fontDisplay;
  root.dataset.fontMono = appearance.fontMono;
  const set = (name: string, value: number, fallback: number, unit = "") => {
    if (value === fallback) root.style.removeProperty(name);
    else root.style.setProperty(name, `${value}${unit}`);
  };
  set("--radius-scale", appearance.radiusScale, 1);
  set("--border-width", appearance.borderWidth, 1, "px");
  set("--ui-scale", appearance.uiScale, 1);
  if (appearance.accentHue === null) {
    root.style.removeProperty("--accent-h");
    root.style.removeProperty("--accent-2-h");
  } else {
    root.style.setProperty("--accent-h", String(appearance.accentHue));
    root.style.setProperty(
      "--accent-2-h",
      String((appearance.accentHue + 340) % 360),
    );
  }
  if (root.ownerDocument === document) preloadFonts(appearance);
}

/**
 * The blocking boot script, serialised into <head> so the first frame is already themed.
 * It is a standalone literal (minification would rename identifiers inside stringified
 * functions); appearance.test.ts proves it applies exactly what applyAppearance applies.
 * The project's defaults and locks are baked in when the document is rendered.
 */
export function appearanceBootScript() {
  const j = JSON.stringify;
  const d = { ...BASE_APPEARANCE, ...config.defaults };
  return `(function(){try{var d=document.documentElement,s=null,L=${j(config.locked)},D=${j(d)},P=${j(FONT_PRELOAD)};
try{s=JSON.parse(localStorage.getItem(${j(APPEARANCE_STORAGE_KEY)})||"null")}catch(e){}
s=s&&typeof s==="object"?s:{};
function o(v,a,f){return a.indexOf(v)>=0?v:f}
function n(v,lo,hi,f){return typeof v==="number"&&isFinite(v)?Math.min(hi,Math.max(lo,v)):f}
var a={mode:o(s.mode,${j(MODES)},D.mode),palette:o(s.palette,${j(PALETTES)},D.palette),density:o(s.density,${j(DENSITIES)},D.density),glass:o(s.glass,${j(GLASS_LEVELS)},D.glass),motion:o(s.motion,${j(MOTION_LEVELS)},D.motion),background:o(s.background,${j(BACKGROUNDS)},D.background||"silk"),
radiusScale:n(s.radiusScale,0,1.5,D.radiusScale),borderWidth:n(s.borderWidth,0.5,2,D.borderWidth),uiScale:n(s.uiScale,0.875,1.25,D.uiScale),
accentHue:s.accentHue==null?D.accentHue:n(s.accentHue,0,360,25),
fontSans:o(s.fontSans,${j(FONT_IDS.sans)},D.fontSans),fontDisplay:o(s.fontDisplay,${j(FONT_IDS.display)},D.fontDisplay),fontMono:o(s.fontMono,${j(FONT_IDS.mono)},D.fontMono)};
for(var k in L)a[k]=L[k];
var m=a.mode;if(m==="system")m=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";
d.dataset.mode=m;d.dataset.palette=a.palette;d.dataset.density=a.density;d.dataset.glass=a.glass;
d.dataset.background=a.background;
if(a.motion!=="system")d.dataset.motion=a.motion;
d.dataset.fontSans=a.fontSans;d.dataset.fontDisplay=a.fontDisplay;d.dataset.fontMono=a.fontMono;
if(a.radiusScale!==1)d.style.setProperty("--radius-scale",String(a.radiusScale));
if(a.borderWidth!==1)d.style.setProperty("--border-width",a.borderWidth+"px");
if(a.uiScale!==1)d.style.setProperty("--ui-scale",String(a.uiScale));
if(a.accentHue!==null){d.style.setProperty("--accent-h",String(a.accentHue));d.style.setProperty("--accent-2-h",String((a.accentHue+340)%360))}
[a.fontSans,a.fontDisplay,a.fontMono].forEach(function(id){var h=P[id];if(!h||document.head.querySelector('link[rel="preload"][href="'+h+'"]'))return;var l=document.createElement("link");l.rel="preload";l.as="font";l.type="font/woff2";l.crossOrigin="anonymous";l.href=h;document.head.appendChild(l)});
}catch(e){}})()`;
}

/** Register an application-owned CSS palette before configuring its defaults. */
export function definePalette(id: string, label: string): string {
  if (!/^[a-z][a-z0-9-]*$/.test(id))
    throw new Error("Use a lowercase CSS-safe palette identifier");
  if (!PALETTES.includes(id)) PALETTES.push(id);
  PALETTE_LABELS[id] = label;
  return id;
}
