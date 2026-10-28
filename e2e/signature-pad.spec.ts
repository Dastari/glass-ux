import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

/*
 * SignaturePad: a required signature refuses the submit and takes focus; a mouse or finger
 * stroke signs (and a finger never scrolls the page); Undo, Delete and Ctrl+Z edit from the
 * keyboard; Type instead takes a typed name. The pad keeps its shape at every width.
 */

async function open(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() =>
    localStorage.setItem("glass-ux.appearance.v1", JSON.stringify({ mode: "light", palette: "graphite", motion: "reduced" })),
  );
  await page.goto("/components/signature-pad");
  const form = page.getByTestId("signature-form");
  await expect(form.getByRole("application", { name: "Signature" })).toBeVisible({ timeout: 30_000 });
  return { errors, form, pad: form.getByRole("application", { name: "Signature" }) };
}

/** A wavy stroke across the pad's middle, as a mouse drag. */
async function drawWithMouse(page: Page, pad: Locator) {
  await pad.scrollIntoViewIfNeeded();
  const box = (await pad.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.6);
  await page.mouse.down();
  for (let index = 1; index <= 20; index++)
    await page.mouse.move(box.x + box.width * (0.2 + index * 0.025), box.y + box.height * (0.6 - 0.15 * Math.sin(index / 2)));
  await page.mouse.up();
}

const strokes = (pad: Locator) => pad.locator(".fa-signature-ink path:not([d=''])");

test("a required signature shows its error once cleared and left, and a mouse stroke signs @responsive", async ({ page }) => {
  const { errors, form, pad } = await open(page);
  await drawWithMouse(page, pad);
  await expect(strokes(pad)).toHaveCount(1);
  await pad.focus();
  await page.keyboard.press("Delete");
  await pad.evaluate((element: HTMLElement) => element.blur());
  await expect(form.getByText("Add your signature")).toBeVisible();
  await expect(pad).toHaveAttribute("aria-invalid", "true");
  await expect(pad).toHaveAccessibleDescription(/^Not signed.*Add your signature$/);

  await drawWithMouse(page, pad);
  await expect(strokes(pad)).toHaveCount(1);
  await expect(form.getByText("Add your signature")).toBeHidden();
  await expect(pad).toHaveAccessibleDescription(/^Signed/);
  await form.getByRole("button", { name: "Sign in" }).click();
  await expect(form.getByText("Add your signature")).toBeHidden();
  expect(errors).toEqual([]);
});

test("a finger signs without scrolling the page @responsive", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "touch input through the Chromium protocol");
  const { pad } = await open(page);
  await pad.scrollIntoViewIfNeeded();
  const box = (await pad.boundingBox())!;
  const scroller = page.locator(".docs-content");
  const before = await scroller.evaluate((element) => element.scrollTop);
  const client = await page.context().newCDPSession(page);
  const at = (step: number) => [{ x: box.x + box.width * (0.2 + step * 0.03), y: box.y + box.height * (0.7 - step * 0.02) }];
  await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: at(0) });
  for (let step = 1; step <= 15; step++) await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: at(step) });
  await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect(strokes(pad)).toHaveCount(1);
  expect(await scroller.evaluate((element) => element.scrollTop)).toBe(before);
});

test("Undo, Ctrl+Z and Delete edit the drawing; Type instead takes a name", async ({ page }) => {
  const { form, pad } = await open(page);
  await drawWithMouse(page, pad);
  await drawWithMouse(page, pad);
  await expect(strokes(pad)).toHaveCount(2);
  await form.getByRole("button", { name: "Undo" }).click();
  await expect(strokes(pad)).toHaveCount(1);
  await pad.focus();
  await page.keyboard.press("ControlOrMeta+z");
  await expect(strokes(pad)).toHaveCount(0);
  await drawWithMouse(page, pad);
  await pad.focus();
  await page.keyboard.press("Delete");
  await expect(strokes(pad)).toHaveCount(0);
  await expect(form.getByRole("button", { name: "Clear" })).toBeDisabled();

  await form.getByRole("button", { name: "Type instead" }).click();
  const typed = form.getByRole("textbox", { name: "Signature" });
  await expect(typed).toBeFocused();
  await page.keyboard.type("Noa Varga");
  await form.getByRole("button", { name: "Sign in" }).click();
  await expect(form.getByText("Add your signature")).toBeHidden();
  await form.getByRole("button", { name: "Draw instead" }).click();
  await expect(pad).toBeFocused();
});

test("the pad keeps its shape and the page passes axe @responsive", async ({ page }) => {
  const { pad } = await open(page);
  const box = (await pad.boundingBox())!;
  expect(Math.abs(box.width / box.height - 3)).toBeLessThan(0.05);
  const result = await new AxeBuilder({ page }).include(".gallery-document-sections").analyze();
  expect(result.violations.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(", ")}`)).toEqual([]);
});
