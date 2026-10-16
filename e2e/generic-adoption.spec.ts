import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { componentDestination } from "../src/gallery/component-families.js";

for (const id of [
  "tone-dot",
  "fact-list",
  "list-row",
  "activity-feed",
  "meter-cell",
  "button-link",
  "chip-overflow",
]) {
  test(`${id} examples fit desktop and phone containers @responsive`, async ({
    page,
  }, testInfo) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`/components/${id}`);
    const section = `#${componentDestination(id).hash ?? "examples"}`;
    await expect(
      page.locator(`${section} .gallery-specimen`).first(),
    ).toBeVisible();
    const bounds = await page.locator(section).evaluate((element) => {
      const article = element.closest(".gallery-component-document")!;
      const rect = article.getBoundingClientRect();
      return [
        ...element.querySelectorAll<HTMLElement>(
          `.fa-${element.querySelector(".fa-meter-cell") ? "meter-cell" : "list-row"}, .fa-fact-list, .fa-activity-feed, .fa-chip-overflow, a.fa-btn`,
        ),
      ]
        .filter((item) => item.getBoundingClientRect().width)
        .map((item) => ({
          left: item.getBoundingClientRect().left,
          right: item.getBoundingClientRect().right,
          articleLeft: rect.left,
          articleRight: rect.right,
        }));
    });
    for (const rect of bounds) {
      expect(rect.left).toBeGreaterThanOrEqual(rect.articleLeft - 1);
      expect(rect.right).toBeLessThanOrEqual(rect.articleRight + 1);
    }
    await page.locator(section).screenshot({
      path: `.handoff/adoption-audit-20261015/generic-${id}-${testInfo.project.name}.png`,
    });
    expect(errors).toEqual([]);
  });
}

for (const appearance of [
  {
    density: "comfortable",
    mode: "light",
    uiScale: 1,
    radiusScale: 1,
    borderWidth: 1,
  },
  {
    density: "compact",
    mode: "dark",
    uiScale: 1.125,
    radiusScale: 1.4,
    borderWidth: 1.5,
  },
]) {
  test(`button links share theme geometry in ${appearance.density} ${appearance.mode} @responsive`, async ({
    page,
  }) => {
    await page.addInitScript(
      (settings) =>
        localStorage.setItem(
          "glass-ux.appearance.v1",
          JSON.stringify(settings),
        ),
      appearance,
    );
    await page.goto("/components/button-link");
    const link = page.getByRole("link", { name: "Read the API", exact: true });
    await expect(link).toHaveClass(/fa-btn/);
    const geometry = await link.evaluate((element) => {
      const style = getComputedStyle(element);
      const probe = document.createElement("span");
      probe.style.cssText =
        "position:absolute;visibility:hidden;height:var(--control-h-md);padding-inline:var(--control-px-md);border-radius:var(--radius-control);border:var(--border-width) solid transparent";
      element.parentElement!.append(probe);
      const expected = getComputedStyle(probe);
      const result = {
        height: style.height,
        inset: style.paddingLeft,
        radius: style.borderTopLeftRadius,
        line: style.borderTopWidth,
        expectedHeight: expected.height,
        expectedInset: expected.paddingLeft,
        expectedRadius: expected.borderTopLeftRadius,
        expectedLine: expected.borderTopWidth,
      };
      probe.remove();
      return result;
    });
    expect(geometry.height).toBe(geometry.expectedHeight);
    expect(geometry.inset).toBe(geometry.expectedInset);
    expect(geometry.radius).toBe(geometry.expectedRadius);
    expect(geometry.line).toBe(geometry.expectedLine);
    await page.getByRole("link", { name: "Return to examples" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "Anchor handlers called" }),
    ).toHaveText("Anchor handlers called 2 times");
  });
}

test("list rows preserve native keyboard selection and disabled state @responsive", async ({
  page,
}) => {
  await page.goto("/components/list-row");
  const row = page.getByRole("button", { name: /^Studio project/ });
  await row.focus();
  await row.press("Space");
  await expect(row).toHaveAttribute("data-selected", "");
  await expect(row).toHaveAttribute("aria-current", "page");
  await expect(
    page.getByRole("button", { name: /^Archived document/ }),
  ).toBeDisabled();
  await expect(row.locator(".fa-truncate[tabindex='0']")).toHaveCount(0);
});

test("chip overflow is searchable, keyboard accessible and returns focus @responsive", async ({
  page,
}) => {
  await page.goto("/components/chip-overflow");
  const trigger = page.getByRole("button", { name: "3 more Reviewers" });
  await trigger.focus();
  await trigger.press("Enter");
  const popup = page.getByRole("dialog", { name: "Reviewers" });
  const search = page.getByRole("searchbox", { name: "Search Reviewers" });
  await search.fill("Robin");
  await expect(popup.locator(".fa-chip-overflow-list li")).toHaveCount(1);
  await expect(popup).toContainText("Robin Marsh");
  await search.fill("no matching person");
  await expect(popup).toContainText("No matches");
  await search.press("Escape");
  await expect(search).toHaveValue("");
  await expect(popup).toBeVisible();
  await search.press("Escape");
  await expect(trigger).toBeFocused();
  await trigger.press("Enter");
  await expect(search).toHaveValue("");
});

test("meter cells retain flex width, exact readings and narrow-track behaviour @responsive", async ({
  page,
}) => {
  await page.goto("/components/meter-cell");
  const narrow = page.getByRole("meter", { name: "Seats used" });
  await expect(narrow).toHaveAttribute("aria-valuetext", "8 / 10");
  const box = await narrow.locator("..").evaluate((element) => {
    const parent = element.parentElement!;
    parent.style.display = "flex";
    const outer = parent.getBoundingClientRect();
    const cell = element.getBoundingClientRect();
    const reading = element
      .querySelector(".fa-meter-value")!
      .getBoundingClientRect();
    return {
      parentWidth: outer.width,
      cellWidth: cell.width,
      readingWidth: reading.width,
      trackDisplay: getComputedStyle(element.querySelector(".fa-meter-track")!)
        .display,
    };
  });
  expect(box.cellWidth).toBeGreaterThan(0);
  expect(box.cellWidth).toBeCloseTo(box.parentWidth, 0);
  expect(box.readingWidth).toBeLessThanOrEqual(box.cellWidth);
  expect(box.trackDisplay).toBe("none");
});

test("JSON tree supports parent-child keys, typeahead and one tab stop @responsive", async ({
  page,
}) => {
  await page.goto("/components/json-tree");
  const tree = page.getByRole("tree", {
    name: "Sample exhibition configuration",
  });
  const root = tree.getByRole("treeitem", {
    name: "object, 4 keys",
    exact: true,
  });
  await root.focus();
  await root.press("ArrowRight");
  await expect(
    tree.getByRole("treeitem", { name: "title: Meridian", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("a");
  const access = tree.getByRole("treeitem", {
    name: "access: object, 1 key",
    exact: true,
  });
  await expect(access).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(access).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("ArrowRight");
  await expect(
    tree.getByRole("treeitem", { name: "public: true", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(access).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(access).toHaveAttribute("aria-expanded", "false");
  await expect(tree.locator('[role="treeitem"][tabindex="0"]')).toHaveCount(1);
});

test("date/time asks use the stated zone and shared radio keyboard paths @responsive", async ({
  page,
}) => {
  await page.goto("/components/date-time-ask");
  await expect(page.locator("#date-time-ask")).toContainText(
    "Australia/Hobart",
  );
  await expect(
    page
      .locator("#date-time-ask")
      .getByRole("textbox", { name: "Date", exact: true }),
  ).toBeVisible();
  const accessibility = await new AxeBuilder({ page })
    .include("#date-time-ask")
    .analyze();
  expect(accessibility.violations).toEqual([]);
  const group = page
    .locator("#date-time-ask")
    .getByRole("radiogroup", { name: "Suggested times" });
  const first = group.getByRole("radio").first();
  await first.focus();
  await first.press("Space");
  await expect(first).toHaveAttribute("aria-checked", "true");
  await first.press("ArrowRight");
  await expect(group.getByRole("radio").nth(1)).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await page
    .locator("#date-time-ask")
    .getByRole("button", { name: "Schedule", exact: true })
    .click();
  await expect(page.locator("#date-time-ask .fa-ai-ask-record")).toContainText(
    "Scheduled",
  );
});

test("entity asks use shared combobox keyboard selection @responsive", async ({
  page,
}) => {
  await page.goto("/components/entity-picker-ask");
  const input = page.locator("#entity-picker-ask").getByRole("combobox");
  await input.fill("NST-C106");
  await input.press("ArrowDown");
  await expect(
    page.getByRole("option").filter({ visible: true }).first(),
  ).toBeVisible();
  await input.press("Enter");
  const submit = page
    .locator("#entity-picker-ask .fa-ai-ask-footer")
    .getByRole("button", { name: "Use this endpoint", exact: true });
  await expect(submit).toBeEnabled();
  await submit.click();
  await expect(
    page.locator("#entity-picker-ask .fa-ai-ask-record"),
  ).toContainText("Chose");
});

test("desktop identity and badge stay visible over imagery @responsive", async ({
  page,
}, testInfo) => {
  await page.goto("/components/desktop-session");
  const badge = page.locator("#examples .fa-ai-desktop-badge");
  await expect(badge).toContainText("AI in control");
  const geometry = await badge.evaluate((element) => {
    const parent = element
      .closest(".fa-ai-desktop-screen")!
      .getBoundingClientRect();
    const rect = element.getBoundingClientRect();
    return {
      position: getComputedStyle(element).position,
      left: rect.left,
      right: rect.right,
      top: rect.top,
      bottom: rect.bottom,
      parentLeft: parent.left,
      parentRight: parent.right,
      parentTop: parent.top,
      parentBottom: parent.bottom,
    };
  });
  expect(geometry.position).toBe("absolute");
  expect(geometry.left).toBeGreaterThan(geometry.parentLeft);
  expect(geometry.right).toBeLessThan(geometry.parentRight);
  expect(geometry.bottom).toBeLessThan(geometry.parentBottom);
  await expect(page.locator("#examples .fa-ai-desktop-meta")).toContainText(
    "Mira Rowan",
  );
  await expect(
    page
      .locator("#examples")
      .getByRole("button", { name: "Stop", exact: true }),
  ).toBeVisible();
  await page.locator("#examples .fa-ai-desktop").screenshot({
    path: `.handoff/adoption-audit-20261015/generic-desktop-session-${testInfo.project.name}.png`,
  });
});

test("tab bar retains five touch targets inside a narrow container @responsive", async ({
  page,
}) => {
  await page.goto("/components/tab-bar");
  const bar = page.locator("#tab-bar").getByRole("navigation", {
    name: "Main (specimen)",
    exact: true,
  });
  for (const width of [280, 350]) {
    const bounds = await bar.evaluate((element, requested) => {
      const bar = element as HTMLElement;
      bar.style.width = `${Math.min(requested, document.documentElement.clientWidth - 32)}px`;
      const rect = bar.getBoundingClientRect();
      return {
        left: rect.left,
        right: rect.right,
        rows: [...bar.querySelectorAll<HTMLElement>(".fa-tabbar-item")].map(
          (item) => {
            const box = item.getBoundingClientRect();
            return {
              left: box.left,
              right: box.right,
              width: box.width,
              height: box.height,
            };
          },
        ),
      };
    }, width);
    expect(bounds.rows).toHaveLength(5);
    for (const row of bounds.rows) {
      expect(row.left).toBeGreaterThanOrEqual(bounds.left);
      expect(row.right).toBeLessThanOrEqual(bounds.right);
      expect(row.width).toBeGreaterThanOrEqual(44);
      expect(row.height).toBeGreaterThanOrEqual(44);
    }
  }
});

test("tone markers use semantic colours and honor reduced motion @responsive", async ({
  page,
}) => {
  await page.goto("/components/tone-dot");
  await expect(
    page.locator("#tone-dot .fa-status-dot[data-marker='dot'][aria-label]"),
  ).toHaveCount(7);
  const colours = await page
    .locator("#tone-dot .fa-status-dot[data-marker='dot'][aria-label]")
    .evaluateAll((elements) =>
      elements.map((element) => {
        const tone = element.getAttribute("data-tone")!;
        const probe = document.createElement("span");
        probe.style.backgroundColor = `var(--${tone === "data" ? "chart-1" : tone === "neutral" ? "fg-subtle" : tone})`;
        element.parentElement!.append(probe);
        const rect = element.getBoundingClientRect();
        const result = {
          tone,
          colour: getComputedStyle(element).backgroundColor,
          expected: getComputedStyle(probe).backgroundColor,
          width: rect.width,
          height: rect.height,
        };
        probe.remove();
        return result;
      }),
    );
  expect(colours).toHaveLength(7);
  for (const marker of colours) {
    expect(marker.colour).toBe(marker.expected);
    expect(marker.width).toBeGreaterThan(0);
    expect(marker.height).toBe(marker.width);
  }
  await page.evaluate(() => {
    document.documentElement.dataset.motion = "reduced";
  });
  const motion = await page
    .locator("#tone-dot .fa-status-dot[data-marker='pulse']")
    .first()
    .evaluate((element) => ({
      duration: getComputedStyle(element, "::after").animationDuration,
      iterations: getComputedStyle(element, "::after").animationIterationCount,
    }));
  expect(motion.iterations).toBe("1");
  expect(parseFloat(motion.duration)).toBeLessThan(0.001);
});

test("window chooser uses a bottom sheet with native row activation @responsive", async ({
  page,
}, testInfo) => {
  await page.goto("/components/window-switcher");
  await page
    .locator("#window-switcher")
    .getByRole("button", { name: "Switch window", exact: true })
    .click();
  const sheet = page.getByRole("dialog", { name: "Windows", exact: true });
  await expect(sheet).toBeVisible();
  await expect(sheet).toHaveAttribute("data-edge", "bottom");
  const geometry = await sheet.boundingBox();
  expect(geometry!.x).toBeGreaterThanOrEqual(0);
  expect(geometry!.x + geometry!.width).toBeLessThanOrEqual(
    page.viewportSize()!.width + 1,
  );
  await sheet.getByRole("button", { name: /^Exhibition notes/ }).focus();
  await page.keyboard.press("Enter");
  await expect(sheet).toBeHidden();
  await page
    .locator("#window-switcher")
    .getByRole("button", { name: "Switch window", exact: true })
    .click();
  await expect(sheet).toBeVisible();
  await sheet.screenshot({
    path: `.handoff/adoption-audit-20261015/generic-window-switcher-${testInfo.project.name}.png`,
  });
});

test("assistant result charts share keyboard readouts and table access @responsive", async ({
  page,
}, testInfo) => {
  await page.goto("/components/result-chart");
  const chart = page.locator("#result-chart .fa-chart");
  await expect(chart).toHaveAttribute("data-tier", /compact|full/);
  const height = await page
    .locator("#result-chart .fa-ai-result-chart")
    .evaluate((element) => element.getBoundingClientRect().height);
  expect(height).toBeGreaterThan(100);
  if ((await chart.getAttribute("data-tier")) === "full") {
    const plot = chart.getByRole("slider");
    await expect(plot).toBeVisible();
    await plot.focus();
    const initial = Number(await plot.getAttribute("aria-valuenow"));
    await plot.press("ArrowLeft");
    await expect(plot).toHaveAttribute(
      "aria-valuenow",
      String(Math.max(0, initial - 1)),
    );
    await expect(plot).toHaveAttribute("aria-valuetext", /ms/);
    await page
      .locator("#result-chart")
      .getByRole("button", { name: "View as table", exact: true })
      .click();
    await expect(chart.locator("[data-chart-table='visible']")).toBeVisible();
    await expect(
      chart.locator("[data-chart-table='visible'] tbody tr"),
    ).not.toHaveCount(0);
  } else {
    // Compact plots are passive by the shared chart contract. Their complete data stays accessible.
    await expect(chart.getByRole("slider")).toHaveCount(0);
    const fallback = chart.locator("[data-chart-table='fallback']");
    await expect(fallback).toContainText("ms");
    await expect(fallback.locator("tbody tr")).not.toHaveCount(0);
    await expect(chart.getByRole("table")).toHaveCount(1);
  }
  await page.locator("#result-chart .fa-ai-result").screenshot({
    path: `.handoff/adoption-audit-20261015/generic-result-chart-${testInfo.project.name}.png`,
  });
});

test("compact fact labels reveal the full text on keyboard focus @responsive", async ({
  page,
}) => {
  await page.goto("/components/fact-list");
  const label = "Document identifier with a long descriptive label";
  const text = page
    .locator("#examples .fa-fact-list dt .fa-truncate")
    .filter({ hasText: label });
  await expect(text).toHaveAttribute("data-truncated", "");
  await text.focus();
  await expect(page.getByRole("tooltip")).toHaveText(label);
});
