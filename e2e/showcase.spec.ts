import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("studio demo supports live updates, projects, search and details @responsive", async ({
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
          avatars.length >= 7 &&
          avatars.every((avatar) => {
            const image = avatar.querySelector("img");
            return image?.complete && image.naturalWidth > 0;
          }),
      ),
    )
    .toBe(true);
  await studio
    .getByRole("button", { name: "New project", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "New project" });
  await expect(
    dialog.getByRole("button", { name: "Create project", exact: true }),
  ).toBeDisabled();
  await dialog.getByRole("textbox", { name: "Project name" }).fill(" ");
  await dialog.getByRole("textbox", { name: "Project name" }).press("Tab");
  await expect(dialog).toContainText("Give your project a name.");
  await dialog
    .getByRole("textbox", { name: "Project name" })
    .fill("Atlas field guide");
  await dialog
    .getByRole("button", { name: "Create project", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await studio
    .getByRole("button", { name: "Open Atlas field guide", exact: true })
    .click();
  const details = page.getByRole("dialog", {
    name: "Atlas field guide",
    exact: true,
  });
  await expect(details).toContainText("Avery Quinn");
  await expect(details.locator(".fa-avatar-image")).toBeVisible();
  await details.getByRole("button", { name: "Back to workspace" }).click();
  const search = studio.getByRole("searchbox");
  if (!(await search.isVisible()))
    await studio
      .getByRole("button", { name: /Search/ })
      .first()
      .click();
  await search.fill("Observatory");
  await expect(
    studio.getByRole("button", { name: "Open The Observatory", exact: true }),
  ).toBeVisible();
  await expect(
    studio.getByRole("button", { name: "Open Atlas field guide", exact: true }),
  ).toHaveCount(0);
  await search.fill("");
  await studio.getByRole("button", { name: "Projects", exact: true }).click();
  await expect(studio.locator(".showcase-metrics")).toHaveCount(0);
  await studio.getByRole("button", { name: "Overview", exact: true }).click();
  await studio.getByRole("button", { name: "Month", exact: true }).click();
  await expect(studio).toContainText("This month");
  await expect(studio).toContainText("Last month");
  const live = studio.getByRole("switch", { name: "Live demo" });
  await live.click();
  await expect(studio).toContainText("Live updates paused");
  await page.clock.install();
  const before = await studio.getByTestId("live-tick").textContent();
  await page.clock.fastForward(6000);
  await expect(studio.getByTestId("live-tick")).toHaveText(before!);
  await live.click();
  await page.clock.fastForward(6000);
  await expect(studio.getByTestId("live-tick")).not.toHaveText(before!);
  expect(errors).toEqual([]);
});

test("assistant streams, stops, and adds an approved checklist to the phone @responsive", async ({
  page,
}) => {
  await page.goto("./#assistant");
  const assistant = page.getByTestId("studio-assistant");
  const phone = page.getByTestId("mobile-preview");
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
