# Testing

`glass-ux/testing` uses the application's installed Testing Library and user-event.
`glass-ux/testing/playwright` uses the application's Playwright. These are optional peers;
ordinary component imports do not load either test runner.

```sh
pnpm add -D vitest jsdom @testing-library/react @testing-library/user-event
# For browser tests:
pnpm add -D @playwright/test
```

## Component tests

Use jsdom, install the missing browser APIs in your runner's setup file, and keep Testing
Library's normal cleanup enabled:

```tsx
// @vitest-environment jsdom
import { afterAll, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { Field } from "glass-ux/field";
import { Select } from "glass-ux/select";
import { installGlassTestEnvironment, renderWithGlass, selectOption } from "glass-ux/testing";

const restore = installGlassTestEnvironment();
afterAll(restore);

it("chooses an organisation", async () => {
  renderWithGlass(
    <Field label="Organisation">
      <Select options={[{ value: "northstar", label: "Northstar Studio" }]} />
    </Field>,
    { locale: "en-AU", appearance: { mode: "light", density: "compact" } },
  );
  await selectOption(screen.getByRole("combobox", { name: "Organisation" }), "Northstar Studio");
  expect(screen.getByRole("combobox").textContent).toContain("Northstar Studio");
});
```

`renderWithGlass(ui, options)` adds `AppearanceProvider`, `LocaleProvider`, `MessagesProvider`
and `TooltipProvider`. It accepts normal render options plus `appearance`, `locale` (default
`en-AU`) and typed per-namespace `messages`. Motion defaults to reduced. Unmounting restores
the previous stored appearance and document attributes. Appearance is document-wide: use
one wrapper at a time and unmount before rendering a different appearance. Add application
providers, action providers or a `Toaster` around the content when the test requires them.

`installGlassTestEnvironment()` fills missing `matchMedia`, observers, animation-frame,
scroll, pointer-event, pointer-capture and CSS APIs without replacing existing mocks. Its
return value restores the installed descriptors. The observer shims do not report layout;
media queries default to false. Supply explicit dimensions and observers for virtualisation
tests, and use a browser for actual geometry, reduced motion, clipping and focus placement.

| Helper | Input and behaviour |
| --- | --- |
| `selectOption(field, label)` | Select trigger or Field root; chooses an exact option, including portalled options. |
| `chooseFromCombobox(field, label, query?)` | Editable combobox or Field root; query defaults to label. |
| `openMenu(trigger)` | Returns the opened menu element. |
| `chooseMenuItem(menu, label)` | Chooses a menu item, checkbox item or radio item by exact accessible name. |
| `pickDate(field, isoDate, locale?)` | Types a calendar day and blurs to commit it; explicit field locales should be passed. |
| `toggleSwitch(field, checked?)` | Toggles, or changes only when the requested state differs. |
| `getTableRows(table)` | Mounted data rows, excluding headers. Scroll to mount virtual rows first. |
| `getCell(table, row, column)` | Zero-based visible data row and column; column may be an exact header name. |
| `expectToast(text, container?)` | Waits for a live toast with this exact title and returns its root. |

## Browser tests

The Playwright helpers accept locators, use auto-waiting and retain Playwright's normal
actionability checks. `getTableRows` returns a locator; `getCell` uses numeric indices.
`expectToast` accepts `(page, text)`. Date input defaults to `en-AU`; pass its locale when
testing another format.

```ts
import { expect, test } from "@playwright/test";
import { selectOption, openMenu, chooseMenuItem } from "glass-ux/testing/playwright";

test("updates a record", async ({ page }) => {
  await page.goto("/records");
  await selectOption(page.getByRole("combobox", { name: "Organisation" }), "Northstar Studio");
  const menu = await openMenu(page.getByRole("button", { name: "Record actions" }));
  await chooseMenuItem(menu, "Archive record");
  await expect(page.getByText("Record archived", { exact: true })).toBeVisible();
});
```

For this repository, give concurrent checkouts different `GLASS_UX_DEV_PORT` values so
Playwright's reusable web server belongs to the checkout under test. Run phone checks for
layout-sensitive changes and inspect actual insets, scale, density, radius and scroll edges.
