import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdirSync } from "node:fs";
mkdirSync(".handoff/glass-ux-extract/screenshots", { recursive: true });

for (const id of [
  "button",
  "checkbox",
  "radio",
  "input",
  "avatar",
  "dialog",
  "data-table",
  "line-chart",
  "assistant-pane",
  "org-switcher",
  "reference-input",
]) {
  test(`${id} has its own demo and full API`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`/components/${id}`);
    await expect(page.locator("main h1")).toBeVisible();
    await expect(
      page
        .getByRole("navigation", { name: "On this page" })
        .getByRole("link", { name: "Examples", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("navigation", { name: "On this page" })
      .getByRole("link", { name: "API", exact: true })
      .click();
    await expect(page.locator(".gallery-api-table").first()).toBeVisible();
    await expect(page.locator(".gallery-api")).not.toContainText(
      "See the typed contract for this property.",
    );
    expect(errors).toEqual([]);
  });
}
test("component search and deep-link navigation @responsive", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  if (testInfo.project.name === "phone")
    await page.getByRole("button", { name: "Browse", exact: true }).click();
  await page
    .getByRole("searchbox", { name: "Find a component" })
    .fill("SwatchPicker");
  await page
    .getByRole("navigation", { name: "Components" })
    .getByRole("link", { name: "SwatchPicker", exact: true })
    .click();
  await expect(page.locator("main h1")).toHaveText("SwatchPicker");
  await page.reload();
  await expect(page.locator("main h1")).toHaveText("SwatchPicker");
  const result = await new AxeBuilder({ page }).analyze();
  expect(
    result.violations.map((violation) => ({
      id: violation.id,
      targets: violation.nodes.map((node) => node.target),
    })),
  ).toEqual([]);
  await page.screenshot({
    path: `test-results/docs-${test.info().project.name}.png`,
    fullPage: true,
  });
});

for (const id of [
  "area-chart",
  "bar-chart",
  "column-chart",
  "pie-chart",
  "donut-chart",
  "gauge",
  "radial-bar",
  "heatmap",
  "scatter-chart",
  "histogram",
  "treemap",
  "sunburst",
]) {
  test(`${id} has a focused chart demo`, async ({ page }) => {
    await page.goto(`/components/${id}`);
    await expect(page.getByTestId(`chart-${id}`)).toBeVisible();
    await expect(page.locator("#usage")).toBeAttached();
    await expect(
      page.locator("#api .gallery-api-table").first(),
    ).toBeAttached();
  });
}
test("icons have one Foundations page", async ({ page }) => {
  await page.goto("/foundations/icons");
  await expect(
    page.getByRole("heading", { name: "Icons", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("navigation", { name: "Components" })
      .getByRole("link", { name: /^Icon[A-Z]/ }),
  ).toHaveCount(0);
  await page
    .getByRole("navigation", { name: "On this page" })
    .getByRole("link", { name: "API", exact: true })
    .click();
  await expect(page.locator(".gallery-api-table").first()).toBeVisible();
});
test("the document keeps its sections, readable header and outside rail @responsive", async ({
  page,
}, testInfo) => {
  await page.goto("/components/vertical-tab-nav");
  const document = page.locator(".gallery-component-document");
  await expect(
    document.getByRole("heading", { name: "VerticalTabNav", exact: true }),
  ).toBeVisible();
  await expect(page.locator("#api .gallery-api-table").first()).toBeAttached();
  await expect(page.locator(".gallery-document-rail")).toBeVisible();
  expect(await document.locator(".gallery-document-rail").count()).toBe(0);
  const before = await page.locator(".gallery-document-rail").boundingBox();
  await page
    .getByRole("navigation", { name: "On this page" })
    .getByRole("link", { name: "API", exact: true })
    .click();
  await expect(page).toHaveURL(/#api$/);
  await expect(page.locator("#usage")).toBeAttached();
  await expect(page.locator("#examples")).toBeAttached();
  if (testInfo.project.name === "desktop") {
    const after = await page.locator(".gallery-document-rail").boundingBox();
    expect(Math.abs(after!.y - before!.y)).toBeLessThan(2);
  }
  await page
    .getByRole("navigation", { name: "On this page" })
    .getByRole("link", { name: "Examples", exact: true })
    .click();
  await document.evaluate((element) => {
    element.scrollTop = 0;
  });
  await page.screenshot({
    path: `.handoff/glass-ux-extract/screenshots/document-${testInfo.project.name}.png`,
  });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  await document.evaluate((element) => {
    element.scrollTop = 0;
  });
  await expect(document.locator("h1")).toBeVisible();
  await page.screenshot({
    path: `.handoff/glass-ux-extract/screenshots/large-font-${testInfo.project.name}.png`,
  });
  expect(
    await document.evaluate((element) => element.clientHeight),
    JSON.stringify(
      await page
        .locator(
          ".docs-layout, .docs-sidebar, .gallery-header, .docs-content, .gallery-document-layout, .gallery-document-rail, .gallery-component-document",
        )
        .evaluateAll((elements) =>
          elements.map((element) => ({
            class: element.className,
            height: element.getBoundingClientRect().height,
            gap: getComputedStyle(element).rowGap,
            padding: getComputedStyle(element).padding,
          })),
        ),
    ),
  ).toBeGreaterThan(200);
  const intro = document.locator(".gallery-document-intro");
  const typography = await intro.locator("h1").evaluate((element) => ({
    size: parseFloat(getComputedStyle(element).fontSize),
    line: parseFloat(getComputedStyle(element).lineHeight),
  }));
  expect(typography.line).toBeGreaterThanOrEqual(typography.size);
  await intro.screenshot({
    path: `.handoff/glass-ux-extract/screenshots/header-${testInfo.project.name}.png`,
  });
});

test("loading entity settings has an accessible named group", async ({
  page,
}) => {
  await page.goto("/components/entity-settings-dialog");
  const loading = page.getByRole("group", {
    name: "Loading settings",
    exact: true,
  });
  await expect(loading).toBeAttached();
  await expect(loading).toHaveAttribute("aria-busy", "true");
  const result = await new AxeBuilder({ page })
    .include('[aria-label="Loading settings"]')
    .analyze();
  expect(result.violations.map((v) => v.id)).toEqual([]);
});
