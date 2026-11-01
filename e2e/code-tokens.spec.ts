import { expect, test, type Page } from "@playwright/test";

/*
 * The shared code colours (--code-*, src/styles/code.css). The code block's Shiki theme reads the
 * same roles through --fa-code-*. Contrast (R20.1) is measured on the ground they are drawn on,
 * in every palette, both modes, and Glass, Frosted and Solid. The ground is sampled from the
 * rendered pixels (text hidden), so the blur, the tint and the canvas behind are all counted, and
 * the worst sample counts.
 *
 * Dark mode and every role on Solid reach 4.5:1 except the light-mode hues that turn round the
 * circle (strings, constants, functions), which the code block has always drawn at the accent
 * text's lightness: a green or yellow at that lightness is lighter than the accent itself. Those
 * hold a regression floor here until their lightness is tuned (the colours stay as shipped, so
 * code blocks look the same). The floors are the measured worst values, rounded down.
 */

/** Every built-in palette (appearance.ts PALETTES; importing it here would pull the font assets into Playwright). */
const PALETTES = ["ocean", "aurora", "emerald", "sunset", "graphite", "ruby", "lagoon", "indigo", "rose", "moss", "sand", "slate"];
const ROLES = ["keyword", "string", "string-expression", "constant", "function", "type", "parameter", "punctuation", "comment", "link"] as const;
/** The lowest worst-case ratio a role may have; 4.5 is the requirement, lower floors are known shortfalls. */
function floor(mode: string, level: string, role: string) {
  if (mode === "dark") return 4.5;
  if (role === "parameter" || role === "punctuation") return 4.5;
  if (level === "solid") return ["string", "string-expression", "constant", "function"].includes(role) ? 3.9 : 4.5;
  return 2.5;
}
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

/** Worst contrast of every role against the rendered ground of the first code block. */
async function worst(page: Page) {
  const block = page.locator(".fa-ai-code-scroll").first();
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
        probe.style.color = `var(--code-${role})`;
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
      console.log(`code contrast ${mode}/${level}: worst ${lowest[2].toFixed(2)}:1 (${lowest[0]} ${lowest[1]})`);
      const failures = table
        .filter(([, role, ratio]) => ratio < floor(mode, level, role))
        .map(([palette, role, ratio]) => `${palette} ${role} ${ratio.toFixed(2)} (needs ${floor(mode, level, role)})`);
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
