import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// A topology node is named by the label and detail it shows (WCAG 2.5.3), even at a zoom that
// hides them; describeNode's sentence is its description (#34).
test("topology nodes are named by what they show and pass axe @responsive", async ({ page }) => {
  await page.goto("./components/topology-canvas");
  const office = page.getByTestId("topology-office");
  const node = office.locator('[data-node-id="10.13.4.77"]');
  await expect(node).toHaveAttribute("role", "option", { timeout: 30_000 });
  await expect(node).toHaveAccessibleName("10.13.4.77");
  await expect(node).toHaveAccessibleDescription("Computer 10.13.4.77, Offline");
  const result = await new AxeBuilder({ page }).include('[data-testid="topology-office"]').analyze();
  expect(result.violations.map((violation) => `${violation.id}: ${violation.nodes.map((n) => n.target).join(" | ")}`)).toEqual([]);
});
