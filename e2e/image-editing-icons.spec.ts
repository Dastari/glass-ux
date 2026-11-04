import { expect, test } from "@playwright/test";

for (const [width, mode] of [
  [320, "dark"],
  [1440, "light"],
] as const) {
  test(`${width}px ${mode}: image-editing icons are filed, searchable and inside the live area @responsive`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(
      (mode) =>
        localStorage.setItem(
          "glass-ux.appearance.v1",
          JSON.stringify({ mode, uiScale: 1, density: "comfortable", motion: "reduced" }),
        ),
      mode,
    );
    await page.goto("./foundations/icons");
    const search = page.getByRole("searchbox", { name: "Search icons" });
    await search.fill("image editing");
    const group = page.getByRole("region", { name: "Image editing", exact: true });
    await expect(group.locator("[data-icon-tile]")).toHaveCount(46);

    for (const [size, pixels] of [
      ["xs", 14],
      ["2xl", 40],
    ] as const) {
      await page.getByRole("button", { name: `${size} ${pixels}px`, exact: true }).click();
      const boxes = await group.locator("svg").evaluateAll((elements) =>
        elements.map((svg) => {
          const box = (svg as SVGGraphicsElement).getBBox();
          return { name: svg.getAttribute("data-icon"), x: box.x, y: box.y, right: box.x + box.width, bottom: box.y + box.height };
        }),
      );
      for (const icon of boxes) {
        expect(icon.x, icon.name!).toBeGreaterThanOrEqual(1.49);
        expect(icon.y, icon.name!).toBeGreaterThanOrEqual(1.49);
        expect(icon.right, icon.name!).toBeLessThanOrEqual(22.51);
        expect(icon.bottom, icon.name!).toBeLessThanOrEqual(22.51);
      }
    }

    const mirrored = await group
      .locator('svg[data-icon-dir="mirror"]')
      .evaluateAll((elements) => elements.map((svg) => svg.getAttribute("data-icon")));
    expect(mirrored.sort()).toEqual(["before-after", "image-size"]);

    for (const [query, name] of [
      ["clone", "clone-stamp"],
      ["stamp", "clone-stamp"],
      ["heal", "healing-brush"],
      ["exif", "image-metadata"],
      ["keystone", "perspective"],
      ["content-aware", "fill-edges"],
      ["psd", "file-layers"],
    ] as const) {
      await search.fill(query);
      await expect(page.locator(`[data-icon-tile="${name}"]`)).toBeVisible();
    }
  });
}
