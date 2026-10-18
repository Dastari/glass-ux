import { expect, test, type Locator, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const PASSWORD = "orbit-sample-pass";

async function open(page: Page, appearance: Record<string, unknown> = {}) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(
    (value) =>
      localStorage.setItem("glass-ux.appearance.v1", JSON.stringify(value)),
    appearance,
  );
  await page.goto("/components/login-flow");
  await expect(page.locator(".gallery-document-intro h1")).toHaveText(
    "LoginFlow",
  );
  return errors;
}

const box = async (locator: Locator) => {
  const rect = await locator.boundingBox();
  if (!rect) throw new Error("not rendered");
  return rect;
};

test("refusals replace the reserved status line without moving controls @responsive", async ({
  page,
}) => {
  const errors = await open(page);
  const flow = page.getByTestId("login-errors");
  await flow.scrollIntoViewIfNeeded();
  const submit = flow.getByRole("button", { name: "Sign in", exact: true });
  const microsoft = flow.getByRole("button", {
    name: "Continue with Microsoft",
  });
  const status = flow.locator(".fa-login-status");
  const before = {
    submit: await box(submit),
    microsoft: await box(microsoft),
    status: await box(status),
  };
  expect(before.status.height).toBeGreaterThan(20);
  await expect(status).toBeEmpty();

  await flow.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await submit.click();
  await expect(status).toContainText("This account is locked");
  await expect(status).toHaveAttribute("data-tone", "danger");
  expect((await box(submit)).y).toBeCloseTo(before.submit.y, 0);
  // The line grows downward only, below every control of the form.
  expect((await box(status)).y).toBeCloseTo(before.status.y, 0);

  // A provider refusal uses the same line; the unavailable provider explains itself.
  await expect(
    flow.getByRole("button", { name: "Continue with GitHub" }),
  ).toHaveAttribute("aria-disabled", "true");
  await microsoft.click();
  await expect(status).toContainText("Microsoft sign-in is not enabled");
  expect((await box(microsoft)).y).toBeCloseTo(before.microsoft.y, 0);
  expect((await box(submit)).y).toBeCloseTo(before.submit.y, 0);
  expect(errors).toEqual([]);
});

test("forgot password, reset code and return keep the identifier and focus @responsive", async ({
  page,
}) => {
  const errors = await open(page);
  const flow = page.getByTestId("login-reset");
  await flow.scrollIntoViewIfNeeded();
  await expect(
    flow.getByRole("heading", { name: "Reset password" }),
  ).toBeVisible();
  await flow.getByRole("button", { name: "Send reset link" }).click();
  await expect(
    flow.getByRole("heading", { name: "Check your email" }),
  ).toBeVisible();
  await expect(flow).toContainText(
    "If an account exists for avery@orbit.example",
  );
  const code = flow.locator("input[autocomplete='one-time-code']").first();
  await expect(code).toBeFocused();
  await expect(
    flow.getByRole("button", { name: /^Resend in \d+ s/ }),
  ).toHaveAttribute("aria-disabled", "true");
  await page.keyboard.type("246810");
  await flow.getByLabel("New password", { exact: true }).fill("tidal-copper-lantern-42");
  await flow
    .getByLabel("Confirm password", { exact: true })
    .fill("tidal-copper-lantern-42");
  await flow.getByRole("button", { name: "Set password" }).click();
  await expect(flow.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await expect(flow.locator(".fa-login-status")).toContainText(
    "Password changed",
  );
  await expect(flow.getByLabel("Email", { exact: true })).toHaveValue(
    "avery@orbit.example",
  );
  await expect(flow.getByLabel("Password", { exact: true })).toBeFocused();
  expect(errors).toEqual([]);
});

test("two-factor step follows a sign-in outcome and verifies the code", async ({
  page,
}) => {
  const errors = await open(page, { motion: "reduced" });
  const flow = page.getByTestId("login-two-factor");
  await flow.scrollIntoViewIfNeeded();
  await flow.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await flow.getByLabel("Password", { exact: true }).press("Enter");
  await expect(
    flow.getByRole("heading", { name: "Enter verification code" }),
  ).toBeVisible();
  const first = flow.locator("input[autocomplete='one-time-code']").first();
  await expect(first).toBeFocused();
  await page.keyboard.type("111111");
  await expect(flow).toContainText("That code is incorrect or has expired");
  // The refused code stays; Backspace steps back through the boxes.
  await flow.locator("input[autocomplete='one-time-code']").last().focus();
  for (let index = 0; index < 6; index++) await page.keyboard.press("Backspace");
  await expect(first).toBeFocused();
  await page.keyboard.type("246810");
  await expect(flow.locator(".fa-login-status")).toContainText(
    "Code accepted",
  );
  expect(errors).toEqual([]);
});

test("sign-up validates the configured fields and providers sit below @responsive", async ({
  page,
}) => {
  const errors = await open(page);
  const flow = page.getByTestId("login-sign-up");
  await flow.scrollIntoViewIfNeeded();
  const submit = flow.getByRole("button", { name: "Create account" });
  await submit.click();
  await expect(flow.getByText("Enter your name")).toBeVisible();
  await expect(flow.getByText("Accept the terms to continue")).toBeVisible();
  await expect(flow.getByLabel("Name", { exact: true })).toBeFocused();
  const formBottom = (await box(submit)).y;
  const google = await box(
    flow.getByRole("button", { name: "Continue with Google" }),
  );
  expect(google.y).toBeGreaterThan(formBottom);
  await expect(flow.getByRole("link", { name: "terms of service" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("providers-only, dialog and every view stay accessible and inside their containers @responsive", async ({
  page,
}) => {
  const errors = await open(page, { mode: "dark", density: "compact" });
  const providers = page.getByTestId("login-providers");
  await expect(providers.getByLabel("Password")).toHaveCount(0);
  await expect(
    providers.getByRole("button", { name: "Continue with Slack" }),
  ).toBeVisible();

  // Nothing inside a flow overflows its surface.
  const overflow = await page.locator(".fa-login").evaluateAll((flows) =>
    flows.flatMap((flow) => {
      const edge = flow.getBoundingClientRect();
      return [...flow.querySelectorAll<HTMLElement>("*")]
        .filter((item) => {
          const rect = item.getBoundingClientRect();
          return rect.width > 0 && (rect.right > edge.right + 1 || rect.left < edge.left - 1);
        })
        .map((item) => item.className);
    }),
  );
  expect(overflow).toEqual([]);

  const result = await new AxeBuilder({ page })
    .include(".gallery-document-layout")
    .analyze();
  expect(
    result.violations.map((violation) => ({
      id: violation.id,
      targets: violation.nodes.map((node) => node.target),
    })),
  ).toEqual([]);

  await page.getByTestId("login-dialog-open").click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await expect(dialog.getByLabel("Email", { exact: true })).toBeFocused();
  await dialog.getByRole("button", { name: "Create account" }).click();
  await expect(
    dialog.getByRole("heading", { name: "Create account" }),
  ).toBeVisible();
  await expect(dialog.getByLabel("Email", { exact: true })).toBeFocused();
  const dialogResult = await new AxeBuilder({ page })
    .include("[role='dialog']")
    .analyze();
  expect(dialogResult.violations.map((violation) => violation.id)).toEqual([]);
  expect(errors).toEqual([]);
});
