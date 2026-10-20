import { expect, test, type Locator } from "@playwright/test";

// The formatting locale (src/lib/locale): the docs page sets <html lang="en-AU">, so components
// format the Australian way without configuration; a LocaleProvider region formats the same
// stored values in its own locale, and follows a change of that locale in place.

async function expectValues(
  sample: Locator,
  values: { date: string; time: string; amount: string; count: string },
) {
  await expect(sample.getByLabel("Date", { exact: true })).toHaveValue(values.date);
  await expect(sample.getByLabel("Time", { exact: true })).toHaveValue(values.time);
  await expect(sample.getByLabel("Amount", { exact: true })).toHaveValue(values.amount);
  await expect(sample.getByLabel("Count", { exact: true })).toHaveValue(values.count);
}

test("the page's <html lang> formats Australian; a LocaleProvider region formats its own locale @responsive", async ({
  page,
}) => {
  await page.goto("/foundations/locale");
  await expect(page.locator("html")).toHaveAttribute("lang", "en-AU");

  const pageSample = page.locator('[data-locale-sample="en-AU"]');
  await expectValues(pageSample, {
    date: "03/10/2026",
    time: "9:05 pm",
    amount: "$1,234.50",
    count: "1,284.5",
  });

  const island = page.locator('[data-locale-sample="en-US"]');
  await expectValues(island, {
    date: "10/03/2026",
    time: "9:05 PM",
    amount: "$1,234.50",
    count: "1,284.5",
  });

  // Changing the provider's locale reformats the region in place; the page keeps en-AU.
  await page.getByRole("button", { name: "de-DE" }).click();
  const german = page.locator('[data-locale-sample="de-DE"]');
  await expectValues(german, {
    date: "03.10.2026",
    time: "21:05",
    amount: "1.234,50 $",
    count: "1.284,5",
  });
  await expect(pageSample.getByLabel("Date", { exact: true })).toHaveValue("03/10/2026");

  // Typing follows the region's locale: day.month.year in de-DE.
  const date = german.getByLabel("Date", { exact: true });
  await date.fill("4.11.2026");
  await date.press("Tab");
  await expect(date).toHaveValue("04.11.2026");
});

test("component pages keep Australian formats under <html lang=\"en-AU\">", async ({ page }) => {
  await page.goto("/components/date-field");
  await expect(
    page.getByTestId("time-form").getByRole("textbox", { name: "Depot opens" }),
  ).toHaveValue("7:30 am");
  await expect(page.getByPlaceholder("dd/mm/yyyy").first()).toBeVisible();
});
