import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const palette = async (page: Page, query: string) => {
  await page.keyboard.press("ControlOrMeta+k");
  const search = page.getByRole("combobox", { name: "Search commands" });
  await expect(search).toBeFocused();
  await search.fill(query);
  return page.getByRole("dialog", { name: "Command palette" });
};

test("studio demo creates a project with typed fields and groups it by status @responsive", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Glass UX");
  const studio = page.getByTestId("studio-workspace");
  await expect
    .poll(() =>
      studio.locator(".fa-avatar:not(.fa-avatar-more)").evaluateAll(
        (avatars) =>
          avatars.length >= 4 &&
          avatars.every((avatar) => {
            const image = avatar.querySelector("img");
            return image?.complete && image.naturalWidth > 0;
          }),
      ),
    )
    .toBe(true);
  // Two chart families on the overview: the hours trend and hours by discipline.
  await expect(
    studio.getByRole("figure", { name: "Studio hours over time" }),
  ).toBeVisible();
  await expect(
    studio.getByRole("figure", { name: "Logged hours by discipline" }),
  ).toBeVisible();
  await expect(studio).toContainText("Hours by discipline");
  await studio.getByRole("button", { name: "Month", exact: true }).click();
  await expect(studio).toContainText("This month");

  await studio
    .getByRole("button", { name: "New project", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "New project" });
  const create = dialog.getByRole("button", {
    name: "Create project",
    exact: true,
  });
  await expect(create).toBeDisabled();
  const name = dialog.getByRole("textbox", { name: "Project name" });
  await name.fill(" ");
  await name.press("Tab");
  await expect(dialog).toContainText("Give your project a name.");
  await name.fill("Atlas field guide");
  await expect(
    dialog.getByRole("textbox", { name: "Next milestone" }),
  ).not.toHaveValue("");
  const tags = dialog.getByRole("combobox", { name: "Tags" });
  await tags.fill("Signage");
  await tags.press("Enter");
  await expect(dialog).toContainText("Signage");
  // The footer stays reachable when the form is taller than a phone screen.
  await create.scrollIntoViewIfNeeded();
  await create.click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByText("Atlas field guide created")).toBeVisible();

  await studio.getByRole("button", { name: "Projects", exact: true }).click();
  await expect(studio.locator(".showcase-metrics")).toHaveCount(0);
  const complete = studio.getByRole("button", {
    name: /^Complete, 2 projects/,
  });
  await expect(complete).toHaveAttribute("aria-expanded", "false");
  await expect(studio.getByText("Cedar house")).toHaveCount(0);
  await complete.click();
  await expect(studio.getByText("Cedar house")).toBeVisible();
  await expect(
    studio.getByRole("button", { name: /^In progress, 5 projects/ }),
  ).toBeVisible();

  const search = studio.getByRole("searchbox");
  if (!(await search.isVisible()))
    await studio
      .getByRole("button", { name: /Search/ })
      .first()
      .click();
  await search.fill("Observatory");
  await expect(studio.getByText("The Observatory")).toBeVisible();
  await expect(studio.getByText("Atlas field guide")).toHaveCount(0);
  await search.fill("");
  await expect(studio.getByText("Atlas field guide")).toBeVisible();

  const live = studio.getByRole("switch", { name: "Live demo" });
  await studio.getByRole("button", { name: "Overview", exact: true }).click();
  await live.click();
  await expect(studio.getByTestId("live-hours")).toContainText("Paused");
  await live.click();
  await expect(studio.getByTestId("live-hours")).toContainText("Live sample");
  expect(errors).toEqual([]);
});

test("project actions are shared by the row menu, sheet header and command palette @responsive", async ({
  page,
}) => {
  await page.goto("./");
  const studio = page.getByTestId("studio-workspace");
  await studio.getByRole("button", { name: "Projects", exact: true }).click();
  await studio
    .getByRole("button", { name: "Actions for Meridian identity", exact: true })
    .click();
  const menu = page.getByRole("menu", {
    name: "Actions for Meridian identity",
  });
  await expect(menu.getByRole("menuitem", { name: "Archive" })).toBeVisible();
  await menu.getByRole("menuitem", { name: "Open project" }).click();
  const sheet = page.getByRole("dialog", {
    name: "Meridian identity",
    exact: true,
  });
  await expect(sheet).toContainText("Avery Quinn");
  await expect(sheet.locator(".fa-avatar-image").first()).toBeVisible();
  await sheet
    .getByRole("button", { name: "Request review", exact: true })
    .click();
  // The header confirms in place; the project's state changes everywhere.
  await expect(sheet).toContainText("Waiting for client review");
  await expect(sheet).toContainText("In review");
  await sheet.getByRole("tab", { name: /Files/ }).click();
  await expect(
    sheet.getByRole("tree", { name: "Meridian identity files" }),
  ).toContainText("Design");
  await sheet.getByRole("tab", { name: "Activity", exact: true }).click();
  await expect(
    sheet.locator(".fa-activity-feed li, ol li").first(),
  ).toBeVisible();
  // While the project is open, its actions are in the palette under its name.
  const commands = await palette(page, "complete");
  await expect(
    commands.getByRole("option", { name: /Mark complete/ }),
  ).toBeVisible();
  await commands.getByRole("option", { name: /Mark complete/ }).click();
  await expect(
    page.getByText("Meridian identity marked complete"),
  ).toBeVisible();
  await expect(sheet.getByRole("tab", { name: "Overview" })).toBeVisible();
  await sheet.getByRole("tab", { name: "Overview" }).click();
  await expect(sheet).toContainText("Complete");
  await sheet.getByRole("button", { name: "Back to workspace" }).click();
  await expect(sheet).toHaveCount(0);
  // Projects are commands too: the palette opens one by name.
  const projects = await palette(page, "Observ");
  await projects.getByRole("option", { name: /The Observatory/ }).click();
  await expect(
    page.getByRole("dialog", { name: "The Observatory", exact: true }),
  ).toContainText("Mira Chen");
  const axe = await new AxeBuilder({ page })
    .include('[role="dialog"]')
    .analyze();
  expect(axe.violations.map((item) => item.id)).toEqual([]);
});

test("assistant streams, stops, and adds an approved checklist to the phone @responsive", async ({
  page,
}) => {
  await page.goto("./#assistant");
  const assistant = page.getByTestId("studio-assistant");
  const phone = page.getByTestId("mobile-preview");
  await expect(phone.getByTestId("checklist-source")).toHaveText(
    "Review checklist",
  );
  const firstTask = phone.getByRole("checkbox", {
    name: "Review the visual direction",
  });
  const offset = async () =>
    (await firstTask.boundingBox())!.y - (await phone.boundingBox())!.y;
  const before = await offset();
  await assistant
    .getByRole("button", { name: "Prepare a review checklist", exact: true })
    .click();
  await expect(
    assistant.getByRole("button", { name: "Stop response", exact: true }),
  ).toBeVisible();
  await assistant
    .getByRole("button", { name: "Stop response", exact: true })
    .click();
  await expect(
    assistant.getByRole("button", { name: "Stop response", exact: true }),
  ).toHaveCount(0);
  await assistant
    .getByRole("button", { name: "Prepare a review checklist", exact: true })
    .click();
  await expect(
    assistant.getByRole("button", { name: "Stop response", exact: true }),
  ).toHaveCount(0);
  const dock = assistant.getByRole("region", {
    name: "Waiting for you",
    exact: true,
  });
  const expand = dock.getByRole("button", { name: "Expand", exact: true });
  if (await expand.isVisible()) await expand.click();
  await assistant
    .getByRole("button", { name: "Approve once", exact: true })
    .click();
  await expect(phone).toContainText("Added by your assistant");
  // The approval replaces the label in place: the tasks do not move.
  expect(await offset()).toBeCloseTo(before, 0);
  await expect(phone).toContainText("0 of 4 completed");
  await phone
    .getByRole("checkbox", { name: "Share the identity guidelines" })
    .check();
  await expect(phone).toContainText("1 of 4 completed");
  await phone.getByRole("button", { name: "People", exact: true }).click();
  await expect(phone).toContainText("Digital designer");
  await expect
    .poll(() =>
      phone.locator(".fa-avatar").evaluateAll(
        (avatars) =>
          avatars.length === 4 &&
          avatars.every((avatar) => {
            const image = avatar.querySelector("img");
            return image?.complete && image.naturalWidth > 0;
          }),
      ),
    )
    .toBe(true);
  await phone.getByRole("button", { name: "Tasks", exact: true }).click();
  await expect(
    phone.getByRole("checkbox", { name: "Share the identity guidelines" }),
  ).toBeChecked();
  await assistant
    .getByRole("button", { name: "How many hours?", exact: true })
    .click();
  await expect(
    assistant.getByRole("button", { name: "Stop response", exact: true }),
  ).toHaveCount(0);
  await expect(assistant).toContainText("504 hours");
  const input = assistant.getByRole("textbox", {
    name: "Ask the studio assistant",
  });
  await input.fill("Which projects are complete?");
  await assistant.getByRole("button", { name: "Send", exact: true }).click();
  await expect(input).toHaveValue("");
  await expect(assistant).toContainText("2 projects are complete");
  await expect(
    assistant.getByRole("button", { name: "Stop response", exact: true }),
  ).toHaveCount(0);
  await assistant.locator("[data-role='assistant']").last().hover();
  await assistant
    .getByRole("button", { name: "Open in a window", exact: true })
    .last()
    .click();
  const response = page.getByRole("dialog", {
    name: "Assistant response",
    exact: true,
  });
  await expect(response).toContainText("2 projects are complete");
  await response.getByRole("button", { name: "Back to conversation" }).click();
});

for (const width of [320, 390, 1440]) {
  for (const mode of ["light", "dark"] as const) {
    test(`${width}px ${mode}: themed showcase keeps geometry and scroll edges @responsive`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.addInitScript(
        (mode) =>
          localStorage.setItem(
            "glass-ux.appearance.v1",
            JSON.stringify({
              mode,
              palette: "emerald",
              glass: "solid",
              density: "compact",
              uiScale: 1.25,
              radiusScale: 0.6,
              borderWidth: 2,
              motion: "reduced",
            }),
          ),
        mode,
      );
      await page.goto("./");
      await expect(page.getByTestId("studio-workspace")).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      const geometry = await page.evaluate(() => {
        const tile = document.querySelector<HTMLElement>(
          ".showcase-metrics > .fa-surface",
        )!;
        const phone = document.querySelector<HTMLElement>(".showcase-phone")!;
        const panel = document.querySelector<HTMLElement>(
          ".showcase-dashboard-grid .fa-panel-body",
        )!;
        const content = document.querySelector<HTMLElement>(".docs-content")!;
        const measure = (token: string) => {
          const probe = document.createElement("div");
          probe.style.width = `var(${token})`;
          document.body.append(probe);
          const result = parseFloat(getComputedStyle(probe).width);
          probe.remove();
          return result;
        };
        return {
          page: document.documentElement.scrollWidth,
          viewport: innerWidth,
          contentWidth: content.clientWidth,
          contentScrollWidth: content.scrollWidth,
          tilePadding: parseFloat(getComputedStyle(tile).paddingLeft),
          tileInset: measure("--inset-tile"),
          tileRadius: parseFloat(getComputedStyle(tile).borderTopLeftRadius),
          radius: measure("--radius-tile"),
          phonePadding: parseFloat(getComputedStyle(phone).paddingLeft),
          panelInset: measure("--inset-panel"),
          bodyPadding: parseFloat(getComputedStyle(panel).paddingLeft),
          border: parseFloat(getComputedStyle(tile).borderTopWidth),
          phoneWidth: phone.getBoundingClientRect().width,
        };
      });
      expect(geometry.page).toBeLessThanOrEqual(geometry.viewport);
      expect(geometry.contentScrollWidth).toBeLessThanOrEqual(
        geometry.contentWidth + 1,
      );
      expect(geometry.tilePadding).toBeCloseTo(geometry.tileInset, 1);
      expect(geometry.phonePadding).toBeCloseTo(geometry.panelInset, 1);
      expect(geometry.bodyPadding).toBeCloseTo(geometry.panelInset, 1);
      expect(geometry.tileRadius).toBeCloseTo(geometry.radius, 1);
      expect(geometry.border).toBe(2);
      expect(geometry.phoneWidth).toBeLessThanOrEqual(width);
      const labels = await page
        .locator(".showcase-metrics .fa-metric-label")
        .evaluateAll((elements) =>
          elements.map((element) => ({
            display: getComputedStyle(element).display,
            clipped: element.scrollWidth > element.clientWidth + 1,
          })),
        );
      expect(
        labels.every((label) => label.display !== "none" && !label.clipped),
      ).toBe(true);
      const taskLabels = await page
        .locator(".showcase-task label")
        .evaluateAll((elements) =>
          elements.map((element) => ({
            whiteSpace: getComputedStyle(element).whiteSpace,
            height: element.getBoundingClientRect().height,
          })),
        );
      expect(
        taskLabels.every(
          (label) => label.whiteSpace === "normal" && label.height >= 44,
        ),
      ).toBe(true);
      const axe = await new AxeBuilder({ page }).analyze();
      expect(
        axe.violations.map(
          (item) =>
            `${item.id}: ${item.nodes.map((node) => node.target.join(" ")).join(", ")}`,
        ),
      ).toEqual([]);
      await page.getByTestId("mobile-preview").scrollIntoViewIfNeeded();
      await page.screenshot({
        path: `test-results/showcase-${width}-${mode}.png`,
      });
      await page.locator(".docs-content").evaluate((element) => {
        element.scrollTop = element.scrollHeight;
      });
      await expect(page.locator(".showcase-footer")).toBeVisible();
    });
  }
}

test("appearance controls change rendered showcase colours and geometry", async ({
  page,
}) => {
  await page.goto("./");
  const toolbar = page.getByRole("region", { name: "Appearance controls" });
  const title = page.locator(".showcase-studio-mark");
  const before = await title.evaluate(
    (element) => getComputedStyle(element).color,
  );
  await toolbar.getByRole("button", { name: "Ruby", exact: true }).click();
  await expect
    .poll(() => title.evaluate((element) => getComputedStyle(element).color))
    .not.toBe(before);
  const slider = page.getByRole("slider", {
    name: "Corner radius",
    exact: true,
  });
  await slider.focus();
  await page.keyboard.press("Home");
  await expect(page.locator(".showcase-phone")).toHaveCSS(
    "border-top-left-radius",
    "0px",
  );
  await page
    .getByRole("button", { name: "Reset geometry", exact: true })
    .click();
  await expect(page.locator(".showcase-phone")).not.toHaveCSS(
    "border-top-left-radius",
    "0px",
  );
});

test("studio projects reorder within their status group and keep the saved order", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "glass-ux.appearance.v1",
      JSON.stringify({ motion: "reduced" }),
    ),
  );
  await page.goto("./");
  const studio = page.getByTestId("studio-workspace");
  await studio.getByRole("button", { name: "Projects", exact: true }).click();
  const table = studio.locator(".fa-dt");
  const inProgress = () =>
    table.locator('[data-item="row"]').evaluateAll((rows) =>
      rows
        .toSorted(
          (a, b) =>
            Number((a as HTMLElement).dataset.index) -
            Number((b as HTMLElement).dataset.index),
        )
        .map(
          (row) =>
            row.querySelector(".showcase-project-name > span")?.textContent,
        )
        .slice(0, 4),
    );
  expect(await inProgress()).toEqual([
    "Meridian identity",
    "Fieldwork journal",
    "Sundial collection",
    "Tideline festival",
  ]);
  const grip = table.getByRole("button", {
    name: "Reorder Tideline festival",
  });
  await grip.focus();
  await page.keyboard.press("Alt+ArrowUp");
  await expect(table.locator(".fa-dt-announcer")).toHaveText(
    /Dropped Tideline festival at position 3 of 4/,
  );
  await expect(grip).toBeFocused();
  // The move saves into the demo's project list: it survives a view change.
  await expect(grip).not.toHaveAttribute("aria-disabled");
  await studio.getByRole("button", { name: "Overview", exact: true }).click();
  await studio.getByRole("button", { name: "Projects", exact: true }).click();
  expect(await inProgress()).toEqual([
    "Meridian identity",
    "Fieldwork journal",
    "Tideline festival",
    "Sundial collection",
  ]);
});
