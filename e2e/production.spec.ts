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
    await expect(page.locator("main h1")).toHaveText("SystemNotice");
    await expect(page.locator("#examples")).toContainText(
      "Conversation notices",
    );
    await expect(page.locator("#examples")).not.toContainText("A turn");
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
    await expect(page.locator("#examples [role='note']")).toHaveCount(2);
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
  const usage = page.locator("#usage .fa-ai-code pre").first();
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
