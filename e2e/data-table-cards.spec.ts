import { expect, test } from "@playwright/test";

for (const density of ["comfortable", "compact"] as const) {
  test(`${density}: narrow table cards preserve title, status, actions and loading geometry`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.addInitScript(
      (density) =>
        localStorage.setItem(
          "glass-ux.appearance.v1",
          JSON.stringify({
            density,
            uiScale: 1.25,
            mode: "light",
            motion: "reduced",
          }),
        ),
      density,
    );
    await page.goto("./components/data-table");
    const frame = page.locator("#examples").getByTestId("dt-main");
    const table = frame.locator(".fa-dt");
    for (const width of [200, 360]) {
      await frame.evaluate((element, width) => {
        element.style.width = `${width}px`;
      }, width);
      await expect(table).toHaveAttribute("data-mode", "cards");
      const card = table.locator(".fa-dt-card:not(.fa-dt-skel-card)").first();
      await expect(card).toBeVisible();
      const title = card.locator(".fa-dt-card-title");
      const status = card.locator(".fa-dt-card-status .fa-badge-label");
      await expect(status).toBeVisible();
      const geometry = await card.evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        const title = element
          .querySelector(".fa-dt-card-title")!
          .getBoundingClientRect();
        const actions = element
          .querySelector(".fa-dt-card-actions")!
          .getBoundingClientRect();
        const status = element
          .querySelector(".fa-dt-card-status")!
          .getBoundingClientRect();
        return {
          titleWidth: title.width,
          titleBottom: title.bottom,
          statusTop: status.top,
          statusBottom: status.bottom,
          actionsTop: actions.top,
          actionsRight: actions.right,
          right: bounds.right,
        };
      });
      expect(geometry.titleWidth).toBeGreaterThanOrEqual(140);
      expect(geometry.statusTop).toBeGreaterThanOrEqual(geometry.titleBottom);
      expect(geometry.actionsTop).toBeGreaterThanOrEqual(geometry.statusBottom);
      expect(geometry.actionsRight).toBeLessThanOrEqual(geometry.right);
      const details = card.getByRole("button", {
        name: /(?:Show|Hide) \d+ more fields/,
      });
      await details.click();
      await expect(details).toHaveAttribute("aria-expanded", "true");
      await expect(card.locator(".fa-dt-card-details")).toBeVisible();
      await details.click();
      const loadedTitle = await title.boundingBox();
      const loadedActions = await card
        .locator(".fa-dt-card-actions")
        .boundingBox();
      await page
        .locator("#examples .dt-demo-controls")
        .first()
        .getByRole("button", { name: "Loading", exact: true })
        .click();
      const skeleton = table.locator(".fa-dt-skel-card").first();
      await expect(skeleton).toBeVisible();
      const loadingTitle = await skeleton
        .locator(".fa-dt-card-title")
        .boundingBox();
      const loadingActions = await skeleton
        .locator(".fa-dt-card-actions")
        .boundingBox();
      expect(loadingTitle!.width).toBeCloseTo(loadedTitle!.width, 0);
      expect(loadingActions!.height).toBeCloseTo(loadedActions!.height, 0);
      await page
        .locator("#examples .dt-demo-controls")
        .first()
        .getByRole("button", { name: "Loaded", exact: true })
        .click();
    }
    const readOnly = page
      .locator("#examples")
      .getByRole("region", { name: "Default columns", exact: true });
    await readOnly.evaluate((element) => {
      element.style.width = "200px";
    });
    const card = readOnly.locator(".fa-dt-card").first();
    await expect(card).toBeVisible();
    await expect(card.getByRole("checkbox")).toHaveCount(0);
    expect(
      (await card.locator(".fa-dt-card-title").boundingBox())!.width,
    ).toBeGreaterThanOrEqual(140);
    await card
      .getByRole("button", {
        name: "Show 2 more fields for Google Chrome",
        exact: true,
      })
      .click();
    await expect(card.locator(".fa-dt-card-details")).toContainText("512");
  });
}
