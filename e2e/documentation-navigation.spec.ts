import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const width of [320, 390, 1920]) {
  for (const mode of ["light", "dark"] as const) {
    test(`${width}px ${mode}: search filters every documentation destination`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript(
        (mode) =>
          localStorage.setItem(
            "glass-ux.appearance.v1",
            JSON.stringify({ mode }),
          ),
        mode,
      );
      await page.goto("./");
      if (width < 768)
        await page.getByRole("button", { name: "Browse", exact: true }).click();
      const directory = page.locator(".docs-directory");
      const search = directory.getByRole("searchbox");
      await search.fill("   tHeMe AND laYouT   ");
      await expect(
        directory.getByRole("link", { name: "Theme and layout", exact: true }),
      ).toBeVisible();
      await expect(
        directory.getByRole("navigation", { name: "Foundations" }),
      ).toHaveCount(0);
      await expect(
        directory.getByRole("navigation", { name: "Components" }),
      ).toHaveCount(0);
      await directory
        .getByRole("link", { name: "Theme and layout", exact: true })
        .click();
      await expect(page).toHaveURL(/\/guides\/layout-contract$/);
      await expect(page.locator("main h1")).toHaveText(
        "Theme and layout contract",
      );
      if (width < 768)
        await page.getByRole("button", { name: "Browse", exact: true }).click();
      await expect(search).toHaveValue("");
      await search.fill("FOUNDATIONS");
      await expect(
        directory.getByRole("link", { name: "Space and layout", exact: true }),
      ).toBeVisible();
      await expect(
        directory.getByRole("navigation", { name: "Guides" }),
      ).toHaveCount(0);
      await search.fill(" typedoc ");
      await expect(
        directory.getByRole("link", {
          name: "Types and helpers (TypeDoc)",
          exact: true,
        }),
      ).toBeVisible();
      await expect(directory.getByRole("navigation")).toHaveCount(0);
      await search.fill("GitHub");
      await expect(
        directory.getByRole("link", {
          name: "Source and releases",
          exact: true,
        }),
      ).toBeVisible();
      await search.fill("no-such-documentation-4f2");
      await expect(directory.getByRole("status")).toContainText(
        "No documentation matches",
      );
      await expect(directory.getByRole("link")).toHaveCount(0);
      await directory
        .getByRole("button", { name: "Clear", exact: true })
        .click();
      await expect(search).toHaveValue("");
      await expect(directory.getByRole("status")).toHaveCount(0);
      await expect(
        directory.getByRole("navigation", { name: "Guides" }),
      ).toBeVisible();
      await search.fill(" Space and layout ");
      await directory
        .getByRole("link", { name: "Space and layout", exact: true })
        .click();
      await expect(page).toHaveURL(/\/foundations\/space$/);
      await expect(page.locator("main h1")).toHaveText("Space and layout");
      const result = await new AxeBuilder({ page }).analyze();
      expect(result.violations.map((violation) => violation.id)).toEqual([]);
    });

    test(`${width}px ${mode}: API prop names stay on one line inside a scrollable table`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript(
        (mode) =>
          localStorage.setItem(
            "glass-ux.appearance.v1",
            JSON.stringify({ mode }),
          ),
        mode,
      );
      await page.goto("components/rich-text-field#api");
      await expect(
        page.locator(".fa-rich-text-editable").first(),
      ).toBeAttached();
      await page.evaluate(() => document.fonts.ready);
      await page
        .getByRole("navigation", { name: "On this page" })
        .getByRole("link", { name: "API", exact: true })
        .click();
      const scroll = page.locator("#api .gallery-api-scroll").first();
      await expect(scroll).toBeVisible();
      const names = scroll.locator("th[scope='row'] code");
      await expect(names.filter({ hasText: /^aria-describedby$/ })).toHaveCount(
        1,
      );
      await expect(names.filter({ hasText: /^attachmentAccept$/ })).toHaveCount(
        1,
      );
      const geometry = await scroll.evaluate((element) => ({
        pageWidth: document.documentElement.scrollWidth,
        viewport: innerWidth,
        available: element.clientWidth,
        content: element.scrollWidth,
        lines: [...element.querySelectorAll("th[scope='row'] code")].map(
          (code) => {
            const range = document.createRange();
            range.selectNodeContents(code);
            return range.getClientRects().length;
          },
        ),
      }));
      expect(geometry.lines.every((count) => count === 1)).toBe(true);
      expect(geometry.pageWidth).toBeLessThanOrEqual(geometry.viewport);
      if (width < 768) {
        expect(geometry.content).toBeGreaterThan(geometry.available);
        await scroll.focus();
        await page.keyboard.press("ArrowRight");
        await expect
          .poll(() => scroll.evaluate((element) => element.scrollLeft))
          .toBeGreaterThan(0);
      }
      await scroll.evaluate((element) => {
        element.scrollLeft = 0;
      });
      await page
        .locator("#api")
        .evaluate((element) => element.scrollIntoView({ block: "start" }));
      await page.screenshot({
        path: `test-results/docs-props-${width}-${mode}.png`,
      });
    });
  }
}
