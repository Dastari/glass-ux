import { expect, test, type Page } from "@playwright/test";

const STORAGE_KEY = "glass-ux.appearance.v1";

async function open(page: Page, path: string, appearance: Record<string, string>) {
  await page.addInitScript(
    ([key, value]) => localStorage.setItem(key, value),
    [STORAGE_KEY, JSON.stringify({ mode: "light", palette: "ocean", ...appearance })] as const,
  );
  await page.goto(path);
  await page.waitForSelector("[data-hydrated]");
}

async function hover(page: Page, selector: string) {
  const target = page.locator(selector).first();
  await target.scrollIntoViewIfNeeded();
  const box = await target.boundingBox();
  if (!box) throw new Error(`${selector} has no box`);
  await page.mouse.move(box.x + 4, box.y + 4);
  await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.5, { steps: 4 });
}

const article = "[data-scroll-container] .gallery-specimen";

test("Animated: indicators glide on springs and lit glass follows the pointer", async ({ page }) => {
  await open(page, "foundations/motion", { motion: "full", glass: "full" });
  const segmented = page.locator(`${article} .fa-segmented`).first();
  await segmented.scrollIntoViewIfNeeded();
  await segmented.getByRole("button", { name: "Files" }).click();
  const indicator = segmented.locator(".fa-glide");
  await expect(indicator).toHaveAttribute("data-direction", "forward");
  const running = await indicator.evaluate((node) => node.getAnimations().map((animation) => (animation as CSSTransition).transitionProperty));
  expect(running.sort()).toEqual(["--glide-end", "--glide-start"]);

  await hover(page, `${article} .fa-btn`);
  await expect.poll(() => page.locator(`${article} .fa-btn`).first().evaluate((node) => (node as HTMLElement).style.getPropertyValue("--light-x"))).not.toBe("");
});

test("Still: nothing animates and the light rests", async ({ page }) => {
  await open(page, "foundations/motion", { motion: "reduced", glass: "full" });
  const segmented = page.locator(`${article} .fa-segmented`).first();
  await segmented.scrollIntoViewIfNeeded();
  await segmented.getByRole("button", { name: "Files" }).click();
  await hover(page, `${article} .fa-btn`);
  // The skeleton shimmers, the glide and the press spring are all on duration tokens or
  // keyframes that the motion switch stops.
  const animations = await page.evaluate(() =>
    document.getAnimations().filter((animation) => {
      const timing = animation.effect?.getComputedTiming();
      return animation.playState === "running" && Number(timing?.duration ?? 0) > 20;
    }).length,
  );
  expect(animations).toBe(0);
  expect(await page.locator(`${article} .fa-btn`).first().evaluate((node) => (node as HTMLElement).style.getPropertyValue("--light-x"))).toBe("");
});

test("Solid: optics are off and fills are opaque", async ({ page }) => {
  await open(page, "foundations/materials", { motion: "full", glass: "solid" });
  const tile = page.locator(".materials-lit-tile.glass-card").first();
  await tile.scrollIntoViewIfNeeded();
  await hover(page, ".materials-lit-tile.glass-card");
  const optics = await tile.evaluate((node) => {
    const style = getComputedStyle(node);
    return {
      fill: style.backgroundColor,
      lens: style.getPropertyValue("--glass-lens").trim(),
      specular: style.getPropertyValue("--specular").trim(),
      light: (node as HTMLElement).style.getPropertyValue("--light-x"),
    };
  });
  expect(optics.lens).toBe("transparent");
  expect(optics.specular).toBe("transparent");
  expect(optics.light).toBe("");
  expect(optics.fill).not.toMatch(/\/ 0\.|rgba\([^)]*, 0\./);
});

test("controls on glass-float take its light foreground in the light theme", async ({ page }) => {
  await open(page, "foundations/materials", { motion: "reduced", glass: "full" });
  const button = page.locator(".materials-toolbar .fa-btn").first();
  await button.scrollIntoViewIfNeeded();
  const lightness = async () =>
    button.evaluate((element) => {
      // Resolve any colour syntax (oklch, color-mix) to sRGB through a canvas.
      const context = document.createElement("canvas").getContext("2d")!;
      context.fillStyle = getComputedStyle(element).color;
      context.fillRect(0, 0, 1, 1);
      const [r, g, b] = context.getImageData(0, 0, 1, 1).data;
      return (0.2126 * r! + 0.7152 * g! + 0.0722 * b!) / 255;
    });
  expect(await button.evaluate((element) => element.closest("[data-mode]")?.getAttribute("data-mode") ?? null)).not.toBe("dark");
  expect(await lightness()).toBeGreaterThan(0.6);
  await button.hover();
  expect(await lightness()).toBeGreaterThan(0.8);
});
