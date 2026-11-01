import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

/*
 * ImageCropper, ImageCropDialog and ImageField: a locked crop moves under its frame and reports
 * once per gesture; a free box drags, resizes and takes typed numbers; the host's shapes switch
 * it; a form refuses an empty required image and holds a saved crop, and Edit is the host's.
 */

async function open(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() =>
    localStorage.setItem("glass-ux.appearance.v1", JSON.stringify({ mode: "light", palette: "graphite", motion: "reduced" })),
  );
  await page.goto("/components/image-cropper");
  const locked = page.getByTestId("crop-locked");
  await expect(locked.getByRole("application", { name: "Crop area" })).toBeVisible({ timeout: 30_000 });
  return { errors, locked, free: page.getByTestId("crop-free") };
}

async function drag(page: Page, from: { x: number; y: number }, by: { x: number; y: number }) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let step = 1; step <= 5; step++) await page.mouse.move(from.x + (by.x * step) / 5, from.y + (by.y * step) / 5);
  await page.mouse.up();
}

const centre = async (locator: Locator) => {
  await locator.scrollIntoViewIfNeeded();
  const box = (await locator.boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
};

test("a locked crop moves under its frame and reports when the drag ends @responsive", async ({ page }) => {
  const { errors, locked } = await open(page);
  const area = locked.getByRole("application", { name: "Crop area" });
  const report = locked.getByTestId("crop-report");
  await expect(report).toHaveText("No crop");
  await drag(page, await centre(area), { x: -30, y: 0 });
  await expect(report).toHaveText(/^960 × 540 at \d+, 330$/);
  await area.focus();
  await page.keyboard.press("+");
  await expect(locked.getByRole("slider", { name: "Zoom" })).not.toHaveAttribute("aria-valuenow", "1");
  await page.keyboard.press("0");
  await expect(report).toHaveText("1600 × 900 at 0, 150");
  await expect(locked.getByRole("slider", { name: "Zoom" })).toHaveAttribute("aria-valuenow", "1");
  expect(errors).toEqual([]);
});

test("a free box drags, resizes, takes numbers and stays physical in right-to-left pages @responsive", async ({ page }) => {
  const { errors, free } = await open(page);
  const area = free.getByRole("application", { name: "Crop area" });
  const report = free.getByTestId("crop-report");
  await drag(page, await centre(area.locator("[data-handle='e']")), { x: 40, y: 0 });
  await expect(report).not.toHaveText("No crop");
  const resized = await report.textContent();
  expect(resized).toMatch(/^\d+ × 600 at 400, 300$/);
  await drag(page, await centre(area.locator(".fa-image-cropper-box")), { x: -20, y: 10 });
  await expect(report).not.toHaveText(resized!);

  await free.getByRole("button", { name: "Increase" }).first().click();
  await expect(free.getByRole("textbox", { name: "Left" })).toHaveValue(/\d/);

  await area.focus();
  await page.keyboard.press("0");
  await expect(report).toHaveText("1600 × 1200 at 0, 0");
  await page.keyboard.press("Alt+ArrowLeft");
  await expect(report).toHaveText("1576 × 1200 at 0, 0");
  await page.evaluate(() => (document.documentElement.dir = "rtl"));
  await page.keyboard.press("0");
  await page.keyboard.press("Alt+ArrowLeft");
  await page.keyboard.press("ArrowRight");
  await expect(report).toHaveText("1576 × 1200 at 24, 0");
  expect(errors).toEqual([]);
});

test("the host's shapes switch the crop", async ({ page }) => {
  const { free } = await open(page);
  await free.getByRole("button", { name: "16:9" }).click();
  const area = free.getByRole("application", { name: "Crop area" });
  await expect(area.locator("[data-handle]")).toHaveCount(0);
  await expect(free.getByTestId("crop-report")).toHaveText("800 × 450 at 400, 375");
  const frame = await area.boundingBox();
  expect(frame!.width / frame!.height).toBeCloseTo(16 / 9, 1);
  await free.getByRole("button", { name: "Free" }).click();
  await expect(area.locator("[data-handle]")).toHaveCount(8);
  await expect(free.getByTestId("crop-report")).toHaveText("800 × 450 at 400, 375");
});

test("a required image refuses the submit, a chosen one fills the field, and Edit is the host's @responsive", async ({ page }) => {
  await open(page);
  const form = page.getByTestId("image-form");
  const add = form.getByRole("button", { name: "Add image" });
  await add.click();
  const dialog = page.getByRole("dialog", { name: "Change image" });
  await expect(dialog).toBeVisible();
  const png = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 900;
    canvas.height = 600;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "#5b8def";
    context.fillRect(0, 0, 900, 600);
    return canvas.toDataURL("image/png");
  });
  await dialog.locator(".fa-file-drop-input").setInputFiles({ name: "cover.png", mimeType: "image/png", buffer: Buffer.from(png.split(",")[1]!, "base64") });
  await expect(dialog.getByRole("application", { name: "Crop area" })).toBeVisible();
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog).toBeHidden({ timeout: 10_000 });
  await expect(form.getByRole("img", { name: "Chosen image" })).toHaveAttribute("src", /^blob:/);

  await form.getByRole("button", { name: "Edit" }).click();
  await expect(form.getByText("Host editor opened 1 times")).toBeVisible();
  await form.getByRole("button", { name: "Crop" }).click();
  await expect(dialog.getByRole("application", { name: "Crop area" })).toBeVisible();
  await expect(dialog.getByRole("textbox", { name: "Width" })).toHaveValue("600");
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toBeHidden();

  await form.getByRole("button", { name: "Remove" }).click();
  await expect(add).toBeFocused();
  await add.blur();
  await expect(form.getByText("Add an image")).toBeVisible();
  await add.click();
  await expect(dialog.getByRole("slider", { name: "Zoom" })).toHaveAccessibleName("Zoom");
  await expect(dialog.locator(".fa-file-drop-input")).not.toHaveAttribute("aria-invalid", "true");
});

test("the page and an open dialog pass axe @responsive", async ({ page }) => {
  await open(page);
  const scan = async (scope: string) => {
    const result = await new AxeBuilder({ page }).include(scope).analyze();
    expect(result.violations.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(", ")}`)).toEqual([]);
  };
  await scan("[data-testid=crop-free]");
  await scan("[data-testid=image-form]");
  await page.getByRole("button", { name: "Change banner" }).click();
  await expect(page.getByRole("dialog", { name: "Change banner" })).toBeVisible();
  await scan(".fa-dialog");
});
