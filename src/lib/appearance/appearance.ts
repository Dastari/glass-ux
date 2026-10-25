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
import { BOOT_CUSTOM_COLOUR, CUSTOM_COLOUR_VARS, customColourVars, normalizeHex } from "./custom-colour.js";

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
  "lagoon",
  "indigo",
  "rose",
  "moss",
  "sand",
  "slate",
];
/** Spacing densities: `comfortable` (the default) or `compact`. */
export const DENSITIES = ["comfortable", "compact"] as const;
/** Material transparency levels, from translucent glass (`full`) to opaque (`solid`); labels are in GLASS_LABELS. */
export const GLASS_LEVELS = ["full", "reduced", "solid"] as const;
/**
 * How glass materials blur what is behind them, chosen by the application for every surface:
 * `live` blurs with backdrop-filter every frame; `baked` shows panels and chrome on the page
 * canvas a copy of the canvas blurred once (`installBakedFrost`), and blurs live only where
 * that copy would be wrong. Both look the same at rest.
 */
export const GLASS_RENDERINGS = ["live", "baked"] as const;
/** Motion preferences; `system` follows the operating system's reduced-motion setting. */
export const MOTION_LEVELS = ["system", "full", "reduced"] as const;
/** The library's canvas styles: colour fields, then artwork (digital, then scenes), then plain and a picture. */
export const BUILT_IN_BACKGROUNDS = [
  "silk",
  "mesh",
  "currents",
  "waves",
  "contours",
  "facets",
  "grid",
  "pixels",
  "circuit",
  "network",
  "skyline",
  "harbour",
  "forest",
  "hills",
  "garden",
  "plain",
  "image",
] as const;
/**
 * Canvas treatment used by the `canvas-ambient` and `canvas-background` utilities: a built-in
 * style, or one an application registers with `defineBackground`. `image` shows
 * `Appearance.backgroundImage`.
 */
export type BackgroundStyle = (typeof BUILT_IN_BACKGROUNDS)[number] | (string & {});
/** Background ids the appearance controls offer and stored preferences accept; `defineBackground` appends application backgrounds. */
export const BACKGROUNDS: BackgroundStyle[] = [...BUILT_IN_BACKGROUNDS];
/** Informational labels shared by appearance controls. */
export const BACKGROUND_LABELS: Record<BackgroundStyle, string> = {
  silk: "Silk",
  mesh: "Mesh",
  currents: "Currents",
  waves: "Waves",
  contours: "Contours",
  facets: "Facets",
  grid: "Grid",
  pixels: "Pixels",
  circuit: "Circuit",
  network: "Network",
  skyline: "Skyline",
  harbour: "Harbour",
  forest: "Forest",
  hills: "Hills",
  garden: "Garden",
  plain: "Plain",
  image: "Picture",
};

export type Mode = (typeof MODES)[number];
export type Palette = (typeof PALETTES)[number];
export type Density = (typeof DENSITIES)[number];
export type GlassLevel = (typeof GLASS_LEVELS)[number];
export type GlassRendering = (typeof GLASS_RENDERINGS)[number];
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
  /** Optional custom accent hue (0–360) layered over the palette. Ignored while `accentColor` is set. */
  accentHue: number | null;
  /**
   * Optional custom accent colour (`#rrggbb`) layered over the palette. Its lightness is
   * adjusted until text on it and accent text meet contrast (customColourVars).
   */
  accentColor?: string | null;
  /** Optional second accent colour (`#rrggbb`); only its hue is used, and only with `accentColor`. */
  accentColor2?: string | null;
  /** Optional canvas tint (`#rrggbb`): its hue tints the neutral greys and the canvas's colour fields. */
  canvasTint?: string | null;
  /**
   * The picture the `image` background shows: an `https:` or `http:` URL, a same-site path,
   * a `blob:` URL, or an image data URL (see `prepareBackgroundImage`).
   */
  backgroundImage?: string | null;
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
  accentColor: null,
  accentColor2: null,
  canvasTint: null,
  backgroundImage: null,
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
  /** How every glass surface blurs (GLASS_RENDERINGS). An application setting, not a preference. Default: live. */
  glassRendering?: GlassRendering;
}

let config: {
  defaults: Partial<Appearance>;
  locked: Partial<Appearance>;
  glassRendering: GlassRendering;
} = {
  defaults: {},
  locked: {},
  glassRendering: "live",
};

/** Set the project's appearance defaults and locks. Call once at module scope (server and client). */
export function configureAppearance(next: AppearanceConfig) {
  config = {
    defaults: next.defaults ?? {},
    locked: next.locked ?? {},
    glassRendering: pick(next.glassRendering, GLASS_RENDERINGS, "live"),
  };
  APPEARANCE_STORAGE_KEY = next.storageKey ?? "glass-ux.appearance.v1";
}

/** The project's current defaults, locks and glass rendering, as last set by `configureAppearance` (empty and live until then). */
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
  lagoon: "Lagoon",
  indigo: "Indigo",
  rose: "Rose",
  moss: "Moss",
  sand: "Sand",
  slate: "Slate",
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

/** The longest picture URL kept, in characters; a larger data URL would not fit in storage anyway. */
const MAX_IMAGE_URL = 4_000_000;
/** Picture URLs the `image` background accepts: web and same-site addresses, blobs and image data. */
const IMAGE_URL = /^(https?:\/\/|\/(?!\/)|\.{1,2}\/|blob:|data:image\/(png|jpe?g|webp|avif|gif);base64,|data:image\/svg\+xml[;,])/i;

/** A picture URL the `image` background may show, or null (see `Appearance.backgroundImage`). */
export function normalizeImageUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const url = value.trim();
  return url.length > 0 && url.length <= MAX_IMAGE_URL && IMAGE_URL.test(url) ? url : null;
}

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
    accentColor: raw.accentColor === undefined ? (d.accentColor ?? null) : normalizeHex(raw.accentColor),
    accentColor2: raw.accentColor2 === undefined ? (d.accentColor2 ?? null) : normalizeHex(raw.accentColor2),
    canvasTint: raw.canvasTint === undefined ? (d.canvasTint ?? null) : normalizeHex(raw.canvasTint),
    backgroundImage: raw.backgroundImage === undefined ? (d.backgroundImage ?? null) : normalizeImageUrl(raw.backgroundImage),
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
  if (config.glassRendering === "baked") root.dataset.glassRendering = "baked";
  else delete root.dataset.glassRendering;
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
  // Custom colours set palette parameters inline; an accent colour replaces the accent hue.
  const custom = customColourVars({
    accentColor: appearance.accentColor ?? null,
    accentColor2: appearance.accentColor2 ?? null,
    canvasTint: appearance.canvasTint ?? null,
  });
  if (appearance.accentHue !== null && !("--accent-h" in custom)) {
    custom["--accent-h"] = String(appearance.accentHue);
    custom["--accent-2-h"] = String((appearance.accentHue + 340) % 360);
  }
  for (const name of CUSTOM_COLOUR_VARS) {
    const value = custom[name];
    if (value === undefined) root.style.removeProperty(name);
    else root.style.setProperty(name, value);
  }
  const picture = normalizeImageUrl(appearance.backgroundImage);
  if (picture) root.style.setProperty("--canvas-picture", `url(${JSON.stringify(picture)})`);
  else root.style.removeProperty("--canvas-picture");
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
function x(v){if(typeof v!=="string")return null;var m=/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(v.trim());if(!m)return null;var h=m[1].toLowerCase();return "#"+(h.length===3?h.replace(/./g,function(c){return c+c}):h)}
function u(v){if(typeof v!=="string")return null;v=v.trim();return v.length>0&&v.length<=${MAX_IMAGE_URL}&&${IMAGE_URL.toString()}.test(v)?v:null}
var a={mode:o(s.mode,${j(MODES)},D.mode),palette:o(s.palette,${j(PALETTES)},D.palette),density:o(s.density,${j(DENSITIES)},D.density),glass:o(s.glass,${j(GLASS_LEVELS)},D.glass),motion:o(s.motion,${j(MOTION_LEVELS)},D.motion),background:o(s.background,${j(BACKGROUNDS)},D.background||"silk"),
radiusScale:n(s.radiusScale,0,1.5,D.radiusScale),borderWidth:n(s.borderWidth,0.5,2,D.borderWidth),uiScale:n(s.uiScale,0.875,1.25,D.uiScale),
accentHue:s.accentHue==null?D.accentHue:n(s.accentHue,0,360,25),
accentColor:s.accentColor===undefined?(D.accentColor||null):x(s.accentColor),accentColor2:s.accentColor2===undefined?(D.accentColor2||null):x(s.accentColor2),canvasTint:s.canvasTint===undefined?(D.canvasTint||null):x(s.canvasTint),backgroundImage:s.backgroundImage===undefined?(D.backgroundImage||null):u(s.backgroundImage),
fontSans:o(s.fontSans,${j(FONT_IDS.sans)},D.fontSans),fontDisplay:o(s.fontDisplay,${j(FONT_IDS.display)},D.fontDisplay),fontMono:o(s.fontMono,${j(FONT_IDS.mono)},D.fontMono)};
for(var k in L)a[k]=L[k];
var m=a.mode;if(m==="system")m=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";
d.dataset.mode=m;d.dataset.palette=a.palette;d.dataset.density=a.density;d.dataset.glass=a.glass;${config.glassRendering === "baked" ? `d.dataset.glassRendering="baked";` : ""}
d.dataset.background=a.background;
if(a.motion!=="system")d.dataset.motion=a.motion;
d.dataset.fontSans=a.fontSans;d.dataset.fontDisplay=a.fontDisplay;d.dataset.fontMono=a.fontMono;
if(a.radiusScale!==1)d.style.setProperty("--radius-scale",String(a.radiusScale));
if(a.borderWidth!==1)d.style.setProperty("--border-width",a.borderWidth+"px");
if(a.uiScale!==1)d.style.setProperty("--ui-scale",String(a.uiScale));
var C=(${BOOT_CUSTOM_COLOUR})(a.accentColor,a.accentColor2,a.canvasTint);
if(a.accentHue!==null&&!("--accent-h" in C)){C["--accent-h"]=String(a.accentHue);C["--accent-2-h"]=String((a.accentHue+340)%360)}
${j(CUSTOM_COLOUR_VARS)}.forEach(function(k){if(C[k]!==undefined)d.style.setProperty(k,C[k])});
var I=u(a.backgroundImage);if(I)d.style.setProperty("--canvas-picture","url("+JSON.stringify(I)+")");
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

/**
 * Register an application-owned background before configuring its defaults. Its CSS belongs
 * to the application: set `--canvas-image` (and `--canvas-image-size`) for
 * `:where(:root[data-background="<id>"]) :is(.canvas-ambient, .canvas-background)`.
 */
export function defineBackground(id: string, label: string): string {
  if (!/^[a-z][a-z0-9-]*$/.test(id))
    throw new Error("Use a lowercase CSS-safe background identifier");
  if (!BACKGROUNDS.includes(id)) BACKGROUNDS.push(id);
  BACKGROUND_LABELS[id] = label;
  return id;
}
