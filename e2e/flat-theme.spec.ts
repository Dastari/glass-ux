import { expect, test, type Page } from "@playwright/test";

/** The header switch on desktop; the Visual style choice in the Appearance sheet on phones. */
async function chooseStyle(page: Page, style: "Flat" | "Glass") {
  const header = page.locator(".docs-style-switch").filter({ visible: true });
  if (await header.count()) {
    await header.getByRole("button", { name: style, exact: true }).click();
    return;
  }
  await page.getByRole("button", { name: "Appearance", exact: true }).click();
  await page
    .getByRole("group", { name: "Visual style", exact: true })
    .getByRole("button", { name: style, exact: true })
    .click();
  await page.keyboard.press("Escape");
}

for (const mode of ["light", "dark"] as const) {
  test(`Flat keeps palette, geometry and project state across comparisons (${mode}) @responsive`, async ({ page }, info) => {
    await page.addInitScript((mode) => {
      if (localStorage.getItem("glass-ux.appearance.v1")) return;
      localStorage.setItem("glass-ux.appearance.v1", JSON.stringify({
        mode, style: "flat",
        palette: mode === "light" ? "ocean" : "rose",
        density: mode === "light" ? "comfortable" : "compact",
        glass: "full", background: "waves", motion: "full",
        uiScale: mode === "light" ? 1 : 1.125,
        radiusScale: 1, borderWidth: 1.5,
      }));
    }, mode);
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-style", "flat");
    const studio = page.getByTestId("studio-workspace");
    const primary = studio.getByRole("button", { name: "New project", exact: true });
    await expect(primary).toBeVisible();
    expect(await primary.evaluate((el) => ({ image: getComputedStyle(el).backgroundImage, shadow: getComputedStyle(el).boxShadow }))).toEqual({ image: "none", shadow: "none" });
    const panel = studio.locator(".fa-panel").first();
    const geometry = await panel.evaluate((el) => {
      const style = getComputedStyle(el);
      const body = el.querySelector(".fa-panel-body");
      return { blur: style.backdropFilter, radius: parseFloat(style.borderRadius), border: parseFloat(style.borderTopWidth), inset: body ? parseFloat(getComputedStyle(body).paddingInlineStart) : null };
    });
    expect(geometry.blur).toBe("none");
    expect(geometry.radius).toBeCloseTo(mode === "light" ? 10 : 11.25, 1);
    expect(geometry.border).toBeGreaterThan(0);
    if (geometry.inset !== null) expect(geometry.inset).toBeCloseTo(mode === "light" ? 20 : 18, 1);

    await studio.getByRole("button", { name: "Projects", exact: true }).click();
    const table = studio.locator(".fa-dt");
    await expect(table).toBeVisible();
    await table.evaluate((el) => el.setAttribute("data-comparison-state", "retained"));
    await chooseStyle(page, "Glass");
    await expect(page.locator("html")).toHaveAttribute("data-glass", "full");
    await expect(page.locator("html")).toHaveAttribute("data-background", "waves");
    await expect(page.locator("html")).toHaveAttribute("data-motion", "full");
    await chooseStyle(page, "Flat");
    await expect(table).toHaveAttribute("data-comparison-state", "retained");
    await expect(page.locator("html")).toHaveAttribute("data-glass", "solid");
    await expect(page.locator("html")).toHaveAttribute("data-motion", "reduced");
    await expect(page.locator("html")).toHaveAttribute("data-palette", mode === "light" ? "ocean" : "rose");
    expect(await page.locator(".docs-content").evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    await primary.click();
    const dialog = page.getByRole("dialog", { name: "New project", exact: true });
    await expect(dialog).toBeVisible();
    const name = dialog.getByRole("textbox", { name: "Project name", exact: true });
    await name.focus();
    expect(await name.evaluate((el) => getComputedStyle(el.closest(".fa-control")!).outlineStyle)).toBe("solid");
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(primary).toBeFocused();
    await page.screenshot({ path: info.outputPath(`flat-${mode}.png`), fullPage: true });
    await chooseStyle(page, "Glass");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-style", "glass");
    await chooseStyle(page, "Flat");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-style", "flat");
  });
}

test("Flat canvas uses the darker colour across every palette and mode island @responsive", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("studio-workspace")).toBeVisible();
  const colours = await page.evaluate((palettes) => {
    const root = document.documentElement;
    const probe = document.createElement("div");
    probe.style.backgroundColor = "var(--canvas)";
    document.body.append(probe);
    const results = [];
    for (const palette of palettes) {
      root.dataset.palette = palette;
      for (const mode of ["light", "dark"]) {
        root.dataset.mode = mode;
        for (const style of ["flat", "glass"]) {
          root.dataset.style = style;
          const colour = getComputedStyle(probe).backgroundColor;
          const hue = Number(getComputedStyle(root).getPropertyValue("--neutral-h"));
          const island = document.createElement("div");
          island.dataset.mode = mode === "dark" ? "light" : "dark";
          island.dataset.palette = palette;
          island.style.backgroundColor = "var(--canvas)";
          probe.append(island);
          results.push({ palette, mode, style, colour, hue, island: getComputedStyle(island).backgroundColor });
          island.remove();
        }
      }
    }
    probe.remove();
    return results;
  }, ["ocean", "aurora", "emerald", "sunset", "graphite", "ruby", "lagoon", "indigo", "rose", "moss", "sand", "slate"]);
  for (const { palette, mode, style, colour, hue, island } of colours) {
    const expected = (dark: boolean) => {
      const lightness = dark ? { flat: 0.18, glass: 0.17 } : { flat: 0.985, glass: 0.94 };
      const chroma = dark ? 0.022 : style === "flat" ? 0.005 : 0.016;
      return `oklch(${lightness[style as "flat" | "glass"]} ${chroma} ${hue})`;
    };
    expect(colour, `${palette} ${mode} ${style}`).toBe(expected(mode === "dark"));
    expect(island, `${palette} ${mode} ${style} inverted island`).toBe(expected(mode !== "dark"));
  }
});
