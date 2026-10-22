import { expect, test, type Page } from "@playwright/test";

/*
 * Glass rendering (configureAppearance glassRendering) and per-surface material levels.
 * Baked rendering shows panels on the page canvas a copy of the canvas blurred once; it must
 * look like the live blur, give way to it while a scroller moves the panels, and follow each
 * surface's own level, which is never more transparent than the page's.
 */

const frost = (page: Page, selector: string) =>
  page.locator(selector).first().evaluate((element) => {
    const before = getComputedStyle(element, "::before");
    return {
      blur: before.backdropFilter,
      baked: before.backgroundImage.includes("blob:"),
      fill: before.backgroundColor,
    };
  });

async function open(page: Page, glass = "full") {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.addInitScript(
    (settings) => localStorage.setItem("glass-ux.appearance.v1", JSON.stringify(settings)),
    { mode: "light", glass, palette: "ocean", background: "mesh", motion: "reduced" },
  );
  await page.goto("/components/surface");
  await expect(page.locator(".docs-sidebar")).toBeVisible({ timeout: 30_000 });
}

const bake = async (page: Page) => {
  await page.evaluate(() => {
    document.documentElement.dataset.glassRendering = "baked";
  });
  await expect(page.locator("html")).toHaveAttribute("data-frost", "", { timeout: 10_000 });
};

/** The sidebar's material alone (its contents hidden), as pixels. */
const sidebarPixels = async (page: Page) => {
  await page.addStyleTag({ content: ".docs-sidebar > * { visibility: hidden !important; }" });
  const box = (await page.locator(".docs-sidebar").boundingBox())!;
  // Inside the rims and lens: the frosted body of the pane.
  return page.screenshot({ clip: { x: box.x + 24, y: box.y + 24, width: box.width - 48, height: box.height - 48 } });
};

test("baked frost matches the live blur at rest", async ({ page }) => {
  await open(page);
  await page.waitForTimeout(500);
  expect(await frost(page, ".docs-sidebar")).toMatchObject({ blur: expect.stringContaining("blur("), baked: false });
  const live = await sidebarPixels(page);
  await bake(page);
  expect(await frost(page, ".docs-sidebar")).toMatchObject({ blur: "none", baked: true });
  const baked = await sidebarPixels(page);
  const diff = await page.evaluate(
    async ([a, b]) => {
      const pixels = async (data: string) => {
        const image = new Image();
        image.src = `data:image/png;base64,${data}`;
        await image.decode();
        const canvas = new OffscreenCanvas(image.width, image.height);
        const context = canvas.getContext("2d")!;
        context.drawImage(image, 0, 0);
        return context.getImageData(0, 0, image.width, image.height).data;
      };
      const [x, y] = await Promise.all([pixels(a!), pixels(b!)]);
      let max = 0;
      for (let i = 0; i < x.length; i += 4)
        for (let c = 0; c < 3; c += 1) max = Math.max(max, Math.abs(x[i + c]! - y[i + c]!));
      return max;
    },
    [live.toString("base64"), baked.toString("base64")],
  );
  expect(diff).toBeLessThanOrEqual(8);
});

test("a scrolling page blurs live and returns to the bake when it settles", async ({ page }) => {
  await open(page);
  await bake(page);
  const panel = ".gallery-document-sections .glass-panel";
  expect(await frost(page, panel)).toMatchObject({ blur: "none", baked: true });
  await page.mouse.move(800, 500);
  await page.mouse.wheel(0, 200);
  // The scroller that moved the panel (the document or the docs layout's own) is marked.
  await expect.poll(() => page.locator(panel).first().evaluate((element) => Boolean(element.closest("[data-frost-live]")))).toBe(true);
  expect((await frost(page, panel)).blur).toContain("blur(");
  await expect.poll(() => frost(page, panel), { timeout: 3_000 }).toMatchObject({ blur: "none", baked: true });
});

test("a surface takes its own level, never more transparent than the page's", async ({ page }) => {
  await open(page);
  const panel = page.locator(".gallery-document-sections .glass-panel").first();
  await panel.evaluate((element) => {
    element.dataset.glass = "reduced";
  });
  expect((await frost(page, ".gallery-document-sections .glass-panel")).blur).toContain("blur(10px)");
  await panel.evaluate((element) => {
    element.dataset.glass = "solid";
  });
  expect((await frost(page, ".gallery-document-sections .glass-panel")).blur).toBe("none");
  // On a Frosted page a Glass surface stays Frosted.
  await panel.evaluate((element) => {
    element.dataset.glass = "full";
    document.documentElement.dataset.glass = "reduced";
  });
  expect((await frost(page, ".gallery-document-sections .glass-panel")).blur).toContain("blur(10px)");
  // Baked, a Frosted surface shows the Frosted bake.
  await bake(page);
  expect(await frost(page, ".gallery-document-sections .glass-panel")).toMatchObject({ blur: "none", baked: true });
  // On a Solid page nothing is baked and every surface is opaque.
  await page.evaluate(() => {
    document.documentElement.dataset.glass = "solid";
  });
  await expect(page.locator("html")).not.toHaveAttribute("data-frost", "");
  expect(await frost(page, ".gallery-document-sections .glass-panel")).toMatchObject({ blur: "none", baked: false });
});

test("the documentation toolbar switches the glass rendering and remembers it", async ({ page }) => {
  await open(page);
  const blur = page.locator('.docs-header [aria-label="Blur"]');
  await blur.getByText("Baked").first().click();
  await expect(page.locator("html")).toHaveAttribute("data-glass-rendering", "baked");
  await expect(page.locator("html")).toHaveAttribute("data-frost", "", { timeout: 10_000 });
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-frost", "", { timeout: 10_000 });
  await page.locator('.docs-header [aria-label="Blur"]').getByText("Live").first().click();
  await expect(page.locator("html")).not.toHaveAttribute("data-glass-rendering", /./);
  expect((await frost(page, ".docs-sidebar")).blur).toContain("blur(");
});
