import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const width of [320, 1440]) {
  for (const mode of ["light", "dark"] as const) {
    test(`${width}px ${mode}: account identity and menu remain usable with optional email @responsive`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.addInitScript(
        (mode) =>
          localStorage.setItem(
            "glass-ux.appearance.v1",
            JSON.stringify({
              mode,
              density: "compact",
              uiScale: 1.25,
              radiusScale: 0.6,
              borderWidth: 2,
              motion: "reduced",
            }),
          ),
        mode,
      );
      await page.goto("./components/account-button");
      const examples = page.getByRole("region", {
        name: "AccountButton: Account menu",
        exact: true,
      });
      const account = examples.getByRole("button", {
        name: "Account: Avery Quinn, 3 unread notifications",
        exact: true,
      });
      await expect(account).toBeInViewport();
      await expect(account.locator(".fa-shell-account-email")).toHaveText(
        "avery.quinn@orbit.example",
      );
      await expect
        .poll(() =>
          account
            .locator("img")
            .evaluate(
              (img) =>
                (img as HTMLImageElement).complete &&
                (img as HTMLImageElement).naturalWidth > 0,
            ),
        )
        .toBe(true);
      const nameOnly = examples.getByRole("button", {
        name: "Account: Mira Rowan",
        exact: true,
      });
      await expect(nameOnly.locator(".fa-shell-account-name")).toHaveText(
        "Mira Rowan",
      );
      await expect(nameOnly.locator(".fa-shell-account-email")).toHaveCount(0);
      await expect(
        examples
          .getByRole("button", { name: "Account: Casey Reed", exact: true })
          .locator("img"),
      ).toHaveCount(0);
      await expect(
        examples
          .getByRole("button", { name: "Account: Casey Reed", exact: true })
          .locator(".fa-avatar-initials"),
      ).toHaveText("CR");
      await account.focus();
      const before = await account.boundingBox();
      await account.press("ArrowDown");
      const read = page.getByRole("menuitem", {
        name: /Mark notifications read/,
      });
      await expect(read).toBeVisible();
      await page.keyboard.press("ArrowDown");
      await expect(read).toBeFocused();
      await page.keyboard.press("Enter");
      const updated = examples.getByRole("button", {
        name: "Account: Avery Quinn",
        exact: true,
      });
      await expect(updated).toBeFocused();
      await expect(updated.locator(".fa-shell-account-badge")).toHaveCount(0);
      const after = await updated.boundingBox();
      expect(after!.x).toBeCloseTo(before!.x, 1);
      expect(after!.y).toBeCloseTo(before!.y, 1);
      expect(after!.width).toBeCloseTo(before!.width, 1);
      expect(after!.height).toBeCloseTo(before!.height, 1);
      await updated.click();
      await page
        .getByRole("menuitem", { name: "View profile", exact: true })
        .click();
      const profile = page.getByRole("dialog", {
        name: "Avery Quinn profile",
        exact: true,
      });
      await expect(profile).toContainText("avery.quinn@orbit.example");
      await expect(profile.locator(".fa-avatar-image")).toBeVisible();
      await expect(
        profile.getByRole("button", { name: "Close profile", exact: true }),
      ).toBeFocused();
      await page.keyboard.press("Escape");
      await expect(profile).toHaveCount(0);
      await expect(updated).toBeFocused();
      const geometry = await page
        .locator("#account-button .fa-shell-account")
        .evaluateAll((buttons) =>
          buttons
            .filter((button) => button.getBoundingClientRect().width > 0)
            .map((button) => {
              const box = button.getBoundingClientRect(),
                parent = button.parentElement!.getBoundingClientRect();
              return {
                width: box.width,
                height: box.height,
                inside:
                  box.left >= parent.left - 1 && box.right <= parent.right + 1,
                scroll: button.scrollWidth,
                client: button.clientWidth,
              };
            }),
        );
      expect(
        geometry.every((box) => box.inside && box.scroll <= box.client + 1),
      ).toBe(true);
      if (width === 320)
        expect(
          geometry.every((box) => box.width >= 44 && box.height >= 44),
        ).toBe(true);
      const result = await new AxeBuilder({ page })
        .include("#account-button")
        .analyze();
      expect(
        result.violations.map((v) => ({
          id: v.id,
          targets: v.nodes.map((n) => n.target),
        })),
      ).toEqual([]);
    });
  }
}
