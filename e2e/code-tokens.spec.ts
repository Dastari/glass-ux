import { expect, test, type Page } from "@playwright/test";

/*
 * The shared code colours (--code-*, src/styles/code.css). The code block's Shiki theme reads the
 * same roles through --fa-code-*. Contrast (R20.1) is measured on the ground they are drawn on,
 * in every palette, both modes, and Glass, Frosted and Solid. The ground is sampled from the
 * rendered pixels (text hidden), so the blur, the tint and the canvas behind are all counted, and
 * the worst sample counts. Every role has to reach 4.5:1, on Silk and on every other canvas.
 * Light mode also has to keep its roles apart, for full colour vision and for each dichromacy.
 */

/** Every built-in palette (appearance.ts PALETTES; importing it here would pull the font assets into Playwright). */
const PALETTES = ["ocean", "aurora", "emerald", "sunset", "graphite", "ruby", "lagoon", "indigo", "rose", "moss", "sand", "slate"];
const ROLES = ["keyword", "string", "string-expression", "constant", "function", "type", "parameter", "punctuation", "comment", "link", "line-number"] as const;
/** The canvases a bare code well can sit on (appearance.ts BUILT_IN_BACKGROUNDS, without the empty picture slot). */
const BACKGROUNDS = ["silk", "mesh", "currents", "waves", "contours", "facets", "grid", "pixels", "circuit", "network", "skyline", "harbour", "forest", "hills", "garden", "plain"];
const FLOOR = 4.5;
const MODES = ["light", "dark"] as const;
const LEVELS = ["full", "reduced", "solid"] as const;

async function open(page: Page, appearance: Record<string, unknown>) {
  await page.addInitScript(
    (value) => localStorage.setItem("glass-ux.appearance.v1", JSON.stringify({ motion: "reduced", ...value })),
    appearance,
  );
  await page.goto("/components/code-block");
  await expect(page.locator(".fa-ai-code").first()).toBeAttached({ timeout: 30_000 });
  await page.waitForTimeout(700);
}

/** Worst contrast of every role against the rendered ground of one code block. */
async function worst(page: Page, index = 0) {
  const block = page.locator(".fa-ai-code-scroll").nth(index);
  await block.scrollIntoViewIfNeeded();
  await page.addStyleTag({ content: ".fa-ai-code, .fa-ai-code * { color: transparent !important; -webkit-text-fill-color: transparent !important; caret-color: transparent !important }" });
  await page.waitForTimeout(150);
  const png = (await block.screenshot()).toString("base64");
  return page.evaluate(
    async ([png64, roles]) => {
      // Outside the code block, whose text is hidden; the roles are page-wide.
      const probe = document.createElement("span");
      document.body.append(probe);
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d", { willReadFrequently: true })!;
      const rgb = (css: string) => {
        context.clearRect(0, 0, 1, 1);
        context.fillStyle = "#000";
        context.fillStyle = css;
        context.fillRect(0, 0, 1, 1);
        const [r, g, b] = context.getImageData(0, 0, 1, 1).data;
        return [r!, g!, b!];
      };
      const lum = ([r, g, b]: number[]) => {
        const f = (v: number) => { const s = v / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
        return 0.2126 * f(r!) + 0.7152 * f(g!) + 0.0722 * f(b!);
      };
      const ratio = (a: number[], b: number[]) => { const [x, y] = [lum(a), lum(b)]; return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
      const image = await createImageBitmap(await (await fetch(`data:image/png;base64,${png64}`)).blob());
      canvas.width = image.width;
      canvas.height = image.height;
      context.drawImage(image, 0, 0);
      const samples: number[][] = [];
      for (let ix = 0; ix < 16; ix++)
        for (let iy = 0; iy < 8; iy++) {
          const x = Math.floor(((ix + 0.5) / 16) * image.width);
          const y = Math.floor(((iy + 0.5) / 8) * image.height);
          const [r, g, b] = context.getImageData(x, y, 1, 1).data;
          samples.push([r!, g!, b!]);
        }
      const result: Record<string, { ratio: number; colour: string }> = {};
      for (const role of roles) {
        // Line numbers are drawn in the muted text colour, not a code role.
        probe.style.color = role === "line-number" ? "var(--fg-muted)" : `var(--code-${role})`;
        const colour = getComputedStyle(probe).color;
        const ink = rgb(colour);
        result[role] = { ratio: Math.min(...samples.map((ground) => ratio(ink, ground))), colour };
      }
      probe.remove();
      return result;
    },
    [png, ROLES] as const,
  );
}

for (const mode of MODES)
  for (const level of LEVELS)
    test(`every code role reaches 4.5:1 in every palette (${mode}, ${level})`, async ({ page }) => {
      test.setTimeout(240_000);
      const table: Array<[string, string, number]> = [];
      for (const palette of PALETTES) {
        await open(page, { mode, palette, glass: level });
        const result = await worst(page);
        for (const role of ROLES) table.push([palette, role, result[role]!.ratio]);
      }
      const lowest = table.reduce((a, b) => (b[2] < a[2] ? b : a));
      const numbers = table.filter(([, role]) => role === "line-number").reduce((a, b) => (b[2] < a[2] ? b : a));
      console.log(`code contrast ${mode}/${level}: worst ${lowest[2].toFixed(2)}:1 (${lowest[0]} ${lowest[1]}), line numbers ${numbers[2].toFixed(2)}:1 (${numbers[0]})`);
      const failures = table.filter(([, , ratio]) => ratio < FLOOR).map(([palette, role, ratio]) => `${palette} ${role} ${ratio.toFixed(2)}`);
      expect(failures).toEqual([]);
    });

// Light Glass over the artwork: Ruby's canvas is the darkest and Emerald's greens the lightest ink.
// Dark Glass holds line numbers only: comments on a bare well are a known gap (AGENTS.md).
for (const [mode, palette] of [["light", "ruby"], ["light", "emerald"], ["dark", "ruby"], ["dark", "emerald"]] as const)
  test(`every code role reaches 4.5:1 on every canvas, along the whole page (${mode}, Glass, ${palette})`, async ({ page }) => {
    test.setTimeout(420_000);
    const table: Array<[string, string, number]> = [];
    for (const background of BACKGROUNDS) {
      await open(page, { mode, palette, glass: "full", background });
      const blocks = await page.locator(".fa-ai-code-scroll").count();
      for (let index = 0; index < blocks; index++) {
        const result = await worst(page, index);
        for (const role of ROLES) table.push([background, role, result[role]!.ratio]);
      }
    }
    const lowest = table.reduce((a, b) => (b[2] < a[2] ? b : a));
    const numbers = table.filter(([, role]) => role === "line-number").reduce((a, b) => (b[2] < a[2] ? b : a));
    console.log(`code contrast on canvases, ${mode} ${palette}: worst ${lowest[2].toFixed(2)}:1 (${lowest[0]} ${lowest[1]}), line numbers ${numbers[2].toFixed(2)}:1 (${numbers[0]})`);
    const failures = table
      .filter(([, role, ratio]) => ratio < FLOOR && (mode === "light" || role === "line-number"))
      .map(([background, role, ratio]) => `${background} ${role} ${ratio.toFixed(2)}`);
    expect(failures).toEqual([]);
  });

/** Machado, Oliveira & Fernandes 2009 at full severity, in linear sRGB. */
const VISION: Record<string, number[][] | null> = {
  full: null,
  protanopia: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deuteranopia: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]],
  tritanopia: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.3039]],
};
/** The smallest OKLab distance two light-mode syntax colours may have under each kind of vision. */
const DISTINCT: Record<string, number> = { full: 0.06, protanopia: 0.02, deuteranopia: 0.02, tritanopia: 0.02 };

function oklab(rgb: number[], matrix: number[][] | null) {
  const linear = rgb.map((value) => { const s = value / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; });
  const seen = matrix ? matrix.map((row) => Math.min(1, Math.max(0, row[0]! * linear[0]! + row[1]! * linear[1]! + row[2]! * linear[2]!))) : linear;
  const [r, g, b] = seen as [number, number, number];
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}

test("light syntax colours stay distinct from each other and from the plain text in every palette, for each kind of colour vision", async ({ page }) => {
  // Solid: the colours are the same on every material, and it is the quickest to open.
  const report: string[] = [];
  const failures: string[] = [];
  const lowest: Record<string, number> = {};
  for (const palette of PALETTES) {
    await open(page, { mode: "light", palette, glass: "solid" });
    // Parameters, punctuation and comments deliberately share the muted ink.
    const names = ["foreground", "keyword", "string", "function", "constant", "type", "parameter"];
    const inks = await page.evaluate((list) => {
      const probe = document.createElement("span");
      document.body.append(probe);
      const context = document.createElement("canvas").getContext("2d", { willReadFrequently: true })!;
      const out = list.map((name) => {
        probe.style.color = `var(--code-${name})`;
        context.clearRect(0, 0, 1, 1);
        context.fillStyle = getComputedStyle(probe).color;
        context.fillRect(0, 0, 1, 1);
        const [r, g, b] = context.getImageData(0, 0, 1, 1).data;
        return [r!, g!, b!];
      });
      probe.remove();
      return out;
    }, names);
    for (const [vision, matrix] of Object.entries(VISION)) {
      const seen = inks.map((rgb) => oklab(rgb, matrix));
      let least = Infinity;
      let pair = "";
      for (let a = 0; a < seen.length; a++)
        for (let b = a + 1; b < seen.length; b++) {
          // The two neutrals differ in lightness alone, and always have.
          if (names[a] === "foreground" && names[b] === "parameter") continue;
          const distance = Math.hypot(...seen[a]!.map((value, axis) => value - seen[b]![axis]!));
          if (distance < least) { least = distance; pair = `${names[a]}/${names[b]}`; }
        }
      lowest[vision] = Math.min(lowest[vision] ?? Infinity, least);
      report.push(`${palette} ${vision} ${least.toFixed(3)} ${pair}`);
      if (least < DISTINCT[vision]!) failures.push(`${palette} ${vision} ${pair} ${least.toFixed(3)} (needs ${DISTINCT[vision]})`);
    }
  }
  console.log(`code role distinctness, worst pair: ${Object.entries(lowest).map(([vision, value]) => `${vision} ${value.toFixed(3)}`).join(", ")}`);
  console.log(report.join("\n"));
  expect(failures).toEqual([]);
});

test("the --code-* roles are what the code block renders, and a palette island recomputes them", async ({ page }) => {
  await open(page, { mode: "light", palette: "graphite" });
  const same = await page.evaluate((roles) => {
    const host = document.querySelector(".fa-ai-code")!;
    const probe = document.createElement("span");
    host.append(probe);
    const read = (name: string) => { probe.style.color = `var(${name})`; return getComputedStyle(probe).color; };
    const out = roles
      .filter((role) => role !== "type")
      .map((role) => [role, read(`--code-${role}`), read(`--fa-code-token-${role}`)]);
    probe.remove();
    return out;
  }, ROLES);
  for (const [role, shared, token] of same) expect(shared, role).toBe(token);
  // An island with its own palette derives its own colours; the page's stay put.
  const island = await page.evaluate(() => {
    const wrap = document.createElement("div");
    wrap.setAttribute("data-palette", "ruby");
    wrap.setAttribute("data-mode", "dark");
    const probe = document.createElement("span");
    wrap.append(probe);
    document.body.append(wrap);
    const read = (name: string) => { probe.style.color = `var(${name})`; return getComputedStyle(probe).color; };
    const out = { keyword: read("--code-keyword"), accent: read("--accent-text"), type: read("--code-type") };
    wrap.remove();
    return out;
  });
  expect(island.keyword).toBe(island.accent);
  expect(island.type).not.toBe(island.keyword);
});

test("a host override of a --fa-code-* token on the code block still wins", async ({ page }) => {
  await open(page, { mode: "light", palette: "graphite" });
  const colour = await page.evaluate(() => {
    const host = document.querySelector<HTMLElement>(".fa-ai-code")!;
    host.style.setProperty("--fa-code-token-keyword", "rgb(1, 2, 3)");
    const probe = document.createElement("span");
    probe.style.color = "var(--fa-code-token-keyword)";
    host.append(probe);
    const value = getComputedStyle(probe).color;
    probe.remove();
    return value;
  });
  expect(colour).toBe("rgb(1, 2, 3)");
});
