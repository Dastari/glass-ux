// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import {
  BASE_APPEARANCE,
  PALETTES,
  applyAppearance,
  configureAppearance,
  definePalette,
  type Appearance,
} from "./appearance.js";
import { exportAppearance, importAppearance } from "./theme.js";

const applied = (appearance: Appearance) => {
  const root = document.createElement("html");
  applyAppearance(root, appearance, false);
  return { data: { ...root.dataset }, style: root.getAttribute("style") ?? "" };
};

const THEMES: Array<Partial<Appearance>> = [
  {},
  { mode: "dark", palette: "ocean", density: "compact", glass: "reduced" },
  { accentColor: "#0b6e4f", accentColor2: "#c0ffee", canvasTint: "#334455" },
  { uiScale: 1.125, radiusScale: 0.25, borderWidth: 1.5, background: "contours" },
  { accentHue: 200, motion: "reduced", style: "flat", fontMono: BASE_APPEARANCE.fontMono },
  { background: "image", backgroundImage: "/pictures/canvas.webp" },
  { background: "image", backgroundImage: "data:image/webp;base64,AAAA" },
  { radiusScale: 0, borderWidth: 0.5, uiScale: 0.875, palette: "sand" },
];

afterEach(() => configureAppearance({}));

describe("exportAppearance", () => {
  it("keeps only what differs from the built-in appearance, as a value configureAppearance takes", () => {
    const { theme } = exportAppearance({ ...BASE_APPEARANCE, palette: "ruby", uiScale: 1.25 });
    expect(theme).toEqual({ defaults: { palette: "ruby", uiScale: 1.25 } });
  });

  it("carries the application's glass rendering", () => {
    configureAppearance({ glassRendering: "none" });
    expect(exportAppearance({}).theme.defaults.glassRendering).toBe("none");
    expect(exportAppearance({}, { glassRendering: "live" }).theme.defaults.glassRendering).toBeUndefined();
    // A person's own choice is a knob like the others, and outranks the option.
    expect(exportAppearance({ glassRendering: "none" }, { glassRendering: "live" }).theme.defaults.glassRendering).toBe("none");
    expect(exportAppearance({ glassRendering: "none" }).attributes["data-glass-rendering"]).toBe("none");
  });

  it("writes a module that declares and configures the theme", () => {
    const { source } = exportAppearance({ palette: "moss" });
    expect(source).toContain('from "glass-ux/appearance"');
    expect(source).toContain("satisfies AppearanceConfig");
    expect(source).toContain("configureAppearance(theme);");
  });

  it("writes the same custom properties and attributes applyAppearance sets", () => {
    const appearance = { ...BASE_APPEARANCE, accentColor: "#0b6e4f", canvasTint: "#334455", radiusScale: 0.5, borderWidth: 2, uiScale: 1.25, density: "compact" as const };
    const { css, attributes } = exportAppearance(appearance);
    const { data, style } = applied(appearance);
    for (const declaration of style.split(";").map((part) => part.trim()).filter(Boolean)) {
      const [name, value] = declaration.split(": ");
      expect(css).toContain(`  ${name}: ${value};`);
    }
    expect(attributes).toMatchObject({ "data-palette": data.palette, "data-density": data.density, "data-glass": data.glass, "data-background": data.background });
  });

  it("ties colours to the palette, so changing palette does not keep them", () => {
    expect(exportAppearance({ palette: "ocean", accentHue: 90 }).css).toContain(':root[data-palette="ocean"] {');
  });

  it("writes no declarations for an unchanged appearance", () => {
    expect(exportAppearance(BASE_APPEARANCE).css).not.toContain("{");
  });

  it("never lets a string reach the stylesheet", () => {
    const hostile = "red;} body{display:none} /*";
    const css = exportAppearance({
      palette: hostile,
      background: `x"]{}</style>`,
      fontSans: hostile,
      accentColor: `#000;${hostile}`,
      canvasTint: "url(https://example.test/x)",
      backgroundImage: "https://example.test/x);}body{display:none}",
      radiusScale: Number.NaN,
      uiScale: "1;}" as never,
    } as Partial<Appearance>);
    const lines = css.css.trimEnd().split("\n");
    for (const line of lines.slice(2)) expect(line).toMatch(/^(:root(\[data-palette="[a-z][a-z0-9-]*"\])? \{|  --[a-z0-9-]+: [\d.]+(px)?;|\})$/);
    expect(css.css).not.toContain("example.test");
    expect(css.css).not.toContain("display:none");
    expect(css.omitted).toEqual(expect.arrayContaining(["palette", "background", "fontSans", "accentColor", "canvasTint", "radiusScale", "uiScale"]));
  });

  it("registered palettes export, and an id that dodged definePalette stays out of the CSS", () => {
    expect(exportAppearance({ palette: definePalette("harbour-blue", "Harbour blue"), uiScale: 1.25 }).css).toContain(':root[data-palette="harbour-blue"] {');
    const unsafe = 'x"]{} body{display:none} [y="';
    PALETTES.push(unsafe);
    const { css, attributes } = exportAppearance({ palette: unsafe, uiScale: 1.25 });
    PALETTES.pop();
    expect(attributes["data-palette"]).toBeUndefined();
    expect(css).not.toContain("display:none");
    expect(css).toContain(":root {");
  });

  it("leaves a picture that exists only in this browser out of the theme", () => {
    const result = exportAppearance({ background: "image", backgroundImage: "blob:https://example.test/1" });
    expect(result.theme.defaults).toEqual({ background: "image" });
    expect(result.omitted).toEqual(["backgroundImage"]);
  });

  it("keeps every picture out of the CSS", () => {
    expect(exportAppearance({ backgroundImage: "/pictures/canvas.webp" }).css).not.toContain("canvas.webp");
  });
});

describe("importAppearance", () => {
  it.each(THEMES)("restores what was exported: %j", (appearance) => {
    const expected = { ...BASE_APPEARANCE, ...appearance };
    const { theme, source } = exportAppearance(expected);
    for (const input of [theme, JSON.stringify(theme), source]) {
      const result = importAppearance(input);
      if (!result.ok) throw new Error(JSON.stringify(result.issues));
      expect(result.appearance).toEqual(expected);
      expect(result.theme).toEqual(theme);
      expect(applied(result.appearance)).toEqual(applied(expected));
    }
  });

  it("restores the glass rendering", () => {
    const { source } = exportAppearance({}, { glassRendering: "none" });
    expect(importAppearance(source)).toMatchObject({ ok: true, theme: { defaults: { glassRendering: "none" } }, appearance: { glassRendering: "none" } });
    // A theme from before blur was a knob states it at the top level.
    expect(importAppearance({ defaults: {}, glassRendering: "none" })).toMatchObject({ ok: true, theme: { defaults: { glassRendering: "none" } } });
  });

  it("a theme works as configureAppearance's argument", () => {
    const { theme } = exportAppearance({ palette: "ruby", density: "compact" });
    configureAppearance(theme);
    const result = importAppearance(theme);
    expect(result).toMatchObject({ ok: true, appearance: { palette: "ruby", density: "compact" } });
  });

  it("ignores unknown fields", () => {
    const result = importAppearance({ defaults: { palette: "ruby", futureKnob: true, length: 3 }, storageKey: "x", locked: { palette: "moss" }, extra: 1 });
    expect(result).toEqual({ ok: true, theme: { defaults: { palette: "ruby" } }, appearance: { ...BASE_APPEARANCE, palette: "ruby" } });
  });

  it("does not pollute prototypes", () => {
    const result = importAppearance('{"defaults":{"__proto__":{"polluted":true},"constructor":{"prototype":{"polluted":true}},"palette":"ruby"},"__proto__":{"defaults":{}}}');
    expect(result.ok).toBe(true);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    if (result.ok) expect(Object.keys(result.theme.defaults)).toEqual(["palette"]);
  });

  it("reads inherited fields as absent", () => {
    expect(importAppearance({ defaults: Object.create({ palette: 12 }) })).toMatchObject({ ok: true, theme: { defaults: {} } });
  });

  it.each([
    [null],
    [undefined],
    [12],
    [[]],
    [""],
    ["not a theme"],
    ["{"],
    ["[]"],
    ["{}"],
    [{ defaults: [] }],
    [{ defaults: null }],
    ["const theme = { palette: 'ruby' } satisfies AppearanceConfig"],
    [`{"defaults":{},"padding":"${"x".repeat(4_200_000)}"}`],
  ])("refuses what is not a theme: %#", (input) => {
    expect(importAppearance(input)).toEqual({ ok: false, issues: [{ field: "theme", reason: "unreadable" }] });
  });

  it.each([
    ["mode", "bright"],
    ["palette", "unknown"],
    ["palette", 12],
    ["accentColor", "red"],
    ["accentColor", "#12345"],
    ["accentColor2", "#fff;}"],
    ["canvasTint", 123456],
    ["accentHue", 400],
    ["glass", "max"],
    ["density", "tight"],
    ["uiScale", 2],
    ["uiScale", "1"],
    ["uiScale", null],
    ["radiusScale", -1],
    ["radiusScale", Number.NaN],
    ["borderWidth", 10],
    ["background", "unknown"],
    ["backgroundImage", "javascript:alert(1)"],
    ["backgroundImage", "data:text/html,<script>"],
    ["backgroundImage", "//example.test/x.png"],
    ["backgroundImage", "blob:https://example.test/1"],
    ["motion", "fast"],
    ["style", "neon"],
    ["fontSans", "comic"],
  ])("refuses a bad %s (%j) and names it", (field, value) => {
    expect(importAppearance({ defaults: { [field]: value } })).toEqual({ ok: false, issues: [{ field, reason: "invalid" }] });
  });

  it("reports every bad field at once and restores nothing", () => {
    const result = importAppearance({ defaults: { palette: "ruby", mode: "bright", uiScale: 9 }, glassRendering: "fast" });
    expect(result).toEqual({
      ok: false,
      issues: [
        { field: "mode", reason: "invalid" },
        { field: "uiScale", reason: "invalid" },
        { field: "glassRendering", reason: "invalid" },
      ],
    });
  });

  it.each(["https://example.test/x.png", "http://example.test/x.png", "/\\example.test/x.png", "/\t/example.test/x.png"])(
    "refuses a remote picture unless asked: %j",
    (backgroundImage) => {
      expect(importAppearance({ defaults: { backgroundImage } })).toEqual({ ok: false, issues: [{ field: "backgroundImage", reason: "picture-remote" }] });
      expect(importAppearance({ defaults: { backgroundImage } }, { remotePictures: true })).toMatchObject({ ok: true });
    },
  );

  it.each(["/pictures/x.webp", "./x.png", "../x.png", "data:image/png;base64,AAAA"])("accepts a same-site or embedded picture: %j", (backgroundImage) => {
    expect(importAppearance({ defaults: { backgroundImage } })).toMatchObject({ ok: true });
  });

  it("imports a theme exported with the removed baked rendering, and blurs live", () => {
    const result = importAppearance({ defaults: {}, glassRendering: "baked" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.theme.defaults.glassRendering).toBeUndefined();
  });
});
