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
  test(`showcase follows theme geometry in ${appearance.density} density`, async ({
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
    // The showcase route loads its code after the shell.
    await expect(
      page.locator(".showcase-metrics > .fa-surface").first(),
    ).toBeVisible();
    const geometry = await page.evaluate(() => {
      const sidebar = document.querySelector<HTMLElement>(".docs-sidebar")!;
      const card = document.querySelector<HTMLElement>(
        ".showcase-metrics > .fa-surface",
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
      probe.style.padding = "var(--space-3)";
      const drawerInset = panel.paddingLeft;
      const measured = (element: HTMLElement) => {
        const style = getComputedStyle(element);
        return {
          padding: style.paddingLeft,
          radius: style.borderTopLeftRadius,
          border: style.borderTopWidth,
        };
      };
      const groups = [
        ...document.querySelectorAll(".showcase-section-heading"),
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
        drawerInset,
        drawerSearchInset: getComputedStyle(
          sidebar.querySelector(".fa-shell-drawer-search")!,
        ).paddingLeft,
        card: measured(card),
        groups,
      };
      probe.remove();
      return result;
    });
    expect(geometry.sidebar).toEqual({ ...geometry.expected, padding: "0px" });
    expect(geometry.drawerSearchInset).toBe(geometry.drawerInset);
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
  const insets = await page
    .locator(".gallery-document-layout")
    .evaluate((element) => {
      const article = element.querySelector(".gallery-component-document")!;
      return {
        outer: parseFloat(getComputedStyle(element).paddingRight),
        article: parseFloat(getComputedStyle(article).paddingLeft),
        heading: article.querySelector("h1")!.getBoundingClientRect().left,
        start: article.getBoundingClientRect().left,
      };
    });
  expect(insets.outer).toBeGreaterThan(0);
  expect(insets.article).toBe(0);
  expect(insets.heading).toBeCloseTo(insets.start, 1);
  expect(article!.x + article!.width).toBeLessThanOrEqual(
    layout!.x + layout!.width - insets.outer + 1,
  );
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
  await expect(page.locator("#usage .fa-ai-code").first()).toBeAttached();
  const paragraph = await page.locator("#usage > p").boundingBox();
  const code = await page.locator("#usage .fa-ai-code").first().boundingBox();
  expect(code!.y - paragraph!.y - paragraph!.height).toBeGreaterThan(0);
});

test("guides align prose, code and tables in one narrower column with viewport-edge scrolling @responsive", async ({
  page,
}, testInfo) => {
  await page.goto("/guides/agent-adoption");
  const article = page.locator(".gallery-guide-document");
  await expect(article.locator("h1")).toHaveText("AI agent adoption");
  const geometry = await page.evaluate(() => {
    const article = document.querySelector<HTMLElement>(
      ".gallery-guide-document",
    )!;
    const markdown = article.querySelector<HTMLElement>(".fa-ai-md")!;
    const prose = markdown.querySelector("p")!;
    const code = markdown.querySelector(".fa-ai-code")!;
    const table = markdown.querySelector("table")!;
    const scroller = document.querySelector(".docs-content")!;
    const box = (element: Element) => {
      const rect = element.getBoundingClientRect();
      return {
        left: rect.left,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
      };
    };
    return {
      article: box(article),
      markdown: box(markdown),
      prose: box(prose),
      code: box(code),
      table: box(table),
      scroller: box(scroller),
      width: innerWidth,
      height: innerHeight,
    };
  });
  expect(geometry.article.width).toBeLessThanOrEqual(1024);
  for (const element of [geometry.prose, geometry.code, geometry.table]) {
    expect(element.left).toBeCloseTo(geometry.markdown.left, 0);
    expect(element.width).toBeCloseTo(geometry.markdown.width, 0);
  }
  expect(geometry.scroller.right).toBeCloseTo(geometry.width, 0);
  expect(geometry.scroller.bottom).toBeCloseTo(geometry.height, 0);
  await expect(article.locator("pre[data-highlighted]").first()).toBeAttached();
  await page.screenshot({
    path: `.handoff/glass-ux-extract/screenshots/guide-${testInfo.project.name}.png`,
  });
});

for (const id of [
  "colour",
  "typography",
  "space",
  "shape",
  "materials",
  "motion",
  "knobs",
  "locale",
  "brand",
]) {
  test(`${id} keeps its styled Foundation title and summary inside the article`, async ({
    page,
  }) => {
    await page.goto(`/foundations/${id}`);
    const article = page.locator(".gallery-foundation-document");
    const header = article.locator(".gallery-document-intro");
    await expect(header.locator("h1.type-display")).toBeVisible();
    await expect(header.locator("p")).not.toBeEmpty();
    await expect(page.locator(".docs-content > h1")).toHaveCount(0);
    await expect(article.locator(".gallery-page")).toBeAttached();
    const geometry = await header.evaluate((element) => {
      const title = element.querySelector("h1")!;
      const summary = element.querySelector("p")!;
      return {
        title: title.getBoundingClientRect().left,
        summary: summary.getBoundingClientRect().left,
        size: parseFloat(getComputedStyle(title).fontSize),
        body: parseFloat(getComputedStyle(summary).fontSize),
      };
    });
    expect(geometry.title).toBeCloseTo(geometry.summary, 0);
    expect(geometry.size).toBeGreaterThan(geometry.body);
    if (id === "space")
      await page.screenshot({
        path: ".handoff/glass-ux-extract/screenshots/foundation-space.png",
      });
  });
}
