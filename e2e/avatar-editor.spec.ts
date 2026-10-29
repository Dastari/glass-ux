import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/*
 * EditableAvatar and AvatarDialog: a chosen, dropped or pasted photo opens in the round crop;
 * keys, drag and the slider position it; Save uploads with progress and the avatar shows the
 * result at once. A photo that misses the requirements is refused in place, a failed save keeps
 * the dialog open with its reason, and Esc aborts a save that is still running.
 */

async function open(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() =>
    localStorage.setItem("glass-ux.appearance.v1", JSON.stringify({ mode: "light", palette: "graphite", motion: "reduced" })),
  );
  await page.goto("/components/avatar");
  const edit = page.getByRole("button", { name: "Change photo for Avery Quinn" });
  await expect(edit).toBeVisible({ timeout: 30_000 });
  await edit.scrollIntoViewIfNeeded();
  return { errors, edit, dialog: page.getByRole("dialog", { name: "Change photo" }), profile: page.getByTestId("profile-photo") };
}

/** A PNG drawn in the page, as a data URL. */
function drawPhoto(page: Page, width: number, height: number) {
  return page.evaluate(
    ([w, h]) => {
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const context = canvas.getContext("2d")!;
      const gradient = context.createLinearGradient(0, 0, w, h);
      gradient.addColorStop(0, "#5b8def");
      gradient.addColorStop(1, "#f2a65a");
      context.fillStyle = gradient;
      context.fillRect(0, 0, w, h);
      return canvas.toDataURL("image/png");
    },
    [width, height] as const,
  );
}

async function photoFile(page: Page, width: number, height: number, name = "portrait.png") {
  const url = await drawPhoto(page, width, height);
  return { name, mimeType: "image/png", buffer: Buffer.from(url.split(",")[1]!, "base64") };
}

/** Drop or paste a drawn photo through a real DataTransfer. */
async function transfer(page: Page, how: "drop" | "paste", selector: string, width: number, height: number) {
  const url = await drawPhoto(page, width, height);
  await page.evaluate(
    async ({ how, selector, url }) => {
      const blob = await (await fetch(url)).blob();
      const data = new DataTransfer();
      data.items.add(new File([blob], "dropped.png", { type: "image/png" }));
      if (how === "paste") {
        document.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }));
        return;
      }
      const target = document.querySelector(selector)!;
      for (const type of ["dragenter", "dragover", "drop"])
        target.dispatchEvent(new DragEvent(type, { dataTransfer: data, bubbles: true, cancelable: true }));
    },
    { how, selector, url },
  );
}

test("a chosen photo is cropped from the keyboard, saved with progress and shown at once @responsive", async ({ page }) => {
  const { errors, edit, dialog, profile } = await open(page);
  const before = await profile.locator("img").getAttribute("src");
  await edit.click();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(/^PNG, JPEG,? or WebP · Max 5\u2009MB · At least 256 × 256 px$/)).toBeVisible();

  await dialog.locator(".fa-file-drop-input").setInputFiles(await photoFile(page, 900, 600));
  const crop = dialog.getByRole("application", { name: "Photo position" });
  await expect(crop).toBeVisible();
  await expect(crop).toHaveAttribute("aria-roledescription", "photo crop");
  const zoom = dialog.getByRole("slider", { name: "Zoom" });
  await expect(zoom).toHaveAttribute("aria-valuenow", "1");

  const image = crop.locator("img");
  const left = await image.evaluate((element: HTMLElement) => element.style.left);
  await crop.focus();
  await page.keyboard.press("+");
  await page.keyboard.press("+");
  await expect(zoom).not.toHaveAttribute("aria-valuenow", "1");
  await page.keyboard.press("ArrowLeft");
  expect(await image.evaluate((element: HTMLElement) => element.style.left)).not.toBe(left);
  await page.keyboard.press("0");
  await expect(zoom).toHaveAttribute("aria-valuenow", "1");

  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog.getByRole("progressbar", { name: "Saving photo" })).toBeVisible();
  await expect(dialog).toBeHidden({ timeout: 10_000 });
  const after = await profile.locator("img").getAttribute("src");
  expect(after).toMatch(/^blob:/);
  expect(after).not.toBe(before);
  expect(errors).toEqual([]);
});

test("a photo below the minimum is refused in place, and a dropped or pasted one opens in the crop", async ({ page }) => {
  const { edit, dialog, profile } = await open(page);
  await edit.click();
  await dialog.locator(".fa-file-drop-input").setInputFiles(await photoFile(page, 120, 120, "tiny.png"));
  await expect(dialog.getByText("The photo must be at least 256 × 256 pixels.")).toBeVisible();
  await expect(dialog.getByRole("application", { name: "Photo position" })).toHaveCount(0);

  await transfer(page, "paste", "body", 500, 400);
  await expect(dialog.getByRole("application", { name: "Photo position" })).toBeVisible();
  await expect(dialog.getByText("The photo must be at least")).toBeHidden();
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toBeHidden();

  await transfer(page, "drop", "[data-testid=profile-photo]", 640, 480);
  await expect(dialog.getByRole("application", { name: "Photo position" })).toBeVisible();
  await expect(profile).toBeVisible();
});

test("a failed save keeps the dialog open with its reason; Esc aborts a running save", async ({ page }) => {
  const { edit, dialog, profile } = await open(page);
  await page.getByRole("button", { name: "Change photo for Ellis Park" }).click();
  await dialog.locator(".fa-file-drop-input").setInputFiles(await photoFile(page, 600, 900));
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog.getByText("The photo service is unavailable. Try again in a few minutes.")).toBeVisible();
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toBeHidden();

  const before = await profile.locator("img").getAttribute("src");
  await edit.click();
  await dialog.locator(".fa-file-drop-input").setInputFiles(await photoFile(page, 800, 800));
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog.getByRole("progressbar")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await page.waitForTimeout(1_500);
  expect(await profile.locator("img").getAttribute("src")).toBe(before);
});

test("on a phone a finger moves the photo without closing the sheet @responsive", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "touch input through the Chromium protocol");
  const { edit, dialog } = await open(page);
  await edit.click();
  await dialog.locator(".fa-file-drop-input").setInputFiles(await photoFile(page, 600, 1200));
  const crop = dialog.getByRole("application", { name: "Photo position" });
  await expect(crop).toBeVisible();
  const image = crop.locator("img");
  const top = await image.evaluate((element: HTMLElement) => element.style.top);
  const box = (await crop.boundingBox())!;
  const client = await page.context().newCDPSession(page);
  const at = (step: number) => [{ x: box.x + box.width / 2, y: box.y + box.height * 0.3 + step * 8 }];
  await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: at(0) });
  for (let step = 1; step <= 12; step++) await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: at(step) });
  await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect(dialog).toBeVisible();
  expect(await image.evaluate((element: HTMLElement) => element.style.top)).not.toBe(top);
});

test("the open dialog passes axe @responsive", async ({ page }) => {
  const { edit, dialog } = await open(page);
  await edit.click();
  await dialog.locator(".fa-file-drop-input").setInputFiles(await photoFile(page, 900, 600));
  await expect(dialog.getByRole("application", { name: "Photo position" })).toBeVisible();
  const result = await new AxeBuilder({ page }).include(".fa-dialog").analyze();
  expect(result.violations.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(", ")}`)).toEqual([]);
});
