import { expect, test, type Locator } from "@playwright/test";

function sliderRoot(slider: Locator) {
  return slider.locator(
    "xpath=ancestor::*[contains(concat(' ', normalize-space(@class), ' '), ' fa-slider ')]",
  );
}

async function expectThumbAligned(slider: Locator) {
  await expect
    .poll(() =>
      slider.evaluate((input) => {
        const root = input.closest(".fa-slider")!;
        const control = root
          .querySelector(".fa-slider-control")!
          .getBoundingClientRect();
        const thumb = input
          .closest(".fa-slider-thumb")!
          .getBoundingClientRect();
        const min = Number(input.getAttribute("min"));
        const max = Number(input.getAttribute("max"));
        const value = Number(input.getAttribute("aria-valuenow"));
        const expected =
          control.left +
          thumb.width / 2 +
          ((control.width - thumb.width) * (value - min)) / (max - min);
        return Math.abs(thumb.left + thumb.width / 2 - expected);
      }),
    )
    .toBeLessThan(1);
}

test("an initially hidden slider measures when revealed and accepts keyboard input @responsive", async ({
  page,
}) => {
  // A retained inactive settings panel has no layout during the initial commit.
  // Insert that condition before the real production module can mount, without
  // changing the component or relying on React's development effect replay.
  await page.route("**/components/slider", async (route) => {
    const response = await route.fetch();
    const html = await response.text();
    await route.fulfill({
      response,
      body: html.replace(
        "<head>",
        '<head><style id="slider-initially-hidden">.fa-slider{display:none!important}</style>',
      ),
    });
  });
  await page.goto("components/slider");
  const slider = page.getByRole("slider", {
    name: "Volume md",
    exact: true,
    includeHidden: true,
  });
  await expect(slider).toBeAttached();
  const root = sliderRoot(slider);
  await expect(root).toBeHidden();
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  await page
    .locator("#slider-initially-hidden")
    .evaluate((style) => style.remove());
  await expect
    .poll(() =>
      root
        .locator(".fa-slider-control")
        .evaluate((element) => element.getBoundingClientRect().width),
    )
    .toBeGreaterThan(0);
  await expect(slider).toBeVisible();
  await root.evaluate((element) => {
    element.style.width = "140px";
  });
  await expectThumbAligned(slider);
  await root.evaluate((element) => {
    element.style.width = "220px";
  });
  await expectThumbAligned(slider);
  await slider.focus();
  await slider.press("ArrowRight");
  await expect(slider).toHaveAttribute("aria-valuenow", "65");
  await slider.press("Home");
  await expect(slider).toHaveAttribute("aria-valuenow", "0");
  await slider.press("End");
  await expect(slider).toHaveAttribute("aria-valuenow", "100");
  await root.locator(".fa-slider-control").click();
  await expect(slider).toHaveAttribute("aria-valuenow", "50");

  const field = page.getByRole("region", { name: "In a field", exact: true });
  const start = field.getByRole("slider", {
    name: "Window starts",
    exact: true,
  });
  const end = field.getByRole("slider", { name: "Window ends", exact: true });
  await expect(start).toBeVisible();
  await expect(end).toBeVisible();
  await start.press("ArrowRight");
  await expect(start).toHaveAttribute("aria-valuenow", "2");
  await end.press("ArrowLeft");
  await expect(end).toHaveAttribute("aria-valuenow", "4");
  await expectThumbAligned(start);
  await expectThumbAligned(end);
});

test("a controlled slider in a retained tab preserves its value across hide and reveal @responsive", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
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
  await page.goto("components/slider");
  const example = page.getByRole("region", {
    name: "Initially hidden controls",
    exact: true,
  });
  const slider = example.getByRole("slider", {
    name: "Retained volume",
    exact: true,
    includeHidden: true,
  });
  await expect(slider).toBeAttached();
  await expect(slider).toBeHidden();
  await example.getByRole("tab", { name: "Controls", exact: true }).click();
  await expect(slider).toBeVisible();
  await slider.press("ArrowRight");
  await expect(slider).toHaveAttribute("aria-valuenow", "41");
  await example.getByRole("tab", { name: "Summary", exact: true }).click();
  await expect(slider).toBeHidden();
  await example.getByRole("tab", { name: "Controls", exact: true }).click();
  await expect(slider).toBeVisible();
  await expect(slider).toHaveAttribute("aria-valuenow", "41");
  await expectThumbAligned(slider);
  await example.screenshot({
    path: info.outputPath("retained-slider-390.png"),
  });
});
