import { expect, test, type Page } from "@playwright/test";

/*
 * Panel compact and Surface padding="compact" read --inset-panel-compact. The actual insets are
 * measured, not the data attribute: smaller than the regular inset under comfortable and compact
 * density, scaling with the UI scale, and a compact panel never tightens a panel nested in it.
 */

async function open(page: Page, appearance: Record<string, unknown>, path = "/components/panel") {
  await page.addInitScript(
    (value) => localStorage.setItem("glass-ux.appearance.v1", JSON.stringify({ motion: "reduced", mode: "light", ...value })),
    appearance,
  );
  await page.goto(path);
  await expect(page.locator('.fa-panel[aria-label="Dense inset"], .fa-surface[data-padding="compact"]').first()).toBeAttached({ timeout: 30_000 });
}

const insets = (page: Page, label: string) =>
  page.locator(`.fa-panel[aria-label="${label}"]`).evaluate((panel) => {
    const px = (value: string) => parseFloat(value);
    const body = getComputedStyle(panel.querySelector(".fa-panel-body")!);
    const header = getComputedStyle(panel.querySelector(".fa-panel-header")!);
    const footer = panel.querySelector(".fa-panel-footer");
    return {
      body: { inline: px(body.paddingInlineStart), block: px(body.paddingBlockStart) },
      header: { inline: px(header.paddingInlineStart), top: px(header.paddingBlockStart) },
      footerBottom: footer ? px(getComputedStyle(footer).paddingBlockEnd) : null,
      token: getComputedStyle(panel).getPropertyValue("--inset-panel-compact").trim(),
    };
  });

for (const [density, regular, compact] of [["comfortable", 20, 12], ["compact", 16, 8]] as const)
  test(`compact is tighter than regular under ${density} density`, async ({ page }) => {
    await open(page, { density });
    const a = await insets(page, "Standard inset");
    const b = await insets(page, "Dense inset");
    expect(a.body.inline).toBe(regular);
    expect(b.body.inline).toBe(compact);
    expect(b.header.inline).toBe(compact);
    expect(b.header.top).toBe(compact);
    expect(b.footerBottom).toBe(compact);
    expect(b.body.inline).toBeLessThan(a.body.inline);
  });

test("compact follows the UI scale", async ({ page }) => {
  await open(page, { density: "comfortable", uiScale: 1.25 });
  const b = await insets(page, "Dense inset");
  expect(b.body.inline).toBe(15);
});

test("Surface padding compact reads the token", async ({ page }) => {
  await open(page, { density: "comfortable" }, "/components/surface");
  const padding = await page.locator('.fa-surface[data-padding="compact"]').first().evaluate((node) => getComputedStyle(node).paddingInlineStart);
  expect(padding).toBe("12px");
});

test("a compact panel does not tighten a panel nested in it", async ({ page }) => {
  await open(page, { density: "comfortable" });
  const nested = await page.evaluate(() => {
    const outer = document.querySelector('.fa-panel[aria-label="Dense inset"]')!;
    const inner = outer.cloneNode(false) as HTMLElement;
    inner.removeAttribute("data-compact");
    inner.removeAttribute("aria-label");
    inner.innerHTML = '<div class="fa-panel-body" id="nested-body">x</div>';
    outer.querySelector(".fa-panel-body")!.append(inner);
    return getComputedStyle(document.getElementById("nested-body")!).paddingInlineStart;
  });
  expect(nested).toBe("20px");
});
