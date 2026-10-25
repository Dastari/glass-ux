import { expect, test } from "@playwright/test";
import {
  chooseFromCombobox,
  chooseMenuItem,
  expectToast,
  getCell,
  getTableRows,
  openMenu,
  pickDate,
  selectOption,
  toggleSwitch,
} from "../src/testing/playwright.js";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "glass-ux.appearance.v1",
      JSON.stringify({ mode: "light", motion: "reduced" }),
    ),
  );
});

test("RHF typed fields validate in place and submit typed values @responsive", async ({
  page,
}) => {
  await page.goto("/components/rhf-field");
  const form = page.getByTestId("rhf-contact");
  const email = form.getByRole("textbox", { name: "Contact email" });
  const save = form.getByRole("button", { name: "Save contact", exact: true });
  await email.fill("wrong");
  const position = () =>
    save.evaluate((element) => {
      const box = element.getBoundingClientRect(),
        form = element.closest("form")!.getBoundingClientRect();
      return { x: box.left - form.left, y: box.top - form.top };
    });
  const before = await position();
  await email.press("Tab");
  await expect(
    form.getByText("Enter an email such as name@example.com.au", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(email).toHaveAttribute("aria-invalid", "true");
  const after = await position();
  expect(after.y).toBeCloseTo(before.y, 0);
  expect(after.x).toBeCloseTo(before.x, 0);
  await save.click();
  await expect(email).toBeFocused();
  await email.fill("Avery@NORTHSTAR.EXAMPLE");
  await email.press("Tab");
  await expect(email).toHaveValue("Avery@northstar.example");
  await expect(email).not.toHaveAttribute("aria-invalid", "true");
  const gateway = form.getByRole("textbox", { name: "Gateway" });
  await gateway.fill("192.000.002.010");
  await gateway.press("Tab");
  await expect(gateway).toHaveValue("192.0.2.10");
  await form.getByRole("textbox", { name: "Service port" }).fill("8443");
  await save.click();
  await expect(save).toHaveAttribute("data-status", "success");
  await expect(save).toBeDisabled();
  expect(
    await form.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);
});

test("VirtualList keeps focused rows, supports ScrollArea and listbox navigation @responsive", async ({
  page,
}) => {
  await page.goto("/components/virtual-list");
  const frame = page.getByTestId("virtual-list-frame");
  const first = frame.getByRole("button", {
    name: "Northstar record 1",
    exact: true,
  });
  await first.focus();
  await frame
    .getByRole("list", { name: "Records", exact: true })
    .evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
  await expect(
    frame.getByRole("button", { name: "Northstar record 10000", exact: true }),
  ).toBeVisible();
  await expect(first).toBeAttached();
  await expect(first).toBeFocused();
  expect(await frame.getByRole("listitem").count()).toBeLessThan(60);
  const external = page.getByTestId("virtual-scroll-area-frame");
  const listbox = external.getByRole("listbox", { name: "Choose a record" });
  const option = listbox.getByRole("option", {
    name: "Northstar record 1",
    exact: true,
  });
  await option.focus();
  await option.press("End");
  const last = listbox.getByRole("option", {
    name: "Northstar record 10000",
    exact: true,
  });
  await expect(last).toBeFocused();
  await expect(last).toBeVisible();
  await last.press("Enter");
  await expect(last).toHaveAttribute("aria-selected", "true");
  await expect(last).toHaveAttribute("aria-posinset", "10000");
  const scroll = external.locator(".fa-scroll-viewport");
  expect(await scroll.evaluate((element) => element.scrollTop)).toBeGreaterThan(
    100000,
  );
  expect(
    await frame.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);
});

test("published browser helpers operate real components @responsive", async ({
  page,
}, testInfo) => {
  await page.goto("/foundations/testing");
  const fixture = page.getByTestId("testing-fixture");
  const select = fixture.getByRole("combobox", {
    name: "Organisation",
    exact: true,
  });
  await selectOption(select, "Northstar Studio");
  await expect(select).toContainText("Northstar Studio");
  const combo = fixture.getByRole("combobox", {
    name: "Find organisation",
    exact: true,
  });
  await chooseFromCombobox(combo, "Harbour Workshop", "Harbour");
  await expect(combo).toHaveValue("Harbour Workshop");
  const menu = await openMenu(
    fixture.getByRole("button", { name: "Record actions" }),
  );
  await chooseMenuItem(menu, "Archive record");
  await expect(
    fixture.getByText("Record archived", { exact: true }),
  ).toBeVisible();
  const date = fixture.getByRole("textbox", { name: "Review date" });
  await pickDate(date, "2026-10-13");
  await expect(date).toHaveValue("13/10/2026");
  const setting = fixture.getByRole("switch", { name: "Send reports" });
  await toggleSwitch(setting, true);
  await toggleSwitch(setting, true);
  await expect(setting).toHaveAttribute("aria-checked", "true");
  const table = fixture.getByRole("grid", { name: "Sample records" });
  await expect(getTableRows(table)).toHaveCount(2);
  if (testInfo.project.name === "desktop")
    await expect(getCell(table, 0, 0)).toContainText("Northstar Studio");
  await fixture.getByRole("button", { name: "Queue reports" }).click();
  await expectToast(page, "Reports queued");
});

test("utilities and scoped hooks work with stable geometry @responsive", async ({
  page,
}) => {
  await page.goto("/components/spinner");
  const sizes = page.getByTestId("spinner-sizes");
  await expect(sizes.locator(".fa-spinner > svg")).toHaveCount(6);
  const geometry = await sizes
    .locator(".fa-spinner > svg")
    .evaluateAll((elements) =>
      elements.map((element) => ({
        width: element.getBoundingClientRect().width,
        height: element.getBoundingClientRect().height,
        animation: getComputedStyle(element).animationName,
      })),
    );
  expect(geometry).toHaveLength(6);
  for (const [index, item] of geometry.entries()) {
    expect(item.width).toBeGreaterThan(0);
    expect(item.width).toBeCloseTo(item.height, 1);
    expect(item.animation).toBe("none");
    if (index) expect(item.width).toBeGreaterThan(geometry[index - 1]!.width);
  }
  await page.goto("/components/portal");
  const target = page.getByTestId("portal-target");
  await target.getByRole("button", { name: "Count 0" }).click();
  await expect(target.getByRole("button", { name: "Count 1" })).toBeVisible();
  await page.goto("/components/visually-hidden");
  const hidden = page.getByRole("button", {
    name: "Find a record",
    exact: true,
  });
  await expect(hidden).toBeVisible();
  expect(
    await hidden
      .locator(".fa-visually-hidden")
      .evaluate((element) => getComputedStyle(element).clipPath),
  ).toBe("inset(50%)");
  await page.goto("/foundations/hooks");
  const scope = page.getByTestId("hooks-scope"),
    button = scope.getByRole("button", { name: "Count 0" });
  await button.click();
  await expect(scope.getByRole("button", { name: "Count 1" })).toBeVisible();
  await scope.getByRole("button", { name: "Count 1" }).press("Control+Shift+k");
  await expect(scope.getByText("Shortcuts: 1", { exact: true })).toBeVisible();
});

test("VirtualList row geometry follows density, scale and focus stays inside the scroll edge @responsive", async ({
  page,
}) => {
  await page.goto("/components/virtual-list");
  const frame = page.getByTestId("virtual-list-frame");
  await expect(
    frame.getByRole("button", { name: "Northstar record 1", exact: true }),
  ).toBeVisible();
  const comfortable = await frame
    .locator(".fa-virtual-list-row")
    .first()
    .evaluate((element) => element.getBoundingClientRect().height);
  await page.evaluate(() => {
    const root = document.documentElement;
    root.dataset.density = "compact";
    root.dataset.mode = "dark";
    root.dataset.glass = "solid";
    root.style.setProperty("--ui-scale", "1.15");
    root.style.setProperty("--radius-scale", "1.4");
    root.style.setProperty("--border-width", "2px");
  });
  const row = frame.getByRole("button", {
    name: "Northstar record 1",
    exact: true,
  });
  await expect(row).toBeVisible();
  const actual = await row.evaluate((element) => {
    const style = getComputedStyle(element),
      root = getComputedStyle(document.documentElement),
      bounds = element.getBoundingClientRect();
    const scroll = element.closest(".fa-virtual-list")!.getBoundingClientRect();
    return {
      height: bounds.height,
      inside: bounds.left >= scroll.left && bounds.right <= scroll.right + 1,
      radius: style.borderRadius,
      roleRadius: root.getPropertyValue("--radius-item"),
      border: root.getPropertyValue("--border-width"),
      scale: root.getPropertyValue("--ui-scale"),
      outlineOffset: style.outlineOffset,
    };
  });
  expect(comfortable).toBeGreaterThan(0);
  expect(actual.height).toBeGreaterThan(0);
  expect(actual.inside).toBe(true);
  expect(actual.scale.trim()).toBe("1.15");
  expect(actual.border.trim()).toBe("2px");
  expect(actual.radius).not.toBe("0px");
  const width = await frame.evaluate((element) => ({
    frame: element.getBoundingClientRect().width,
    body: element.closest(".gallery-specimen-body")!.getBoundingClientRect()
      .width,
  }));
  expect(width.frame).toBeCloseTo(width.body, 0);
});
