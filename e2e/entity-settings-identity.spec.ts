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

/** The vertical centre of a box. */
const middle = (box: { y: number; height: number }) => box.y + box.height / 2;

test("Close sits on the line of the identity's actions, wide and narrow @responsive", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/components/entity-settings-dialog");
  for (const id of ["relay-identity-wide", "relay-identity-narrow"]) {
    const frame = page.getByTestId(id);
    await frame.scrollIntoViewIfNeeded();
    const header = frame.locator(".fa-dialog-header[data-identity]");
    const actions = header.locator('[data-header-anchor="actions"]').first();
    const close = header.getByRole("button", { name: "Close" });
    await expect(close).toBeVisible();
    await expect
      .poll(async () => Math.abs(middle((await close.boundingBox())!) - middle((await actions.boundingBox())!)), { message: id })
      .toBeLessThanOrEqual(0.5);
  }
});

test("the settings pane's content is cut off at the footer's line, not drawn over it", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/components/entity-settings-dialog");
  const frame = page.getByTestId("relay-identity-wide");
  await frame.scrollIntoViewIfNeeded();
  const pane = frame.locator(".fa-vtabs-content");
  // Long enough to scroll, and scrolled part-way so a field crosses the footer's edge.
  await pane.evaluate((element) => {
    const panel = element.querySelector(".fa-vtabs-panel:not([hidden])") ?? element;
    const field = panel.querySelector(".fa-field");
    for (let i = 0; i < 8 && field; i++) panel.append(field.cloneNode(true));
    element.scrollTop = 157;
  });
  const [paneBox, footerBox] = [(await pane.boundingBox())!, (await frame.locator(".fa-dialog-footer").boundingBox())!];
  expect(paneBox.y + paneBox.height).toBeLessThanOrEqual(footerBox.y + 0.5);
  await expect(frame.locator(".fa-dialog")).toHaveAttribute("data-scrolled-bottom", "");
});
