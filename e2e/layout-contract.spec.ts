import { test, expect } from "@playwright/test";

test("Surface documents its own theme geometry and card material", async ({
  page,
}) => {
  await page.goto("/components/surface");
  await expect(
    page.locator("#examples .fa-surface[data-padding='panel']"),
  ).toBeVisible();
  await expect(
    page.locator("#examples .fa-surface.glass-card[data-radius='tile']"),
  ).toBeVisible();
  await expect(page.locator("#usage")).toContainText('material="card"');
  await expect(page.locator("#api")).toContainText('"card"');
  await expect(page.locator("#examples")).not.toContainText("Columns");
});

for (const appearance of [
  { density: "comfortable", uiScale: 1, radiusScale: 1, borderWidth: 1 },
  { density: "compact", uiScale: 1.125, radiusScale: 1.4, borderWidth: 1.5 },
]) {
  test(`catalogue follows theme geometry in ${appearance.density} density`, async ({
    page,
  }) => {
    await page.addInitScript(
      (settings) =>
        localStorage.setItem(
          "glass-ux.appearance.v1",
          JSON.stringify(settings),
        ),
      appearance,
    );
    await page.goto("/");
    await expect(page.locator("html[data-hydrated]")).toBeAttached();
    const geometry = await page.evaluate(() => {
      const sidebar = document.querySelector<HTMLElement>(".docs-sidebar")!;
      const card = document.querySelector<HTMLElement>(
        ".gallery-catalogue-card",
      )!;
      const probe = document.createElement("div");
      probe.style.cssText =
        "position:absolute;visibility:hidden;padding:var(--inset-panel);border-radius:var(--radius-surface);border:var(--border-width) solid transparent";
      document.body.append(probe);
      const panel = getComputedStyle(probe);
      const expected = {
        padding: panel.paddingLeft,
        radius: panel.borderTopLeftRadius,
        border: panel.borderTopWidth,
      };
      probe.style.padding = "var(--inset-tile)";
      probe.style.borderRadius = "var(--radius-tile)";
      const tile = {
        padding: panel.paddingLeft,
        radius: panel.borderTopLeftRadius,
      };
      const measured = (element: HTMLElement) => {
        const style = getComputedStyle(element);
        return {
          padding: style.paddingLeft,
          radius: style.borderTopLeftRadius,
          border: style.borderTopWidth,
        };
      };
      const groups = [
        ...document.querySelectorAll(".gallery-catalogue-group"),
      ].map((element) => {
        const style = getComputedStyle(element);
        return {
          background: style.backgroundColor,
          border: style.borderTopWidth,
        };
      });
      const result = {
        expected,
        tile,
        sidebar: measured(sidebar),
        card: measured(card),
        groups,
      };
      probe.remove();
      return result;
    });
    expect(geometry.sidebar).toEqual(geometry.expected);
    expect(geometry.card).toEqual({
      ...geometry.tile,
      border: geometry.expected.border,
    });
    expect(
      geometry.groups.every(
        (group) =>
          group.background === "rgba(0, 0, 0, 0)" && group.border === "0px",
      ),
    ).toBe(true);
  });
}

test("article and static rail have safe insets and the 64px desktop gap @responsive", async ({
  page,
}, testInfo) => {
  await page.goto("/components/action-bar");
  await expect(
    page.locator("#examples [data-lab-frame]").first(),
  ).toBeAttached();
  const layout = await page.locator(".gallery-document-layout").boundingBox();
  const rail = await page.locator(".gallery-document-rail").boundingBox();
  const article = await page
    .locator(".gallery-component-document")
    .boundingBox();
  expect(rail!.x - layout!.x).toBeGreaterThan(0);
  expect(rail!.y - layout!.y).toBeGreaterThan(0);
  const padding = await page
    .locator(".gallery-component-document")
    .evaluate((element) => parseFloat(getComputedStyle(element).paddingLeft));
  expect(padding).toBeGreaterThan(0);
  if (testInfo.project.name === "desktop")
    expect(article!.x - rail!.x - rail!.width).toBeCloseTo(64, 0);
  await page.screenshot({
    path: `.handoff/glass-ux-extract/screenshots/layout-${testInfo.project.name}.png`,
  });
});

test("size previews stack by footprint and usage code has paragraph spacing", async ({
  page,
}) => {
  await page.goto("/components/action-bar");
  const presets = page
    .locator(".gallery-lab")
    .first()
    .locator("[data-preset-area]");
  await expect(presets).toHaveCount(5);
  const boxes = await presets.evaluateAll((elements) =>
    elements.map((element) => {
      const box = element.getBoundingClientRect();
      return {
        area: Number(element.getAttribute("data-preset-area")),
        x: box.x,
        y: box.y,
        bottom: box.bottom,
      };
    }),
  );
  expect(boxes.map((box) => box.area)).toEqual(
    boxes.map((box) => box.area).sort((a, b) => a - b),
  );
  for (let i = 1; i < boxes.length; i++) {
    expect(boxes[i]!.x).toBeCloseTo(boxes[0]!.x, 0);
    expect(boxes[i]!.y).toBeGreaterThan(boxes[i - 1]!.bottom);
  }
  await expect(page.locator("#usage .fa-ai-code")).toBeAttached();
  const paragraph = await page
    .locator("#usage .gallery-usage-example > p")
    .boundingBox();
  const code = await page.locator("#usage .fa-ai-code").boundingBox();
  expect(code!.y - paragraph!.y - paragraph!.height).toBeGreaterThan(0);
});
