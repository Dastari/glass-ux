import { expect, test } from "@playwright/test";

for (const width of [320, 1440]) {
  for (const mode of ["light", "dark"] as const) {
    test(`${width}px ${mode}: device manufacturer icons support category search, geometry and imports @responsive`, async ({
      page,
      context,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);
      await page.addInitScript(
        (mode) =>
          localStorage.setItem(
            "glass-ux.appearance.v1",
            JSON.stringify({
              mode,
              uiScale: 1.25,
              density: "compact",
              motion: "reduced",
            }),
          ),
        mode,
      );
      await page.goto("./foundations/icons");
      const search = page.getByRole("searchbox", { name: "Search icons" });
      await search.fill("device manufacturers");
      const group = page.getByRole("region", {
        name: "Device manufacturers",
        exact: true,
      });
      await expect(group.locator("[data-icon-tile]")).toHaveCount(73);
      for (const [size, pixels] of [
        ["xs", 14],
        ["sm", 16],
        ["md", 18],
        ["lg", 20],
        ["xl", 24],
        ["2xl", 40],
      ] as const) {
        await page
          .getByRole("button", { name: `${size} ${pixels}px`, exact: true })
          .click();
        const geometry = await group.locator("svg").evaluateAll((elements) =>
          elements.map((svg) => {
            const box = (svg as SVGGraphicsElement).getBBox(),
              style = getComputedStyle(svg);
            return {
              name: svg.getAttribute("data-icon"),
              size: svg.getAttribute("data-size"),
              pixels: svg.getBoundingClientRect().width,
              stroke: style.stroke,
              colour: style.color,
              x: box.x,
              y: box.y,
              right: box.x + box.width,
              bottom: box.y + box.height,
            };
          }),
        );
        for (const icon of geometry) {
          expect(icon.size, icon.name!).toBe(size);
          expect(icon.pixels, icon.name!).toBeCloseTo(pixels * 1.25, 1);
          expect(icon.stroke, icon.name!).toBe(icon.colour);
          expect(icon.x, icon.name!).toBeGreaterThanOrEqual(1.49);
          expect(icon.y, icon.name!).toBeGreaterThanOrEqual(1.49);
          expect(icon.right, icon.name!).toBeLessThanOrEqual(22.51);
          expect(icon.bottom, icon.name!).toBeLessThanOrEqual(22.51);
        }
      }
      await page
        .getByRole("button", { name: "Line only", exact: true })
        .click();
      const tints = await group
        .locator(".fa-icon-tint")
        .evaluateAll((elements) =>
          elements.map((element) => getComputedStyle(element).display),
        );
      expect(tints.every((display) => display === "none")).toBe(true);
      for (const [query, names] of [
        ["computer", ["dell", "hp", "lenovo", "intel", "nvidia", "apple"]],
        ["VoIP", ["yealink", "poly", "grandstream", "cisco"]],
        ["printer", ["brother", "canon", "epson", "hp", "xerox"]],
        ["network", ["cisco", "ubiquiti", "fortinet", "tp-link"]],
        ["NAS", ["synology", "qnap"]],
        ["UPS", ["apc", "eaton", "vertiv"]],
        ["camera", ["axis", "hikvision", "reolink"]],
        ["Polycom", ["poly"]],
        ["WD", ["western-digital"]],
      ] as const) {
        await search.fill(query);
        for (const name of names)
          await expect(
            page.locator(`[data-icon-tile="${name}"]`),
          ).toBeVisible();
      }
      await search.fill("IconCisco");
      const cisco = group.locator('[data-icon-tile="cisco"]');
      await expect(group.locator("[data-icon-tile]")).toHaveCount(1);
      await cisco.click();
      await expect(cisco).toHaveAttribute("data-state", "copied");
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
        "IconCisco",
      );
      const content = await page
        .locator(".docs-content")
        .evaluate((element) => ({
          client: element.clientWidth,
          scroll: element.scrollWidth,
        }));
      expect(content.scroll).toBeLessThanOrEqual(content.client);
    });

    test(`${width}px ${mode}: company icons retain their geometry, sizing and copy behaviour @responsive`, async ({
      page,
      context,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);
      await page.addInitScript(
        (mode) =>
          localStorage.setItem(
            "glass-ux.appearance.v1",
            JSON.stringify({
              mode,
              uiScale: 1.25,
              density: "compact",
              motion: "reduced",
            }),
          ),
        mode,
      );
      await page.goto("./foundations/icons");
      const search = page.getByRole("searchbox", { name: "Search icons" });
      await search.fill("social");
      const group = page.getByRole("region", {
        name: "Social and company logos",
        exact: true,
      });
      const tiles = group.locator("[data-icon-tile]");
      await expect(tiles).toHaveCount(38);
      const repository = page.getByRole("link", {
        name: "Glass UX on GitHub",
        exact: true,
      });
      await expect(repository).toBeVisible();
      await expect(repository).toHaveAttribute(
        "href",
        "https://github.com/Dastari/glass-ux",
      );
      await expect(repository.locator('[data-icon="github"]')).toBeVisible();
      await expect(repository).toHaveAttribute("data-variant", "ghost");
      if (width >= 768) {
        const linkBox = await repository.boundingBox();
        const toolbarBox = await page
          .locator(".docs-header .docs-toolbar")
          .boundingBox();
        expect(linkBox!.y + linkBox!.height / 2).toBeCloseTo(
          toolbarBox!.y + toolbarBox!.height / 2,
          0,
        );
      }

      for (const [size, pixels] of [
        ["xs", 14],
        ["sm", 16],
        ["md", 18],
        ["lg", 20],
        ["xl", 24],
        ["2xl", 40],
      ] as const) {
        await page
          .getByRole("button", { name: `${size} ${pixels}px`, exact: true })
          .click();
        const geometry = await group.locator("svg").evaluateAll((elements) =>
          elements.map((svg) => {
            const box = (svg as SVGGraphicsElement).getBBox();
            const rect = svg.getBoundingClientRect();
            const style = getComputedStyle(svg);
            return {
              name: svg.getAttribute("data-icon"),
              size: svg.getAttribute("data-size"),
              pixels: rect.width,
              stroke: style.stroke,
              colour: style.color,
              x: box.x,
              y: box.y,
              right: box.x + box.width,
              bottom: box.y + box.height,
            };
          }),
        );
        for (const icon of geometry) {
          expect(icon.size, icon.name!).toBe(size);
          expect(icon.pixels, icon.name!).toBeCloseTo(pixels * 1.25, 1);
          expect(icon.stroke, icon.name!).toBe(icon.colour);
          expect(icon.x, icon.name!).toBeGreaterThanOrEqual(1.49);
          expect(icon.y, icon.name!).toBeGreaterThanOrEqual(1.49);
          expect(icon.right, icon.name!).toBeLessThanOrEqual(22.51);
          expect(icon.bottom, icon.name!).toBeLessThanOrEqual(22.51);
        }
      }
      await page
        .getByRole("button", { name: "Line only", exact: true })
        .click();
      await expect(group.locator('svg:not([data-tint="off"])')).toHaveCount(0);
      const tints = await group
        .locator(".fa-icon-tint")
        .evaluateAll((elements) =>
          elements.map((element) => getComputedStyle(element).display),
        );
      expect(tints.every((display) => display === "none")).toBe(true);
      await page.getByRole("button", { name: "Duotone", exact: true }).click();
      await expect(group.locator('svg[data-tint="off"]')).toHaveCount(0);

      await search.fill(" IconGithub ");
      await expect(tiles).toHaveCount(1);
      const github = group.locator('[data-icon-tile="github"]');
      const before = await github.boundingBox();
      await github.click();
      await expect(github).toHaveAttribute("data-state", "copied");
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
        "IconGithub",
      );
      const after = await github.boundingBox();
      expect(after!.width).toBeCloseTo(before!.width, 1);
      expect(after!.height).toBeCloseTo(before!.height, 1);
      const content = await page
        .locator(".docs-content")
        .evaluate((element) => ({
          client: element.clientWidth,
          scroll: element.scrollWidth,
        }));
      expect(content.scroll).toBeLessThanOrEqual(content.client);
    });
  }
}
