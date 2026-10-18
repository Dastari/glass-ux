import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("bounded remote directory searches, pages, retries and retains selection @responsive", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("components/context-switcher");
  const demo = page.getByTestId("context-switcher-remote");
  const trigger = demo.getByLabel("Organisation: Summit Loom", { exact: true });
  await trigger.click();
  const popup =
    page.viewportSize()!.width < 768
      ? page.getByRole("dialog", { name: "Organisation", exact: true })
      : page.locator(".fa-context-switcher-popup").filter({ visible: true });
  const input = popup.getByRole("combobox", { name: "Search organisations" });
  const option = (name: string) =>
    popup.getByRole("option", { name, exact: true });
  await expect(option("Harbour Works")).toBeVisible();
  await expect(option("Summit Loom")).toHaveCount(0);
  await input.press("Tab");
  await expect(
    page.getByRole("button", { name: "Load more organisations" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(option("Summit Loom")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Load more organisations" }),
  ).toHaveCount(0);
  await input.fill("coastal");
  await expect(option("Harbour Works")).toBeVisible();
  await expect(option("Juniper Lab")).toHaveCount(0);
  await input.fill("not-present");
  await expect(
    page.getByText("No organisations match “not-present”", { exact: true }),
  ).toBeVisible();
  await expect(option("All organisations")).toBeVisible();
  await input.fill("coastal");
  await input.fill("research");
  await expect(option("Juniper Lab")).toBeVisible();
  await expect(option("Harbour Works")).toHaveCount(0);
  await input.press("ArrowDown");
  await expect(option("Juniper Lab")).toHaveAttribute("data-highlighted", "");
  await input.press("Enter");
  await expect(
    demo.getByLabel("Organisation: Juniper Lab", { exact: true }),
  ).toBeVisible();
  await expect(input).toHaveCount(0);
  await demo.getByRole("button", { name: "Simulate read failure" }).click();
  await demo.getByLabel("Organisation: Juniper Lab", { exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "The directory could not be loaded.",
  );
  await expect(option("Juniper Lab")).toHaveCount(0);
  await input.press("Tab");
  await expect(
    page.getByRole("button", { name: "Retry", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(option("Juniper Lab")).toBeVisible();
  await option("All organisations").click();
  const all = demo.getByLabel("Organisation: All organisations", {
    exact: true,
  });
  await expect(all).toBeVisible();
  await expect(input).toHaveCount(0);
  await all.click();
  await input.press("Escape");
  await expect(all).toBeFocused();
  expect(errors).toEqual([]);
});

for (const geometry of [
  {
    width: 1920,
    height: 1080,
    mode: "light",
    density: "comfortable",
    radiusScale: 1,
    borderWidth: 1,
    uiScale: 1,
  },
  {
    width: 390,
    height: 844,
    mode: "dark",
    density: "compact",
    radiusScale: 1.5,
    borderWidth: 2,
    uiScale: 1.125,
  },
  {
    width: 320,
    height: 780,
    mode: "light",
    density: "comfortable",
    radiusScale: 0.5,
    borderWidth: 2,
    uiScale: 1,
  },
] as const) {
  test(`remote picker geometry and accessibility at ${geometry.width}px ${geometry.mode} @responsive`, async ({
    page,
  }, info) => {
    await page.setViewportSize(geometry);
    await page.addInitScript(
      (appearance) =>
        localStorage.setItem(
          "glass-ux.appearance.v1",
          JSON.stringify({
            ...appearance,
            palette: "ocean",
            glass: "solid",
            motion: "reduced",
          }),
        ),
      geometry,
    );
    await page.goto("components/context-switcher");
    const demo = page.getByTestId("context-switcher-remote");
    await demo.getByLabel("Organisation: Summit Loom", { exact: true }).click();
    await expect(
      page.getByRole("option", { name: "Harbour Works", exact: true }),
    ).toBeVisible();
    const popup =
      geometry.width < 768
        ? page.getByRole("dialog", { name: "Organisation", exact: true })
        : page.locator(".fa-context-switcher-popup").filter({ visible: true });
    const box = await popup.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const option = element
        .querySelector('[role="option"]')!
        .getBoundingClientRect();
      return {
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
        inset: option.left - rect.left,
        radius: Number.parseFloat(
          getComputedStyle(element).borderTopLeftRadius,
        ),
        pageWidth: document.documentElement.scrollWidth,
        viewport: innerWidth,
        height: innerHeight,
        border: getComputedStyle(document.documentElement)
          .getPropertyValue("--border-width")
          .trim(),
      };
    });
    expect(box.left).toBeGreaterThanOrEqual(-1);
    expect(box.right).toBeLessThanOrEqual(box.viewport + 1);
    expect(box.top).toBeGreaterThanOrEqual(-1);
    expect(box.bottom).toBeLessThanOrEqual(box.height + 1);
    expect(box.inset).toBeGreaterThan(0);
    expect(box.radius).toBeGreaterThan(0);
    expect(box.pageWidth).toBeLessThanOrEqual(box.viewport);
    expect(box.border).toBe(`${geometry.borderWidth}px`);
    expect(
      (await new AxeBuilder({ page }).analyze()).violations.map((issue) => ({
        id: issue.id,
        targets: issue.nodes.map((node) => node.target),
      })),
    ).toEqual([]);
    await page.screenshot({
      path: info.outputPath(`remote-${geometry.width}-${geometry.mode}.png`),
    });
  });
}

test("a project switcher speaks of projects, has no All row and passes axe @responsive", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("components/context-switcher");
  const empty = page.getByLabel("Project: Choose a project", { exact: true });
  await expect(empty).toBeVisible({ timeout: 30_000 });
  await expect(empty).toContainText("Choose a project");

  const trigger = page.getByLabel("Project: Harbour survey", { exact: true });
  await trigger.click();
  const phone = (page.viewportSize()?.width ?? 1920) < 768;
  const popup = phone
    ? page.getByRole("dialog", { name: "Project", exact: true })
    : page.locator(".fa-context-switcher-popup").filter({ visible: true });
  await expect(popup).toBeVisible();
  if (!phone) await expect(popup).toHaveAttribute("aria-label", "Choose a project");
  const search = popup.getByRole("combobox", { name: "Search projects" });
  await expect(search).toHaveAttribute("placeholder", "Find a project");
  await expect(popup.getByRole("group", { name: "Projects" })).toBeVisible();
  await expect(popup.getByRole("option", { name: /^All/ })).toHaveCount(0);
  await expect(popup.getByRole("option", { name: "Harbour survey" })).toHaveAttribute("aria-selected", "true");

  expect(
    (await new AxeBuilder({ page }).analyze()).violations.map((issue) => ({
      id: issue.id,
      targets: issue.nodes.map((node) => node.target),
    })),
  ).toEqual([]);

  await search.fill("lant");
  await popup.getByRole("option", { name: "Lantern archive" }).click();
  await expect(page.getByLabel("Project: Lantern archive", { exact: true })).toBeFocused();
  expect(errors).toEqual([]);
});
