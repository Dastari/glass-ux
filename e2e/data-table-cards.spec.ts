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
      // Narrow cards lead the field line with the status badge (its label kept for
      // assistive technology), so the title keeps the row beside its actions.
      const status = card.locator(
        ".fa-dt-card-field[data-status] .fa-badge-label",
      );
      await expect(status).toBeVisible();
      await expect(
        card.locator(".fa-dt-card-field[data-status] .fa-dt-card-label"),
      ).toHaveText("Status");
      const geometry = await card.evaluate((element) => {
        const box = (selector: string) =>
          element.querySelector(selector)!.getBoundingClientRect();
        const bounds = element.getBoundingClientRect();
        const title = box(".fa-dt-card-title");
        const actions = box(".fa-dt-card-actions");
        const status = box(".fa-dt-card-field[data-status]");
        const fields = [
          ...element.querySelectorAll(".fa-dt-card-meta > .fa-dt-card-field"),
        ].map((field) => field.getBoundingClientRect());
        return {
          titleWidth: title.width,
          titleRight: title.right,
          titleTop: title.top,
          titleBottom: title.bottom,
          statusTop: status.top,
          actionsTop: actions.top,
          actionsLeft: actions.left,
          actionsRight: actions.right,
          left: bounds.left,
          right: bounds.right,
          fieldsInside: fields.every(
            (field) => field.left >= bounds.left && field.right <= bounds.right,
          ),
        };
      });
      expect(geometry.titleWidth).toBeGreaterThanOrEqual(140);
      expect(geometry.statusTop).toBeGreaterThanOrEqual(geometry.titleBottom);
      expect(geometry.actionsRight).toBeLessThanOrEqual(geometry.right);
      expect(geometry.fieldsInside).toBe(true);
      // Actions share the title's row only beside it, never over it.
      if (geometry.actionsTop < geometry.titleBottom)
        expect(geometry.actionsLeft).toBeGreaterThanOrEqual(
          geometry.titleRight - 0.5,
        );
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

test("phone cards keep one toolbar line, the subtitle under the title and short fields on one line", async ({
  page,
}) => {
  await page.setViewportSize({ width: 393, height: 852 });
  await page.addInitScript(() =>
    localStorage.setItem(
      "glass-ux.appearance.v1",
      JSON.stringify({ mode: "light", motion: "reduced" }),
    ),
  );
  await page.goto("./components/data-table");

  // The search folds to an icon beside the table's own tools; nothing wraps.
  const main = page.locator("#examples").getByTestId("dt-main");
  await expect(main.locator(".fa-dt")).toHaveAttribute("data-mode", "cards");
  const toolbar = main.locator(".fa-dt-toolbar");
  const lineTops = () =>
    toolbar.evaluate((element) =>
      [...element.querySelectorAll("button")]
        .filter((button) => button.getBoundingClientRect().width > 0)
        .map((button) => Math.round(button.getBoundingClientRect().top)),
    );
  await expect.poll(async () => new Set(await lineTops()).size).toBe(1);
  const columns = toolbar.getByRole("button", { name: "Columns and density" });
  const before = await columns.boundingBox();
  await toolbar.getByRole("button", { name: /^Search/ }).click();
  await expect(toolbar.getByRole("searchbox")).toBeFocused();
  expect(await columns.boundingBox()).toEqual(before);

  const reorder = page.getByTestId("dt-reorder");
  await reorder.scrollIntoViewIfNeeded();
  const card = reorder.locator('.fa-dt-card[data-item="row"]').first();
  await expect(card).toBeVisible();
  const title = (await card.locator(".fa-dt-card-title").boundingBox())!;
  const subtitle = (await card.locator(".fa-dt-card-subtitle").boundingBox())!;
  expect(subtitle.y).toBeGreaterThanOrEqual(title.y + title.height - 0.5);
  expect(subtitle.y - (title.y + title.height)).toBeLessThan(8);
  expect(Math.abs(subtitle.x - title.x)).toBeLessThan(1);
  const fieldTops = await card
    .locator(".fa-dt-card-meta > .fa-dt-card-field")
    .evaluateAll((fields) =>
      fields.map((field) => Math.round(field.getBoundingClientRect().top)),
    );
  expect(fieldTops.length).toBeGreaterThanOrEqual(2);
  expect(new Set(fieldTops).size).toBe(1);
});
