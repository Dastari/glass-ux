import { expect, test, type Locator, type Page } from "@playwright/test";

/*
 * AppearanceSettings (issues #8-#10):
 *   sliders   a Slider in a SettingRow's control draws at about 14rem, narrowing in a narrow
 *             row: the slot used to size to its content and give the slider no width (#8)
 *   style     the opt-in Style group switches Glass and Flat, and blur on and off, in place;
 *             blur is stored and restored before first paint (#9)
 *   Flat      Material, Background and Animation say "Not used in Flat" and cannot change;
 *             Density still can, and Glass brings the earlier choices back (#10)
 */

async function open(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("seeded")) {
      localStorage.setItem("glass-ux.appearance.v1", JSON.stringify({ mode: "light", palette: "graphite", motion: "reduced", glass: "reduced", background: "forest" }));
      sessionStorage.setItem("seeded", "1");
    }
  });
  await page.goto("/components/appearance-settings");
  const panel = page.getByTestId("appearance-page");
  await expect(panel).toBeVisible({ timeout: 30_000 });
  return { errors, panel };
}

/** A Segmented by name: its SettingRow and FormGroup can carry the same name. */
const segmented = (scope: Locator, name: string) => scope.locator(".fa-segmented").and(scope.getByRole("group", { name }));

test("appearance sliders draw with a track and thumb inside their setting rows @responsive", async ({ page }) => {
  const { errors } = await open(page);
  await page.locator(".gallery-document-sections").getByRole("button", { name: "Settings", exact: true }).first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const slider = dialog.locator(".fa-slider").filter({ has: page.getByRole("slider", { name: "Interface size" }) });
  await slider.scrollIntoViewIfNeeded();
  const track = (await slider.locator(".fa-slider-track").boundingBox())!;
  const row = (await slider.locator("xpath=ancestor::*[contains(concat(' ', @class, ' '), ' fa-setting-row ')][1]").boundingBox())!;
  const rem = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
  // About 14rem where the row has room; never wider than the row.
  expect(track.width).toBeGreaterThan(Math.min(14 * rem, row.width) * 0.8);
  expect(track.width).toBeLessThanOrEqual(Math.min(14 * rem, row.width) + 1);
  await expect(dialog.getByRole("slider", { name: "Interface size" })).toBeVisible();
  const thumb = (await slider.locator(".fa-slider-thumb").boundingBox())!;
  expect(thumb.width).toBeGreaterThan(8);
  expect(errors).toEqual([]);
});

test("the Style group switches to Flat, which fixes the rows it overrides, and back @responsive", async ({ page }) => {
  const { errors, panel } = await open(page);
  await segmented(panel, "Style").getByRole("button", { name: "Flat" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-style", "flat");
  await expect(panel.getByText("Not used in Flat.")).toHaveCount(4);
  await expect(segmented(panel, "Blur").getByRole("button", { name: "Off" })).toBeDisabled();
  await expect(segmented(panel, "Material").getByRole("button", { name: "Frosted" })).toBeDisabled();
  await expect(segmented(panel, "Material").getByRole("button", { name: "Frosted" })).toHaveAttribute("aria-pressed", "true");
  await expect(segmented(panel, "Animation").getByRole("button", { name: "Still" })).toBeDisabled();
  await expect(panel.getByRole("radiogroup", { name: "Background" }).getByRole("radio", { name: "Forest" })).toBeDisabled();
  await expect(segmented(panel, "Density").getByRole("button", { name: "Compact" })).toBeEnabled();

  // A reload keeps Flat (it is stored), then Glass brings back Frosted and Forest.
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-style", "flat");
  const again = page.getByTestId("appearance-page");
  await expect(again).toBeVisible({ timeout: 30_000 });
  await segmented(again, "Style").getByRole("button", { name: "Glass" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-glass", "reduced");
  await expect(page.locator("html")).toHaveAttribute("data-background", "forest");
  await expect(again.getByText("Not used in Flat.")).toHaveCount(0);
  await expect(segmented(again, "Material").getByRole("button", { name: "Glass" })).toBeEnabled();
  expect(errors).toEqual([]);
});

test("the Style group's Blur row turns blur off and on, and a reload keeps it @responsive", async ({ page }) => {
  const { errors, panel } = await open(page);
  await segmented(panel, "Blur").getByRole("button", { name: "Off" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-glass-rendering", "none");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-glass-rendering", "none");
  const again = page.getByTestId("appearance-page");
  await expect(again).toBeVisible({ timeout: 30_000 });
  await expect(segmented(again, "Blur").getByRole("button", { name: "Off" })).toHaveAttribute("aria-pressed", "true");
  await segmented(again, "Blur").getByRole("button", { name: "On" }).click();
  await expect(page.locator("html")).not.toHaveAttribute("data-glass-rendering", /./);
  expect(errors).toEqual([]);
});
