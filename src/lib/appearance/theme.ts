/**
 * Themes: an appearance as a value a project keeps in its repository.
 *
 * `exportAppearance` turns an appearance into an `AppearanceConfig` a project passes to
 * `configureAppearance`, the same value as a typed module, and a small CSS override for pages
 * without the appearance runtime. `importAppearance` reads that value back. Both are plain
 * functions, so a server, a script or a build step can call them.
 *
 * A theme is validated field by field against the runtime's own option lists and ranges.
 * Unlike normalizeAppearance, which repairs stored preferences, import refuses a bad value:
 * a theme either restores exactly or not at all. Only numbers, hex-derived parameters and
 * registered ids reach the CSS, so a theme cannot carry text into a stylesheet.
 */
import { FONT_DEFAULTS } from "./fonts.js";
import {
  APPEARANCE_RANGES,
  BACKGROUNDS,
  BASE_APPEARANCE,
  DENSITIES,
  FONT_IDS,
  GLASS_LEVELS,
  GLASS_RENDERINGS,
  MODES,
  MOTION_LEVELS,
  PALETTES,
  VISUAL_STYLES,
  appearanceColourVars,
  appearanceConfig,
  normalizeImageUrl,
  type Appearance,
  type AppearanceConfig,
  type GlassRendering,
} from "./appearance.js";
import { normalizeHex } from "./custom-colour.js";

/** The part of an `AppearanceConfig` a theme carries: pass it to `configureAppearance`. Equal to the built-in value, a knob is left out. */
export interface AppearanceTheme extends Pick<AppearanceConfig, "defaults" | "glassRendering"> {
  /** The theme's starting values. */
  defaults: Partial<Appearance>;
}

export interface ExportAppearanceOptions {
  /** How glass blurs in this theme when the appearance does not say. Default: the site-wide default `configureAppearance` last set. */
  glassRendering?: GlassRendering;
}

/** What `exportAppearance` returns: one theme in the forms a project commits. */
export interface AppearanceExport {
  /** The theme as a value: pass it to `configureAppearance`. */
  theme: AppearanceTheme;
  /** A typed module that declares the theme and configures it. Save it as `theme.ts`. */
  source: string;
  /**
   * A stylesheet for a page without the appearance runtime: the radius, line weight, UI scale
   * and colour parameters, for `<html>` carrying `attributes`. Import it after the library's
   * styles. An application with `AppearanceProvider` needs `source` instead.
   */
  css: string;
  /** The `data-*` attributes `<html>` needs for `css`, as they would be written in markup. */
  attributes: Record<string, string>;
  /** Knobs left out because they cannot be kept: an invalid value, or a `blob:` picture that exists only in this browser. */
  omitted: Array<keyof Appearance>;
}

/** Why a theme was refused. `unreadable` is text that is not a theme; `picture-remote` is a picture on another site, which import loads only with `remotePictures`. */
export type AppearanceImportReason = "unreadable" | "invalid" | "picture-remote";

/** One reason a theme was refused. */
export interface AppearanceImportIssue {
  /** The knob at fault, or `theme` when the value as a whole cannot be read. */
  field: keyof Appearance | "glassRendering" | "theme";
  /** What is wrong with it. */
  reason: AppearanceImportReason;
}

export interface ImportAppearanceOptions {
  /** Accept a picture on another site. A theme from an untrusted source could use one to learn who opened it, so the default is false. */
  remotePictures?: boolean;
}

/** What `importAppearance` returns: the restored theme, or the reasons it was refused. */
export type AppearanceImport =
  | {
      ok: true;
      /** The validated theme: known fields only. */
      theme: AppearanceTheme;
      /** The complete appearance the theme stands for: pass it to `update` from `useAppearance`. */
      appearance: Appearance;
    }
  | {
      ok: false;
      /** Every field at fault. */
      issues: AppearanceImportIssue[];
    };

/** Longer text than this cannot be a theme: a picture is capped at 4 000 000 characters. */
const MAX_THEME_TEXT = 4_100_000;
const THIS_SITE = "https://site.invalid";
const SAFE_ID = /^[a-z][a-z0-9-]*$/;

/** A reader returns the field's value, or undefined when the value is not acceptable. */
type Reader = (value: unknown) => unknown;
const oneOf = (options: readonly string[]): Reader => (value) => (options.includes(value as string) ? value : undefined);
const between = ([min, max]: readonly [number, number]): Reader => (value) =>
  typeof value === "number" && Number.isFinite(value) && value >= min && value <= max ? value : undefined;
const colour: Reader = (value) => (value === null ? null : (normalizeHex(value) ?? undefined));
const nullable = (read: Reader): Reader => (value) => (value === null ? null : read(value));

/** The picture as a theme can keep it: a `blob:` URL ends with the browser session. */
const picture: Reader = (value) => {
  if (value === null) return null;
  const url = normalizeImageUrl(value);
  return url && !/^blob:/i.test(url) ? url : undefined;
};

/** Whether a picture URL loads from another site. Resolved, because browsers read `/\host` and `/<tab>/host` as a host. */
function isRemotePicture(url: string) {
  if (/^data:/i.test(url)) return false;
  try {
    return new URL(url, THIS_SITE).origin !== THIS_SITE;
  } catch {
    return true;
  }
}

/** Every knob a theme carries, in the order it is written. */
const FIELDS: Record<keyof Appearance, Reader> = {
  mode: oneOf(MODES),
  palette: oneOf(PALETTES),
  accentColor: colour,
  accentColor2: colour,
  canvasTint: colour,
  accentHue: nullable(between(APPEARANCE_RANGES.accentHue)),
  glass: oneOf(GLASS_LEVELS),
  density: oneOf(DENSITIES),
  uiScale: between(APPEARANCE_RANGES.uiScale),
  radiusScale: between(APPEARANCE_RANGES.radiusScale),
  borderWidth: between(APPEARANCE_RANGES.borderWidth),
  background: oneOf(BACKGROUNDS),
  backgroundImage: picture,
  motion: oneOf(MOTION_LEVELS),
  style: oneOf(VISUAL_STYLES),
  glassRendering: oneOf(GLASS_RENDERINGS),
  fontSans: oneOf(FONT_IDS.sans),
  fontDisplay: oneOf(FONT_IDS.display),
  fontMono: oneOf(FONT_IDS.mono),
};
const KNOBS = Object.keys(FIELDS) as Array<keyof Appearance>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** The `data-*` attributes applyAppearance would set for these knobs, for the ones that have one. */
function themeAttributes(appearance: Appearance) {
  const flat = appearance.style === "flat";
  const attributes: Record<string, string> = {};
  const set = (name: string, value: string | undefined) => {
    if (value && SAFE_ID.test(value)) attributes[name] = value;
  };
  if (flat) set("data-style", "flat");
  if (appearance.glassRendering === "none") set("data-glass-rendering", "none");
  if (appearance.mode !== "system") set("data-mode", appearance.mode);
  set("data-palette", appearance.palette);
  set("data-density", appearance.density);
  set("data-glass", flat ? "solid" : appearance.glass);
  set("data-background", flat ? "plain" : appearance.background);
  if (flat) set("data-motion", "reduced");
  else if (appearance.motion !== "system") set("data-motion", appearance.motion);
  if (appearance.fontSans !== FONT_DEFAULTS.sans) set("data-font-sans", appearance.fontSans);
  if (appearance.fontDisplay !== FONT_DEFAULTS.display) set("data-font-display", appearance.fontDisplay);
  if (appearance.fontMono !== FONT_DEFAULTS.mono) set("data-font-mono", appearance.fontMono);
  return attributes;
}

/** Only validated numbers and registered ids get here (see the file comment). */
function themeCss(appearance: Appearance, attributes: Record<string, string>) {
  const vars: Array<[string, string]> = [];
  if (appearance.radiusScale !== 1) vars.push(["--radius-scale", String(appearance.radiusScale)]);
  if (appearance.borderWidth !== 1) vars.push(["--border-width", `${appearance.borderWidth}px`]);
  if (appearance.uiScale !== 1) vars.push(["--ui-scale", String(appearance.uiScale)]);
  vars.push(...Object.entries(appearanceColourVars(appearance)));
  const markup = Object.entries(attributes)
    .map(([name, value]) => `${name}="${value}"`)
    .join(" ");
  const heading = `/* Glass UX theme. Import after glass-ux/styles.css.\n   <html ${markup}> */\n`;
  const palette = attributes["data-palette"];
  // Tied to the palette, so a page that changes palette does not keep this one's colours.
  const selector = palette ? `:root[data-palette="${palette}"]` : ":root";
  return vars.length ? `${heading}${selector} {\n${vars.map(([name, value]) => `  ${name}: ${value};`).join("\n")}\n}\n` : heading;
}

const themeSource = (theme: AppearanceTheme) =>
  // JSON inside the module, so importAppearance can read the file as it was written.
  `import { configureAppearance, type AppearanceConfig } from "glass-ux/appearance";

export const theme = ${JSON.stringify(theme, null, 2)} satisfies AppearanceConfig;

configureAppearance(theme);
`;

/**
 * An appearance as a theme to commit: the value for `configureAppearance`, a typed module and
 * a small CSS override. `appearance` is what `useAppearance` returns, or any part of it; a knob
 * with an invalid value is left out and named in `omitted`. Holds no hooks, so server code can
 * call it.
 */
export function exportAppearance(appearance: Partial<Appearance>, options: ExportAppearanceOptions = {}): AppearanceExport {
  const raw = (isRecord(appearance) ? appearance : {}) as Partial<Record<keyof Appearance, unknown>>;
  const defaults: Partial<Record<keyof Appearance, unknown>> = {};
  const omitted: Array<keyof Appearance> = [];
  for (const key of KNOBS) {
    if (raw[key] === undefined) continue;
    const value = FIELDS[key](raw[key]);
    if (value === undefined) omitted.push(key);
    else if (value !== BASE_APPEARANCE[key]) defaults[key] = value;
  }
  // Blur is a knob like the others; a theme states it in `defaults`.
  if (defaults.glassRendering === undefined) {
    const glassRendering = options.glassRendering ?? appearanceConfig().glassRendering;
    if (glassRendering === "none") defaults.glassRendering = glassRendering;
  }
  const theme: AppearanceTheme = { defaults: defaults as Partial<Appearance> };
  const complete = { ...BASE_APPEARANCE, ...theme.defaults };
  const attributes = themeAttributes(complete);
  return { theme, source: themeSource(theme), css: themeCss(complete, attributes), attributes, omitted };
}

/** The object inside `text`: JSON, or the module `exportAppearance` wrote. */
function readThemeText(text: string): unknown {
  if (text.length > MAX_THEME_TEXT) return undefined;
  const assignment = text.search(/=\s*\{/);
  const body = assignment < 0 ? text : text.slice(text.indexOf("{", assignment), text.lastIndexOf("}") + 1);
  try {
    return JSON.parse(body);
  } catch {
    return undefined;
  }
}

/**
 * Validate a theme and restore it. `input` is an `AppearanceTheme`, its JSON, or the text of
 * the `theme.ts` module `exportAppearance` wrote. Unknown fields are ignored; a known field
 * with a bad value refuses the whole theme, with one issue per field. A picture on another
 * site is refused unless `remotePictures` is set. Safe for untrusted input, and free of hooks.
 */
export function importAppearance(input: unknown, options: ImportAppearanceOptions = {}): AppearanceImport {
  const raw = typeof input === "string" ? readThemeText(input) : input;
  if (!isRecord(raw) || !isRecord(raw.defaults)) return { ok: false, issues: [{ field: "theme", reason: "unreadable" }] };
  const issues: AppearanceImportIssue[] = [];
  const defaults: Partial<Record<keyof Appearance, unknown>> = {};
  for (const key of KNOBS) {
    if (!Object.hasOwn(raw.defaults, key) || raw.defaults[key] === undefined) continue;
    const value = FIELDS[key](raw.defaults[key]);
    if (value === undefined) issues.push({ field: key, reason: "invalid" });
    else if (key === "backgroundImage" && !options.remotePictures && value !== null && isRemotePicture(value as string))
      issues.push({ field: key, reason: "picture-remote" });
    else defaults[key] = value;
  }
  // "baked" was removed in 0.17: a theme exported before then still imports, and blurs live.
  const stated = Object.hasOwn(raw, "glassRendering") ? raw.glassRendering : undefined;
  const rendering = stated === "baked" ? undefined : stated;
  if (rendering !== undefined && !GLASS_RENDERINGS.includes(rendering as GlassRendering)) issues.push({ field: "glassRendering", reason: "invalid" });
  if (issues.length) return { ok: false, issues };
  // A theme from before blur was a knob states it at the top level: read it as the default.
  if (rendering !== undefined && defaults.glassRendering === undefined) defaults.glassRendering = rendering;
  const theme: AppearanceTheme = { defaults: defaults as Partial<Appearance> };
  return { ok: true, theme, appearance: { ...BASE_APPEARANCE, ...theme.defaults } };
}
