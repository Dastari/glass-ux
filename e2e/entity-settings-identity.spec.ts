import { expect, test } from "@playwright/test";

/* EntitySettingsDialog's identity header: the entity's tile, name, state and actions beside Close. */

test("wide, the identity is the header tier with its ActionBar beside Close", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/components/entity-settings-dialog");
  const frame = page.getByTestId("relay-identity-wide");
  await frame.scrollIntoViewIfNeeded();
  const header = frame.locator(".fa-dialog-header[data-identity]");
  const identity = header.locator(".fa-dialog-identity .fa-entity").first();
  await expect(identity).toHaveAttribute("data-tier", "header");
  await expect(identity.getByRole("heading", { level: 2, name: "Cedar Annex SMTP relay" })).toBeVisible();
  // The dialog's type, not a page's headline.
  const sizes = await Promise.all([
    identity.locator(".fa-entity-title").evaluate((el) => getComputedStyle(el).fontSize),
    page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--type-title-size").trim()),
  ]);
  expect(sizes[0]).toBe(await page.evaluate((size) => { const probe = document.createElement("span"); probe.style.fontSize = size; document.body.append(probe); const px = getComputedStyle(probe).fontSize; probe.remove(); return px; }, sizes[1]));
  await expect(identity.getByText("Sending", { exact: true })).toBeVisible();
  await expect(identity.getByRole("button", { name: "Send test message" })).toBeVisible();
  const close = header.getByRole("button", { name: "Close" });
  await expect(close).toBeVisible();
  // Nothing overlaps: the actions end before Close starts, and both sit on the header's line.
  const actions = (await identity.locator(".fa-entity-actions").boundingBox())!;
  const closeBox = (await close.boundingBox())!;
  expect(actions.x + actions.width).toBeLessThanOrEqual(closeBox.x + 0.5);
  const headerBox = (await header.boundingBox())!;
  expect(closeBox.x + closeBox.width).toBeLessThanOrEqual(headerBox.x + headerBox.width + 0.5);
  // One heading names the dialog; no hidden second title.
  await expect(frame.locator(".fa-dialog-title")).toHaveCount(0);
});

test("narrow, it folds to the compact tier with one ⋯ for the actions @responsive", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/components/entity-settings-dialog");
  const frame = page.getByTestId("relay-identity-narrow");
  await frame.scrollIntoViewIfNeeded();
  const header = frame.locator(".fa-dialog-header[data-identity]");
  const identity = header.locator(".fa-dialog-identity .fa-entity").first();
  await expect(identity).toHaveAttribute("data-tier", "compact");
  await expect(identity.getByRole("button", { name: "Send test message" })).toHaveCount(0);
  const more = identity.getByRole("button", { name: /Cedar Annex SMTP relay/ });
  await more.click();
  await expect(page.getByRole("menuitem", { name: "Send test message" })).toBeVisible();
  await page.keyboard.press("Escape");
  const spill = await header.evaluate((element) => element.scrollWidth - element.clientWidth);
  expect(spill).toBeLessThanOrEqual(1);
  const moreBox = (await more.boundingBox())!;
  const closeBox = (await header.getByRole("button", { name: "Close" }).boundingBox())!;
  expect(moreBox.x + moreBox.width).toBeLessThanOrEqual(closeBox.x + 0.5);
});
