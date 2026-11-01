import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/* GradientPicker: stops by drag and by keyboard, the single-pointer way, kinds and the CSS it writes. */

async function open(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() =>
    localStorage.setItem("glass-ux.appearance.v1", JSON.stringify({ mode: "light", palette: "graphite", motion: "reduced" })),
  );
  await page.goto("/components/gradient-picker");
  const demo = page.getByTestId("gradient-picker");
  await expect(demo.getByRole("slider", { name: "Stop 1" })).toBeVisible({ timeout: 30_000 });
  return { errors, demo, css: demo.getByTestId("gradient-css") };
}

test("a stop drags, and the value changes on release @responsive", async ({ page }) => {
  const { errors, demo, css } = await open(page);
  const stop = demo.getByRole("slider", { name: "Stop 2" });
  await stop.scrollIntoViewIfNeeded();
  const box = (await stop.boundingBox())!;
  const start = await css.textContent();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 - 40, box.y + box.height / 2, { steps: 4 });
  await expect(css).toHaveText(start!);
  const preview = await demo.locator(".fa-gradient-picker").evaluate((element: HTMLElement) => element.style.getPropertyValue("--_gradient"));
  expect(preview).not.toBe(start);
  await page.mouse.up();
  await expect(css).not.toHaveText(start!);
  await expect(css).toHaveText(preview);
  expect(errors).toEqual([]);
});

test("stops work from the keyboard and with single presses @responsive", async ({ page }) => {
  const { demo, css } = await open(page);
  await demo.getByRole("button", { name: "Add stop" }).click();
  await expect(demo.getByRole("slider", { name: "Stop 4" })).toHaveCount(1);
  await expect(demo.getByRole("slider", { name: "Stop 2" })).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Delete");
  await expect(demo.getByRole("slider", { name: "Stop 4" })).toHaveCount(0);

  await demo.getByRole("textbox", { name: "Position" }).fill("20");
  await demo.getByRole("textbox", { name: "Position" }).blur();
  await expect(css).toHaveText(/ 20%/);

  await demo.getByRole("button", { name: "Remove stop" }).click();
  await expect(demo.getByRole("slider", { name: "Stop 3" })).toHaveCount(0);
  await expect(demo.getByRole("button", { name: "Remove stop" })).toHaveAttribute("aria-description", "A gradient needs two stops");
});

test("the type changes the CSS and the preview paints it", async ({ page }) => {
  const { demo, css } = await open(page);
  await demo.getByRole("button", { name: "Radial" }).click();
  await expect(css).toHaveText(/^radial-gradient\(circle, /);
  await expect(demo.getByRole("textbox", { name: "Angle" })).toBeDisabled();
  await demo.getByRole("button", { name: "Angular" }).click();
  await expect(css).toHaveText(/^conic-gradient\(from 90deg, /);
  const painted = await demo.locator(".fa-gradient-preview").evaluate((element) => getComputedStyle(element).backgroundImage);
  expect(painted).toMatch(/^conic-gradient\(from 90deg, /);
  expect(painted).toContain("rgb(232, 113, 10)");
});

test("the rail runs left to right in a right-to-left page", async ({ page }) => {
  const { demo } = await open(page);
  await page.evaluate(() => (document.documentElement.dir = "rtl"));
  const first = (await demo.getByRole("slider", { name: "Stop 1" }).boundingBox())!;
  const last = (await demo.getByRole("slider", { name: "Stop 3" }).boundingBox())!;
  expect(first.x).toBeLessThan(last.x);
});

test("passes axe @responsive", async ({ page }) => {
  await open(page);
  const result = await new AxeBuilder({ page }).include("[data-testid=gradient-picker]").analyze();
  expect(result.violations.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(", ")}`)).toEqual([]);
});
