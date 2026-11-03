import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

/* ColorWheel: drag and commit, double press, keyboard and focus, right to left, the bead's contrast on the disc, forced colours. */

async function open(page: Page, appearance: Record<string, unknown> = {}) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(
    (stored) => localStorage.setItem("glass-ux.appearance.v1", JSON.stringify({ mode: "light", palette: "graphite", motion: "reduced", ...stored })),
    appearance,
  );
  await page.goto("/components/color-wheel");
  const demo = page.getByTestId("color-wheel");
  await expect(demo.getByRole("slider", { name: "Hue" })).toBeAttached({ timeout: 30_000 });
  await demo.scrollIntoViewIfNeeded();
  return { errors, demo, value: page.getByTestId("color-wheel-value"), committed: page.getByTestId("color-wheel-committed") };
}

/** The field's centre and radius in page pixels: where the bead travels. */
async function field(wheel: Locator) {
  const box = (await wheel.locator(".fa-color-wheel-field").boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2, r: box.width / 2 };
}

const parse = (text: string | null) => {
  const [, hue, amount] = /hue ([\d.]+), amount ([\d.]+)/.exec(text ?? "")!;
  return { hue: Number(hue), amount: Number(amount) };
};

test("a drag reports as it moves and commits once on release @responsive", async ({ page }) => {
  const { errors, demo, value, committed } = await open(page);
  const centre = await field(demo);
  const before = await committed.textContent();
  await page.mouse.move(centre.x + centre.r * 0.5, centre.y);
  await page.mouse.down();
  await expect(value).toHaveText("hue 0, amount 50");
  await page.mouse.move(centre.x, centre.y - centre.r * 0.8, { steps: 5 });
  await expect(value).toHaveText("hue 90, amount 80");
  await expect(committed).toHaveText(before!);
  // Past the rim holds at the rim.
  await page.mouse.move(centre.x - centre.r * 2, centre.y, { steps: 3 });
  await page.mouse.up();
  await expect(value).toHaveText("hue 180, amount 100");
  await expect(committed).toHaveText("committed 180, 100");
  // The pointer focuses the wheel without a keyboard focus ring.
  await expect(demo.getByRole("slider", { name: "Hue" })).toBeFocused();
  expect(await demo.locator(".fa-color-wheel-bead").evaluate((el) => getComputedStyle(el).outlineStyle)).toBe("none");
  expect(errors).toEqual([]);
});

test("a double press returns to neutral and keeps the hue", async ({ page }) => {
  const { demo, value, committed } = await open(page);
  const centre = await field(demo);
  await page.mouse.dblclick(centre.x + centre.r * 0.3, centre.y - centre.r * 0.3);
  await expect(value).toHaveText("hue 45, amount 0");
  await expect(committed).toHaveText("committed 45, 0");
  await expect(demo.getByRole("slider", { name: "Amount" })).toHaveAttribute("aria-valuetext", "Neutral");
});

test("one tab stop: arrows by axis, focus follows the value that moved, and the ring shows", async ({ page }) => {
  const { demo, value } = await open(page);
  const hue = demo.getByRole("slider", { name: "Hue" });
  const amount = demo.getByRole("slider", { name: "Amount" });
  await hue.focus();
  await page.keyboard.press("ArrowRight");
  await expect(value).toHaveText("hue 59, amount 30");
  await expect(hue).toHaveAttribute("aria-valuetext", "Orange, 59°");
  await page.keyboard.press("ArrowUp");
  await expect(amount).toBeFocused();
  await expect(amount).toHaveAttribute("aria-valuetext", "31%");
  await page.keyboard.press("Shift+ArrowUp");
  await expect(value).toHaveText("hue 59, amount 41");
  await page.keyboard.press("End");
  await expect(value).toHaveText("hue 59, amount 100");
  await page.keyboard.press("Home");
  await expect(amount).toHaveAttribute("aria-valuetext", "Neutral");
  await page.keyboard.press("Shift+ArrowLeft");
  await expect(hue).toBeFocused();
  await expect(value).toHaveText("hue 49, amount 0");
  const bead = demo.locator(".fa-color-wheel-bead");
  expect(await bead.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe("solid");

  // Tab leaves the wheel in one step, and Shift+Tab comes back to the slider used last.
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("Tab");
  await expect(demo.locator(":focus")).toHaveCount(0);
  await page.keyboard.press("Shift+Tab");
  await expect(amount).toBeFocused();
});

test("right to left: the wheel does not mirror, and Left raises the hue", async ({ page }) => {
  await open(page);
  const rtl = page.getByTestId("color-wheel-rtl");
  await rtl.scrollIntoViewIfNeeded();
  const centre = await field(rtl);
  const bead = (await rtl.locator(".fa-color-wheel-bead").boundingBox())!;
  // 195° sits left of the centre in every language.
  expect(bead.x + bead.width / 2).toBeLessThan(centre.x - centre.r * 0.4);
  const hue = rtl.getByRole("slider", { name: "Hue" });
  await hue.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(hue).toHaveAttribute("aria-valuetext", "Cyan, 196°");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(hue).toHaveAttribute("aria-valuetext", "Cyan, 194°");
});

/**
 * The bead's best contrast against the disc beside it: the white ring or the dark edge outside
 * it, each against the disc a few pixels further out, sampled toward the centre (at the rim,
 * outward is the panel).
 */
async function beadContrast(page: Page, wheel: Locator) {
  const bead = (await wheel.locator(".fa-color-wheel-bead").boundingBox())!;
  const centre = await field(wheel);
  const pad = 14;
  const clip = { x: bead.x - pad, y: bead.y - pad, width: bead.width + pad * 2, height: bead.height + pad * 2 };
  const shot = await page.screenshot({ clip, animations: "disabled" });
  const scale = await page.evaluate(() => devicePixelRatio);
  const ring = await wheel.locator(".fa-color-wheel").evaluate((el) => {
    const px = (name: string) => {
      const probe = document.createElement("div");
      probe.style.width = `var(${name})`;
      el.append(probe);
      const width = probe.getBoundingClientRect().width;
      probe.remove();
      return width;
    };
    return { ring: px("--_ring-width"), border: px("--_edge-width") };
  });
  const bx = bead.x + bead.width / 2;
  const by = bead.y + bead.height / 2;
  const towards = Math.hypot(centre.x - bx, centre.y - by) > 1 ? Math.atan2(centre.y - by, centre.x - bx) : Math.PI / 3;
  return page.evaluate(
    async ({ data, scale, radius, ring, border, towards, pad }) => {
      const image = new Image();
      image.src = `data:image/png;base64,${data}`;
      await image.decode();
      const canvas = new OffscreenCanvas(image.width, image.height);
      const context = canvas.getContext("2d")!;
      context.drawImage(image, 0, 0);
      const pixel = (distance: number, angle: number) => {
        const x = Math.round((pad + radius + Math.cos(angle) * distance) * scale);
        const y = Math.round((pad + radius + Math.sin(angle) * distance) * scale);
        return Array.from(context.getImageData(x, y, 1, 1).data.slice(0, 3));
      };
      const linear = (v: number) => ((v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
      const luminance = ([r, g, b]: number[]) => 0.2126 * linear(r!) + 0.7152 * linear(g!) + 0.0722 * linear(b!);
      const ratio = (a: number[], b: number[]) => {
        const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
        return (x! + 0.05) / (y! + 0.05);
      };
      // Along three lines toward the centre: the lightest and darkest pixels across the white ring
      // and its dark edge, each against the disc just beyond them. The worst line counts.
      let best = Infinity;
      let sample = { light: [0, 0, 0], dark: [0, 0, 0], disc: [0, 0, 0] };
      for (const angle of [towards - 0.5, towards, towards + 0.5]) {
        const across: number[][] = [];
        for (let d = radius; d <= radius + ring + border + 0.5; d += 0.25) across.push(pixel(d, angle));
        const light = across.reduce((a, b) => (luminance(b) > luminance(a) ? b : a));
        const dark = across.reduce((a, b) => (luminance(b) < luminance(a) ? b : a));
        const disc = pixel(radius + ring + border + 4, angle);
        const line = Math.max(ratio(light, disc), ratio(dark, disc));
        if (line < best) {
          best = line;
          sample = { light, dark, disc };
        }
      }
      return { ...sample, best };
    },
    { data: shot.toString("base64"), scale, radius: bead.width / 2, ring: ring.ring, border: ring.border, towards, pad },
  );
}

test.describe("contrast", () => {
  // Two device pixels to a CSS pixel, so the one-pixel edge is drawn whole rather than blended.
  test.use({ deviceScaleFactor: 2 });
  for (const mode of ["light", "dark"] as const) {
    test(`the bead stands out from the disc at every hue, ${mode}`, async ({ page }) => {
      const { demo } = await open(page, { mode });
      const amount = demo.getByRole("slider", { name: "Amount" });
      await amount.focus();
      const results: string[] = [];
      for (const step of ["Home", "PageUp", "PageUp", "PageUp", "PageUp", "PageUp", "End"]) {
        await page.keyboard.press(step);
        for (let turn = 0; turn < 6; turn++) {
          await amount.blur(); // the focus ring would sit where the disc is sampled
          const { best, disc, light, dark } = await beadContrast(page, demo);
          if (best < 3)
            results.push(
              `${await demo.getByRole("slider", { name: "Hue" }).getAttribute("aria-valuetext")}, ${await amount.getAttribute("aria-valuetext")}: ${best.toFixed(2)} on ${disc} (light ${light}, dark ${dark})`,
            );
          await amount.focus();
          for (let i = 0; i < 6; i++) await page.keyboard.press("Shift+ArrowRight");
          await amount.focus();
        }
      }
      expect(results).toEqual([]);
    });
  }
});

test("the bead stays inside the wheel's box at the rim @responsive", async ({ page }) => {
  const { demo } = await open(page);
  const box = (await demo.locator(".fa-color-wheel-disc").boundingBox())!;
  await demo.getByRole("slider", { name: "Amount" }).focus();
  await page.keyboard.press("End");
  for (let turn = 0; turn < 8; turn++) {
    const bead = (await demo.locator(".fa-color-wheel-bead").boundingBox())!;
    expect(bead.x).toBeGreaterThanOrEqual(box.x - 0.5);
    expect(bead.y).toBeGreaterThanOrEqual(box.y - 0.5);
    expect(bead.x + bead.width).toBeLessThanOrEqual(box.x + box.width + 0.5);
    expect(bead.y + bead.height).toBeLessThanOrEqual(box.y + box.height + 0.5);
    for (let i = 0; i < 5; i++) await page.keyboard.press("Shift+ArrowRight");
  }
});

test("forced colours keep the hues, bound the wheel and show focus in Highlight", async ({ page }) => {
  await page.emulateMedia({ forcedColors: "active" });
  const { demo } = await open(page);
  const fieldBox = demo.locator(".fa-color-wheel-field");
  expect(await fieldBox.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe("solid");
  const bead = demo.locator(".fa-color-wheel-bead");
  expect(await bead.evaluate((el) => getComputedStyle(el).forcedColorAdjust)).toBe("none");
  await demo.getByRole("slider", { name: "Hue" }).focus();
  await page.keyboard.press("ArrowRight");
  expect(await bead.evaluate((el) => `${getComputedStyle(el).outlineStyle} ${getComputedStyle(el).outlineColor}`)).toMatch(/^solid /);
});

test("passes axe @responsive", async ({ page }) => {
  await open(page);
  const result = await new AxeBuilder({ page })
    .include("[data-testid=color-wheel]")
    .include("[data-testid=color-grading]")
    .include("[data-testid=color-wheel-rtl]")
    .analyze();
  expect(result.violations.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(", ")}`)).toEqual([]);
});
