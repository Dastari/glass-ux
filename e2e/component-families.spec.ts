import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { componentFamilies } from "../src/gallery/component-families.js";

for (const [root, child] of [
  ["button", "copy-button"],
  ["combobox", "multi-select"],
  ["menu", "context-menu"],
  ["app-shell", "inspector-toggle"],
  ["data-table", "meter-cell"],
  ["badge", "tone-dot"],
  ["assistant-message", "reasoning"],
  ["ai-card", "ai-surface-provider"],
  ["tool-group", "status-glyph"],
] as const) {
  test(`${root} includes related examples, navigation and APIs after a direct child link @responsive`, async ({
    page,
  }) => {
    const family = componentFamilies.find((item) => item.id === root)!;
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript(() =>
      localStorage.setItem(
        "glass-ux.appearance.v1",
        JSON.stringify({
          mode: "dark",
          density: "compact",
          uiScale: 1.25,
          motion: "reduced",
        }),
      ),
    );
    await page.goto(`./components/${child}#api`);
    await expect(page.locator(".gallery-document-intro h1")).toHaveText(
      family.name,
    );
    const target = page.locator(`#api-${child}`);
    await expect(target).toBeInViewport();
    const rail = page.getByRole("navigation", {
      name: "On this page",
      exact: true,
    });
    for (const component of family.components.slice(1)) {
      await expect(
        rail.getByRole("link", { name: component.name, exact: true }),
      ).toBeAttached();
      await expect(page.locator(`#api-${component.id}`)).toBeAttached();
      await expect(page.locator(`#usage-${component.id}`)).toBeAttached();
    }
    await expect(page.locator("main main")).toHaveCount(0);
    const duplicateIds = await page
      .locator(".gallery-document-layout [id]")
      .evaluateAll((elements) => {
        const ids = elements.map((item) => item.id);
        return ids.filter((id, index) => ids.indexOf(id) !== index);
      });
    expect(duplicateIds).toEqual([]);
    const document = page.locator(".gallery-document-layout");
    const layout = await document.evaluate((element) => {
      const edge = element.getBoundingClientRect();
      const overflow =
        element.scrollWidth > element.clientWidth + 1
          ? [...element.querySelectorAll<HTMLElement>("*")]
              .filter((item) => {
                if (
                  !item.getBoundingClientRect().width ||
                  item.getBoundingClientRect().right <= edge.right + 1
                )
                  return false;
                for (
                  let parent = item.parentElement;
                  parent && parent !== element;
                  parent = parent.parentElement
                ) {
                  if (
                    ["auto", "scroll", "hidden", "clip"].includes(
                      getComputedStyle(parent).overflowX,
                    ) &&
                    parent.getBoundingClientRect().right <= edge.right + 1
                  )
                    return false;
                }
                return true;
              })
              .map((item) => ({
                class: item.className,
                text: item.textContent?.slice(0, 60),
                right: item.getBoundingClientRect().right,
                parent: item.parentElement?.className,
                containingBlock: (item.offsetParent as HTMLElement | null)
                  ?.className,
              }))
              .slice(0, 12)
          : [];
      return {
        page: window.document.documentElement.scrollWidth,
        width: innerWidth,
        scroll: element.scrollWidth,
        client: element.clientWidth,
        overflow,
      };
    });
    expect(layout.page).toBeLessThanOrEqual(layout.width);
    expect(layout.scroll, JSON.stringify(layout.overflow)).toBeLessThanOrEqual(
      layout.client + 1,
    );
    const result = await new AxeBuilder({ page })
      .include(".gallery-document-layout")
      .analyze();
    expect(
      result.violations.map((v) => ({
        id: v.id,
        targets: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test("a component family keeps its demos, rail and individual APIs together @responsive", async ({
  page,
}) => {
  await page.goto("./components/panel");
  await expect(page.locator("main h1")).toHaveText("Panel");
  const directory = page.getByRole("navigation", {
    name: "Components",
    exact: true,
  });
  await expect(
    directory.getByRole("link", { name: "PanelHeader", exact: true }),
  ).toHaveCount(0);
  const rail = page.getByRole("navigation", {
    name: "On this page",
    exact: true,
  });
  for (const name of ["PanelHeader", "PanelBody", "PanelFooter"]) {
    const link = rail.getByRole("link", { name, exact: true });
    await expect(link).toBeAttached();
    await link.click();
    await expect(page).toHaveURL(
      new RegExp(`#${name.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase()}$`),
    );
    await expect(
      page
        .locator("main")
        .getByRole("heading", { name, exact: true, level: 2 }),
    ).toBeVisible();
  }
  await rail.getByRole("link", { name: "API", exact: true }).click();
  const api = page.locator("#api");
  const index = api.getByRole("navigation", {
    name: "Individual APIs",
    exact: true,
  });
  for (const name of ["Panel", "PanelHeader", "PanelBody", "PanelFooter"]) {
    await expect(index.getByRole("link", { name, exact: true })).toBeAttached();
    await expect(
      api.getByRole("heading", { name, exact: true, level: 3 }),
    ).toBeAttached();
  }
  await index.getByRole("link", { name: "PanelBody", exact: true }).click();
  await expect(page.locator("#api-panel-body")).toBeVisible();
  await expect(
    page
      .locator("#api-panel-body")
      .locator("..")
      .locator(".gallery-api-table")
      .first(),
  ).toBeVisible();
  const geometry = await page
    .locator(".gallery-document-layout")
    .evaluate((element) => ({
      viewport: innerWidth,
      pageWidth: document.documentElement.scrollWidth,
      overflow: getComputedStyle(element).overflow,
      railInsideArticle: !!element.querySelector(
        "article .gallery-document-rail",
      ),
    }));
  expect(geometry.pageWidth).toBeLessThanOrEqual(geometry.viewport);
  expect(geometry.railInsideArticle).toBe(false);
  const duplicateIds = await page
    .locator("main [id]")
    .evaluateAll((elements) => {
      const ids = elements.map((element) => element.id);
      return ids.filter((id, index) => ids.indexOf(id) !== index);
    });
  expect(duplicateIds).toEqual([]);
  const result = await new AxeBuilder({ page })
    .include(".gallery-document-layout")
    .analyze();
  expect(
    result.violations.map((violation) => ({
      id: violation.id,
      nodes: violation.nodes.map((node) => ({
        target: node.target,
        summary: node.failureSummary,
      })),
    })),
  ).toEqual([]);
});

test("legacy subcomponent routes preserve specimen, usage and API destinations", async ({
  page,
}) => {
  for (const [hash, target] of [
    ["", "panel-header"],
    ["#examples", "panel-header"],
    ["#usage", "usage-panel-header"],
    ["#api", "api-panel-header"],
  ]) {
    await page.goto(`./components/panel-header${hash}`);
    await expect(page.locator("main h1")).toHaveText("Panel");
    await expect(page.locator(`#${target}`)).toBeInViewport();
  }
  await page.goto("./components/panel#panel-footer");
  await expect(page.locator("#panel-footer")).toBeInViewport();
});
