import { expect, test } from "@playwright/test";

for (const mode of ["light", "dark"] as const) {
  test(`${mode}: a standalone MapSilhouette fills its container and draws the outline @responsive`, async ({
    page,
  }) => {
    await page.addInitScript(
      (mode) =>
        localStorage.setItem(
          "glass-ux.appearance.v1",
          JSON.stringify({ mode, palette: "ruby", motion: "reduced" }),
        ),
      mode,
    );
    await page.goto("components/geo-map#map-silhouette");
    // The specimen outside a map: no stage supplies the fit-padding tokens here.
    const silhouette = page
      .locator(".fa-map-silhouette:not(.fa-map-stage *)")
      .first();
    await expect(silhouette.locator("path")).toBeAttached();
    await silhouette.scrollIntoViewIfNeeded();
    const result = await silhouette.evaluate((svg) => {
      const box = svg.getBoundingClientRect();
      const parent = svg.parentElement!.getBoundingClientRect();
      const path = svg.querySelector("path")!;
      const shape = path.getBoundingClientRect();
      const style = getComputedStyle(path);
      const next = document
        .getElementById("map-status-summary")
        ?.getBoundingClientRect();
      return {
        box: [box.x, box.y, box.width, box.height],
        parent: [parent.x, parent.y, parent.width, parent.height],
        shape: { width: shape.width, height: shape.height, bottom: shape.bottom },
        nextTop: next?.top,
        d: path.getAttribute("d") ?? "",
        fill: style.fill,
        stroke: style.stroke,
        strokeWidth: parseFloat(style.strokeWidth),
      };
    });
    // The outline stays inside its container instead of spilling over later sections.
    expect(result.box).toEqual(result.parent);
    expect(result.shape.height).toBeGreaterThan(0);
    expect(result.shape.height).toBeLessThanOrEqual(result.parent[3] + 1);
    expect(result.shape.width).toBeGreaterThan(0);
    expect(result.nextTop).toBeDefined();
    expect(result.nextTop!).toBeGreaterThanOrEqual(result.shape.bottom);
    expect(result.d).toMatch(/^M[\d.]+ [\d.]+L/);
    for (const colour of [result.fill, result.stroke]) {
      expect(colour).not.toBe("none");
      expect(colour).not.toMatch(/\/ 0\)$|rgba\(0, 0, 0, 0\)/);
    }
    expect(result.strokeWidth).toBeGreaterThan(0);
  });
}
