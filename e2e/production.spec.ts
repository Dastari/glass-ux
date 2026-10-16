import { expect, test } from "@playwright/test";

const palettes = [
  { id: "ocean", label: "Ocean", hue: 252, chroma: 0.19 },
  { id: "aurora", label: "Aurora", hue: 293, chroma: 0.21 },
  { id: "emerald", label: "Emerald", hue: 160, chroma: 0.14 },
  { id: "sunset", label: "Sunset", hue: 48, chroma: 0.18 },
  { id: "graphite", label: "Graphite", hue: 265, chroma: 0.02 },
  { id: "ruby", label: "Ruby", hue: 25, chroma: 0.215 },
];

for (const mode of ["light", "dark"] as const) {
  test(`${mode}: every palette changes rendered page colours and syntax tokens`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("components/system-notice/");
    await expect(page.locator("main h1")).toHaveText("AssistantMessage");
    await expect(page.locator("#system-notice")).toContainText(
      "Conversation notices",
    );
    await expect(page.locator("#system-notice")).not.toContainText("A turn");
    const toolbar = page.getByRole("region", { name: "Appearance controls" });
    await toolbar
      .getByRole("button", {
        name: mode === "light" ? "Light" : "Dark",
        exact: true,
      })
      .click();
    const root = page.locator("html");
    await expect(root).toHaveAttribute("data-mode", mode);
    const code = page.locator(".gallery-document-intro .fa-ai-code pre");
    await expect(code).toHaveAttribute("data-highlighted", "");
    const colours: string[] = [];
    for (const palette of palettes) {
      await toolbar
        .getByRole("button", { name: palette.label, exact: true })
        .click();
      await expect(root).toHaveAttribute("data-palette", palette.id);
      const rendered = await root.evaluate((element) => {
        const style = getComputedStyle(element);
        const keyword = document.querySelector<HTMLElement>(
          '.gallery-document-intro span[style*="--fa-code-token-keyword"]',
        )!;
        const string = document.querySelector<HTMLElement>(
          '.gallery-document-intro span[style*="--fa-code-token-string"]',
        )!;
        return {
          hue: Number(style.getPropertyValue("--accent-h")),
          chroma: Number(style.getPropertyValue("--accent-c")),
          canvas: style.getPropertyValue("--canvas").trim(),
          scheme: style.colorScheme,
          keyword: getComputedStyle(keyword).color,
          string: getComputedStyle(string).color,
        };
      });
      expect(rendered.hue, `${palette.label} root hue`).toBe(palette.hue);
      expect(rendered.chroma, `${palette.label} root chroma`).toBe(
        palette.chroma,
      );
      expect(rendered.scheme).toBe(mode);
      const islandHue = await toolbar
        .locator(`[data-palette="${palette.id}"]`)
        .evaluate((element) =>
          Number(getComputedStyle(element).getPropertyValue("--accent-h")),
        );
      expect(islandHue).toBe(palette.hue);
      expect(rendered.keyword).not.toBe(rendered.string);
      expect(rendered.keyword).not.toBe(rendered.canvas);
      colours.push(rendered.keyword);
    }
    expect(new Set(colours).size).toBe(palettes.length);
    await page.reload();
    await expect(root).toHaveAttribute("data-palette", "ruby");
    await expect(root).toHaveAttribute("data-mode", mode);
    await expect(code).toHaveAttribute("data-highlighted", "");
    await expect(page.locator("#system-notice [role='note']")).toHaveCount(2);
    expect(errors).toEqual([]);
    await page.screenshot({
      path: `test-results/production/palettes-${mode}.png`,
    });
  });
}

test("mode, material, motion and density controls update and survive reload", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("components/button/");
  const toolbar = page.getByRole("region", { name: "Appearance controls" });
  const root = page.locator("html");
  await toolbar
    .getByRole("button", { name: "Match system", exact: true })
    .click();
  await expect(root).toHaveAttribute("data-mode", "light");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(root).toHaveAttribute("data-mode", "dark");
  for (const [label, attribute, value] of [
    ["Frosted", "data-glass", "reduced"],
    ["Solid", "data-glass", "solid"],
    ["Glass", "data-glass", "full"],
    ["Still", "data-motion", "reduced"],
    ["Compact", "data-density", "compact"],
  ]) {
    await toolbar.getByRole("button", { name: label, exact: true }).click();
    await expect(root).toHaveAttribute(attribute!, value!);
  }
  await page.reload();
  await expect(root).toHaveAttribute("data-density", "compact");
  await expect(root).toHaveAttribute("data-motion", "reduced");
  await expect(root).toHaveAttribute("data-glass", "full");
});

test("usage and guide code highlight from lazy chunks under the deployment base path", async ({
  page,
}) => {
  const failed: string[] = [];
  page.on("requestfailed", (request) => failed.push(request.url()));
  page.on("response", (response) => {
    if (response.status() >= 400)
      failed.push(`${response.status()} ${response.url()}`);
  });
  await page.goto("components/action-menu/#usage");
  const usage = page
    .locator("#usage-action-menu")
    .locator("..")
    .locator(".fa-ai-code pre");
  await expect(usage).toHaveAttribute("data-highlighted", "");
  await expect(
    usage.locator('span[style*="--fa-code-token-keyword"]').first(),
  ).toBeAttached();
  await expect(
    usage.locator('span[style*="--fa-code-token-string"]').first(),
  ).toBeAttached();
  await page.goto("guides/getting-started/");
  const shell = page.locator(".fa-ai-code pre[data-highlighted]").first();
  await expect(shell).toBeAttached();
  expect(failed).toEqual([]);
});

test("the supplied brand mark, favicon and sharing image load under the deployment path", async ({
  page,
}) => {
  await page.goto("guides/getting-started/");
  const logo = page
    .getByRole("navigation", { name: "Component navigation", exact: true })
    .locator("svg[data-brand='glass-ux']");
  await expect(logo).toBeVisible();
  await expect(logo).toHaveAttribute("data-tones", "brand");
  expect(await logo.locator("linearGradient").count()).toBe(2);
  const icons = await page
    .locator("link[rel='icon']")
    .evaluate((element) => (element as HTMLLinkElement).href);
  const favicon = await page.request.get(icons);
  expect(favicon.ok()).toBe(true);
  expect(await favicon.text()).toContain("glass-ux-logo-primary");
  const sharing = await page
    .locator("meta[property='og:image']")
    .getAttribute("content");
  expect(sharing).toContain("/glass-ux/brand/social-preview.png");
  const preview = await page.request.get("brand/social-preview.png");
  expect(preview.ok()).toBe(true);
});

test("published guides and Foundations share the aligned article and viewport scroll layout", async ({
  page,
}) => {
  await page.goto("guides/agent-adoption/");
  await expect(page.locator(".gallery-guide-document h1")).toHaveText(
    "AI agent adoption",
  );
  const geometry = await page.evaluate(() => {
    const article = document.querySelector<HTMLElement>(
      ".gallery-guide-document",
    )!;
    const prose = article.querySelector("p")!.getBoundingClientRect();
    const code = article.querySelector(".fa-ai-code")!.getBoundingClientRect();
    const table = article.querySelector("table")!.getBoundingClientRect();
    const scroller = document
      .querySelector(".docs-content")!
      .getBoundingClientRect();
    return {
      article: article.getBoundingClientRect().width,
      prose: prose.width,
      code: code.width,
      table: table.width,
      right: scroller.right,
      bottom: scroller.bottom,
      width: innerWidth,
      height: innerHeight,
    };
  });
  expect(geometry.article).toBeLessThanOrEqual(1024);
  expect(geometry.prose).toBeCloseTo(geometry.code, 0);
  expect(geometry.table).toBeCloseTo(geometry.code, 0);
  expect(geometry.right).toBeCloseTo(geometry.width, 0);
  expect(geometry.bottom).toBeCloseTo(geometry.height, 0);
  await page.goto("foundations/space/");
  await expect(
    page.locator(
      ".gallery-foundation-document .gallery-document-intro h1.type-display",
    ),
  ).toHaveText("Space and layout");
  await expect(page.locator(".docs-content > h1")).toHaveCount(0);
  await expect(
    page.locator(".gallery-foundation-document .gallery-page"),
  ).toBeAttached();
});
