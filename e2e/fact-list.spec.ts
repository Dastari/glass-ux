import { expect, test } from "@playwright/test"

/* FactList rows (#21): one set of columns for every row, values centred, hairlines between rows. */

test("rows share their columns, centre values and draw a hairline between rows @responsive", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("glass-ux.appearance.v1", JSON.stringify({ motion: "reduced", mode: "light" })))
  await page.goto("/components/fact-list")
  const list = page.getByTestId("fact-rows").locator(".fa-fact-list")
  await expect(list).toBeVisible({ timeout: 30_000 })
  const measure = () =>
    list.evaluate((element) =>
      [...element.children].map((row) => {
        const [icon, label, value] = [row.querySelector(".fa-fact-list-icon")!, row.querySelector("dt .fa-truncate")!, row.querySelector("dd")!].map((part) => part.getBoundingClientRect())
        const box = row.getBoundingClientRect()
        return { icon: icon.left, label: label.left, value: value.left, valueMiddle: value.top + value.height / 2, rowMiddle: box.top + box.height / 2, border: getComputedStyle(row).borderBottomWidth, labelWidth: value.left - label.left, width: box.width }
      }),
    )
  const check = async () => {
    const rows = await measure()
    expect(rows.length).toBe(5)
    for (const row of rows) {
      expect(Math.abs(row.icon - rows[0]!.icon)).toBeLessThanOrEqual(0.5)
      expect(Math.abs(row.label - rows[0]!.label)).toBeLessThanOrEqual(0.5)
      expect(Math.abs(row.value - rows[0]!.value)).toBeLessThanOrEqual(0.5)
      expect(Math.abs(row.valueMiddle - row.rowMiddle)).toBeLessThanOrEqual(1)
    }
    expect(rows.slice(0, -1).every((row) => row.border !== "0px")).toBe(true)
    expect(rows.at(-1)!.border).toBe("0px")
    return rows[0]!
  }
  const wide = await check()
  // In a narrow list the label column gives way to the values.
  await list.evaluate((element) => void (element.style.inlineSize = "15rem"))
  const narrow = await check()
  expect(narrow.labelWidth).toBeLessThan(wide.labelWidth)
  expect(narrow.labelWidth).toBeLessThanOrEqual(narrow.width * 0.45)
})
