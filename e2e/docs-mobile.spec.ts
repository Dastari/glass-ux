import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const width of [320, 360, 390, 430, 480, 640]) {
  for (const density of ["comfortable", "compact"] as const) {
    test(`${width}px ${density}: mobile navigation and appearance keep the document viewport available`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.addInitScript(
        (density) =>
          localStorage.setItem(
            "glass-ux.appearance.v1",
            JSON.stringify({
              density,
              mode: "light",
              palette: "ocean",
              uiScale: 1.25,
              motion: "reduced",
            }),
          ),
        density,
      );
      await page.goto("./");
      const header = page.locator(".docs-mobile-header");
      const appearance = header.getByRole("button", {
        name: "Appearance",
        exact: true,
      });
      const browse = header.getByRole("button", {
        name: "Browse",
        exact: true,
      });
      const repository = header.getByRole("link", {
        name: "Glass UX on GitHub",
        exact: true,
      });
      await expect(repository).toBeVisible();
      await expect(repository).toHaveAttribute(
        "href",
        "https://github.com/Dastari/glass-ux",
      );
      await expect(repository.locator('[data-icon="github"]')).toBeVisible();
      await expect(appearance).toBeVisible();
      const before = await page
        .locator(".docs-content")
        .evaluate((element) => ({
          height: element.clientHeight,
          top: element.getBoundingClientRect().top,
          page: document.documentElement.scrollWidth,
          viewport: innerWidth,
        }));
      expect(before.page).toBeLessThanOrEqual(before.viewport);
      expect(before.top).toBeLessThan(110);
      expect(before.height).toBeGreaterThan(700);
      const demo = await page
        .getByRole("heading", { name: "Application demo", exact: true })
        .boundingBox();
      expect(demo!.y).toBeLessThan(844 / 2);
      for (const metric of await page
        .locator(".showcase-metrics .fa-metric-label")
        .all()) {
        await expect(metric).toBeVisible();
      }
      const headerControls = await header
        .locator("a, button")
        .evaluateAll((elements) =>
          elements.map((element) => {
            const rect = element.getBoundingClientRect();
            return { left: rect.left, right: rect.right, height: rect.height };
          }),
        );
      for (const control of headerControls) {
        expect(control.left).toBeGreaterThanOrEqual(0);
        expect(control.right).toBeLessThanOrEqual(width);
      }
      const repositoryBox = await repository.boundingBox();
      expect(repositoryBox!.width).toBeGreaterThanOrEqual(44);
      expect(repositoryBox!.height).toBeGreaterThanOrEqual(44);
      await expect(
        page.getByRole("region", { name: "Appearance controls" }),
      ).toHaveCount(0);
      await appearance.click();
      const settings = page.getByRole("dialog", {
        name: "Appearance",
        exact: true,
      });
      await expect(settings).toBeVisible();
      const primary = page.locator(
        ".showcase-hero .fa-btn[data-variant='primary']",
      );
      const initialColour = await primary.evaluate(
        (element) => getComputedStyle(element).backgroundImage,
      );
      await settings.getByRole("button", { name: "Ruby", exact: true }).click();
      await expect
        .poll(() =>
          primary.evaluate(
            (element) => getComputedStyle(element).backgroundImage,
          ),
        )
        .not.toBe(initialColour);
      await settings.getByRole("button", { name: "Dark", exact: true }).click();
      await expect(page.locator("html")).toHaveAttribute("data-mode", "dark");
      await settings
        .getByRole("button", { name: "Solid", exact: true })
        .click();
      await expect(page.locator("html")).toHaveAttribute("data-glass", "solid");
      await settings
        .getByRole("button", {
          name: density === "compact" ? "Comfortable" : "Compact",
          exact: true,
        })
        .click();
      const choices = await settings.locator("button").evaluateAll((buttons) =>
        buttons.map((button) => {
          const rect = button.getBoundingClientRect();
          return {
            width: rect.width,
            height: rect.height,
            left: rect.left,
            right: rect.right,
          };
        }),
      );
      for (const choice of choices) {
        expect(choice.width).toBeGreaterThanOrEqual(44);
        expect(choice.height).toBeGreaterThanOrEqual(44);
        expect(choice.left).toBeGreaterThanOrEqual(0);
        expect(choice.right).toBeLessThanOrEqual(width);
      }
      expect(
        (
          await new AxeBuilder({ page })
            .include(".docs-appearance-dialog")
            .analyze()
        ).violations.map((issue) => issue.id),
      ).toEqual([]);
      await page.keyboard.press("Escape");
      await expect(settings).toHaveCount(0);
      await expect(appearance).toBeFocused();
      await browse.click();
      const directory = page.getByRole("dialog", {
        name: "Documentation",
        exact: true,
      });
      const search = directory.getByRole("searchbox", {
        name: "Search documentation",
        exact: true,
      });
      await expect(search).toBeFocused();
      await search.fill(" PanelHeader ");
      await directory.getByRole("link", { name: "Panel", exact: true }).click();
      await expect(page).toHaveURL(/\/components\/panel#panel-header$/);
      await expect(directory).toHaveCount(0);
      await expect(page.locator("main h1")).toHaveText("Panel");
      await browse.click();
      await expect(search).toHaveValue("");
      expect(
        (
          await new AxeBuilder({ page })
            .include(".docs-navigation-dialog")
            .analyze()
        ).violations.map((issue) => issue.id),
      ).toEqual([]);
      await page.keyboard.press("Escape");
      // The drawer search returns focus to its active row before the next Esc closes it.
      await expect(directory).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(directory).toHaveCount(0);
      await expect(browse).toBeFocused();
    });
  }
}
