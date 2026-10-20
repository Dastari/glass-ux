import { expect, test, type Page } from "@playwright/test";

/*
 * Mode and palette islands (src/styles/themes.css). With @scope the nearest data-mode wins
 * however islands nest. Browsers without @scope (Firefox ESR 140) drop those blocks and use
 * src/styles/scope-fallback.css, which must give the same roles except for a palette island
 * inside a light island on a dark page, where it takes the page's mode.
 */

type Island = { id: string; parent: string; mode?: "light" | "dark"; palette?: string };

const ISLANDS: Island[] = [
  { id: "light-graphite", parent: "host", mode: "light", palette: "graphite" },
  { id: "ruby-in-light", parent: "light-graphite", palette: "ruby" },
  { id: "dark-in-ruby", parent: "ruby-in-light", mode: "dark" },
  { id: "graphite-in-dark", parent: "dark-in-ruby", palette: "graphite" },
  { id: "graphite-at-root", parent: "host", palette: "graphite" },
  { id: "light-plain", parent: "host", mode: "light" },
  { id: "emerald-in-light", parent: "light-plain", palette: "emerald" },
];

/** Island id → nearest mode, by page mode. */
const NEAREST = {
  dark: {
    html: "dark",
    host: "dark",
    "light-graphite": "light",
    "ruby-in-light": "light",
    "dark-in-ruby": "dark",
    "graphite-in-dark": "dark",
    "graphite-at-root": "dark",
    "light-plain": "light",
    "emerald-in-light": "light",
  },
  light: {
    html: "light",
    host: "light",
    "light-graphite": "light",
    "ruby-in-light": "light",
    "dark-in-ruby": "dark",
    "graphite-in-dark": "dark",
    "graphite-at-root": "light",
    "light-plain": "light",
    "emerald-in-light": "light",
  },
} as const;

/** Without @scope a palette island cannot tell that a nearer light island beats a dark page. */
const FALLBACK_LIMITED: Record<"light" | "dark", Set<string>> = {
  dark: new Set(["light-graphite", "ruby-in-light", "emerald-in-light"]),
  light: new Set(),
};

async function islandRoles(page: Page, pageMode: "light" | "dark", withoutScope: boolean) {
  return page.evaluate(
    ({ islands, pageMode, withoutScope }) => {
      if (withoutScope) {
        const strip = (list: CSSStyleSheet | CSSGroupingRule) => {
          for (let index = list.cssRules.length - 1; index >= 0; index--) {
            const rule = list.cssRules[index];
            if (rule instanceof CSSScopeRule) list.deleteRule(index);
            else if (rule instanceof CSSGroupingRule) strip(rule);
          }
        };
        for (const sheet of document.styleSheets) strip(sheet);
      }
      const html = document.documentElement;
      html.dataset.mode = pageMode;
      html.dataset.palette = "ocean";
      const host = document.createElement("div");
      host.id = "host";
      document.body.append(host);
      for (const island of islands) {
        const element = document.createElement("div");
        element.id = island.id;
        if (island.mode) element.dataset.mode = island.mode;
        if (island.palette) element.dataset.palette = island.palette;
        document.getElementById(island.parent)!.append(element);
      }
      const lightness = (value: string) => Number.parseFloat(/oklch\(\s*([\d.]+)/.exec(value)?.[1] ?? "NaN");
      return Object.fromEntries(
        [html, host, ...islands.map((island) => document.getElementById(island.id)!)].map((element) => {
          const style = getComputedStyle(element);
          const canvas = style.getPropertyValue("--canvas").trim();
          return [
            element.id || "html",
            {
              canvas,
              mode: lightness(canvas) > 0.5 ? "light" : "dark",
              accentL: Number.parseFloat(style.getPropertyValue("--accent-l")),
              brand: style.getPropertyValue("--brand-primary").trim(),
            },
          ];
        }),
      );
    },
    { islands: ISLANDS, pageMode, withoutScope },
  );
}

test.beforeEach(async ({ page }) => {
  await page.goto("./");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

for (const pageMode of ["light", "dark"] as const) {
  test(`islands take the nearest data-mode with @scope on a ${pageMode} page`, async ({ page }) => {
    const roles = await islandRoles(page, pageMode, false);
    for (const [id, mode] of Object.entries(NEAREST[pageMode])) expect(roles[id].mode, id).toBe(mode);
    // Graphite's accent is ink in light mode and paper in dark mode.
    expect(roles["light-graphite"].accentL).toBeCloseTo(0.3);
    expect(roles["graphite-in-dark"].accentL).toBeCloseTo(0.93);
  });

  test(`colour roles survive without @scope on a ${pageMode} page`, async ({ page }) => {
    const roles = await islandRoles(page, pageMode, true);
    for (const [id, role] of Object.entries(roles)) {
      expect(role.canvas, `${id} --canvas`).not.toBe("");
      expect(role.brand, `${id} --brand-primary`).not.toBe("");
    }
    for (const [id, mode] of Object.entries(NEAREST[pageMode])) {
      if (!FALLBACK_LIMITED[pageMode].has(id)) expect(roles[id].mode, id).toBe(mode);
    }
    expect(roles["graphite-in-dark"].accentL).toBeCloseTo(0.93);
    expect(roles["graphite-at-root"].accentL).toBeCloseTo(pageMode === "dark" ? 0.93 : 0.3);
  });
}
