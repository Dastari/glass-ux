import { expect, test } from "@playwright/test";

/*
 * WCAG 2.5.8: a chip's remove button is drawn 12-20 px, but its hit area reaches 24 x 24 CSS px
 * for every pointer. Neighbouring chips' areas meet without a real overlap: the rows of wrapped
 * compact chips are 22 px apart (about 20 at a 0.9 UI scale), so there two areas share a 2-4 px edge
 * and the later one wins it.
 */
for (const [density, uiScale] of [["comfortable", 1], ["compact", 1], ["compact", 0.9]] as const) {
  test(`chip remove buttons keep a 24 px hit area (${density}, ui scale ${uiScale})`, async ({ page }) => {
    await page.addInitScript(
      ([density, uiScale]) => localStorage.setItem("glass-ux.appearance.v1", JSON.stringify({ mode: "light", motion: "reduced", density, uiScale })),
      [density, uiScale],
    );
    await page.goto("./components/multi-select");
    const buttons = page.locator(".fa-chip .fa-chip-remove");
    await expect(buttons.first()).toBeVisible({ timeout: 30_000 });
    const result = await page.evaluate(() => {
      const boxes: { size: number; hits: boolean[]; overlaps: number }[] = [];
      for (const control of document.querySelectorAll<HTMLElement>(".fa-multi")) {
        const items = [...control.querySelectorAll<HTMLElement>(".fa-chip .fa-chip-remove")].filter((button) => button.getBoundingClientRect().width > 0 && !button.closest("[data-measure]"));
        if (!items.length) continue;
        // elementFromPoint only sees the viewport: bring the whole control into it.
        control.scrollIntoView({ block: "center", inline: "nearest" });
        const rects = items.map((button) => {
          const box = button.getBoundingClientRect();
          return { button, cx: box.left + box.width / 2, cy: box.top + box.height / 2, size: box.width };
        });
        for (const [index, entry] of rects.entries()) {
          const edge = 11.5;
          const hits = [[-edge, 0], [edge, 0], [0, -edge], [0, edge]].map(([dx, dy]) => {
            const target = document.elementFromPoint(entry.cx + dx!, entry.cy + dy!);
            // A neighbour's own remove area may own the shared edge of wrapped compact rows.
            return target === entry.button || entry.button.contains(target) || Boolean(target?.closest(".fa-chip-remove"));
          });
          let overlaps = 0;
          for (const other of rects.slice(index + 1)) {
            const shareX = 24 - Math.abs(entry.cx - other.cx);
            const shareY = 24 - Math.abs(entry.cy - other.cy);
            if (shareX > 0 && shareY > 0) overlaps = Math.max(overlaps, Math.min(shareX, shareY));
          }
          boxes.push({ size: Math.round(entry.size * 10) / 10, hits, overlaps });
        }
      }
      return boxes;
    });
    expect(result.length).toBeGreaterThan(0);
    // Buttons drawn smaller than the target keep their size; every one reaches 24 px.
    expect(result.some((entry) => entry.size < 24)).toBe(true);
    for (const entry of result) {
      expect(entry.hits, JSON.stringify(entry)).toEqual([true, true, true, true]);
      expect(entry.overlaps, JSON.stringify(entry)).toBeLessThanOrEqual(5);
    }
  });
}
