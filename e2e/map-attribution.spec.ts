import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("scaled attribution stays inside a narrow map and retains full source links @responsive", async ({
  page,
}, info) => {
  const phone = info.project.name === "phone";
  if (!phone) await page.setViewportSize({ width: 1920, height: 1080 });
  await page.addInitScript(() =>
    localStorage.setItem(
      "glass-ux.appearance.v1",
      JSON.stringify({
        mode: "dark",
        palette: "ocean",
        glass: "solid",
        density: "compact",
        uiScale: 1.125,
        radiusScale: 1.4,
        borderWidth: 1.5,
        motion: "reduced",
      }),
    ),
  );
  await page.goto("components/geo-map");
  const frame = page.locator("#examples").getByTestId("map-attribution");
  await expect(frame.locator(".fa-map-attribution")).toBeAttached();
  await frame.evaluate((element) => {
    element.style.width = "362px";
    element.style.maxWidth = "100%";
    element.style.height = "400px";
  });
  const map = frame.locator(".fa-map");
  const geometry = await map.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const credit = element
      .querySelector(".fa-map-attribution")!
      .getBoundingClientRect();
    const link = element.querySelector(".fa-map-credit-minimal a")!;
    return {
      map: { left: rect.left, right: rect.right, width: rect.width },
      credit: { left: credit.left, right: credit.right },
      minimal: getComputedStyle(link.parentElement!).display,
    };
  });
  expect(geometry.credit.left).toBeGreaterThanOrEqual(geometry.map.left);
  expect(geometry.credit.right).toBeLessThanOrEqual(geometry.map.right);
  if (!phone) expect(geometry.map.width).toBe(362);
  expect(geometry.minimal).not.toBe("none");
  const credits = map.getByRole("button", { name: "Map data and licences" });
  await expect(credits).toBeVisible();
  await credits.click();
  const popup = page.getByRole("dialog", { name: "Map data", exact: true });
  await expect(
    popup.getByRole("link", {
      name: "Natural Earth public domain boundary data",
      exact: true,
    }),
  ).toHaveAttribute("href", "https://www.naturalearthdata.com/");
  await expect(popup).toContainText("Public domain");
  await page.screenshot({
    path: info.outputPath("map-attribution-scaled.png"),
  });
});

test("the map examples pass axe and the view switch works by keyboard", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("glass-ux.appearance.v1", JSON.stringify({ mode: "light", motion: "reduced" })));
  await page.goto("components/geo-map");
  await expect(page.locator("#examples .fa-map").first()).toBeAttached();
  // The container lab repeats one labelled map in many frames; every other example is scanned.
  const result = await new AxeBuilder({ page }).include("#examples").exclude(".gallery-lab").analyze();
  expect(result.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) }))).toEqual([]);
  const toggle = page.locator("#examples").getByRole("button", { name: "View as list" }).first();
  if (await toggle.count()) {
    await toggle.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#examples").getByRole("button", { name: "View as map" }).first()).toBeVisible();
  }
});
