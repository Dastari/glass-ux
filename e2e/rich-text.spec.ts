import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("quoted paragraphs are editable and save Markdown blockquotes @responsive", async ({
  page,
}) => {
  await page.goto("/components/rich-text-input");
  const demo = page.getByTestId("rich-text-quote-demo");
  const editor = demo.getByRole("textbox", { name: "Quoted passage" });
  const chooser = demo.getByRole("button", { name: /^Block style:/ });
  await expect(editor.locator("blockquote")).toContainText("original speaker");
  await editor.fill("Keep these quoted words");
  await chooser.click();
  await page
    .getByRole("menuitemradio", { name: "Paragraph", exact: true })
    .click();
  await expect(editor.locator("blockquote")).toHaveCount(0);
  await chooser.click();
  await page.getByRole("menuitemradio", { name: "Quote", exact: true }).click();
  await expect(chooser).toHaveAccessibleName("Block style: Quote");
  await expect(editor.locator("blockquote")).toHaveText(
    "Keep these quoted words",
  );
  await expect(demo.getByTestId("rich-text-quote-markdown")).toHaveText(
    "> Keep these quoted words",
  );
  await demo.getByRole("button", { name: "Markdown", exact: true }).click();
  await expect(editor).toHaveValue("> Keep these quoted words");
  await editor.fill("> Edited quoted words\n\nAn ordinary response.");
  await demo.getByRole("button", { name: "Visual", exact: true }).click();
  await expect(editor.locator("blockquote")).toHaveText("Edited quoted words");
  await expect(editor.locator("p")).toHaveText("An ordinary response.");
});

test("safe links stay editable, open deliberately and work read-only @responsive", async ({
  page,
  context,
}) => {
  await page.addInitScript(() => {
    const calls: unknown[][] = [];
    Reflect.set(window, "richTextOpenCalls", calls);
    window.open = (...args) => {
      calls.push(args);
      return null;
    };
  });
  await context.route("https://northstar.example/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<p>Fictional support guide.</p>",
    }),
  );
  await page.goto("/components/rich-text-input");
  const originalUrl = page.url();
  const demo = page.getByTestId("rich-text-demo");
  const editor = demo.getByRole("textbox", { name: "Welcome guide" });
  const link = editor.getByRole("link", { name: "support guide" });
  await link.click();
  expect(page.url()).toBe(originalUrl);
  expect(
    await page.evaluate(() => Reflect.get(window, "richTextOpenCalls")),
  ).toEqual([]);
  await link.click({ modifiers: ["Control"] });
  await link.click({ modifiers: ["Meta"] });
  await link.click({ button: "middle" });
  const expectedCall = [
    "https://northstar.example/support",
    "_blank",
    "noopener,noreferrer",
  ];
  expect(
    await page.evaluate(() => Reflect.get(window, "richTextOpenCalls")),
  ).toEqual([expectedCall, expectedCall, expectedCall]);
  await link.click();
  await demo.getByRole("button", { name: "Edit link", exact: true }).click();
  await page.getByRole("button", { name: "Open link", exact: true }).click();
  expect(
    await page.evaluate(() => Reflect.get(window, "richTextOpenCalls")),
  ).toEqual([expectedCall, expectedCall, expectedCall, expectedCall]);
  await page.keyboard.press("Escape");
  const readOnly = page.getByRole("textbox", { name: "Read-only document" });
  const publishedLink = readOnly.getByRole("link", { name: "support guide" });
  await expect(publishedLink).toHaveAttribute("target", "_blank");
  const nextPage = context.waitForEvent("page");
  await publishedLink.click();
  const opened = await nextPage;
  await opened.waitForLoadState("domcontentloaded");
  expect(opened.url()).toBe("https://northstar.example/support");
  expect(
    await opened.evaluate(() => ({
      opener: window.opener,
      referrer: document.referrer,
    })),
  ).toEqual({ opener: null, referrer: "" });
  await opened.close();
  await publishedLink.focus();
  const keyboardPage = context.waitForEvent("page");
  await publishedLink.press("Enter");
  const keyboardOpened = await keyboardPage;
  await keyboardOpened.waitForLoadState("domcontentloaded");
  expect(keyboardOpened.url()).toBe("https://northstar.example/support");
  await keyboardOpened.close();
  const disabled = page
    .getByRole("textbox", { name: "Disabled document" })
    .getByRole("link", { name: "Support guide" });
  // Exercise the blocked event despite the disabled editor's intentional ARIA state.
  await disabled.dispatchEvent("click", { ctrlKey: true });
  expect(
    await page.evaluate(() => Reflect.get(window, "richTextOpenCalls")),
  ).toHaveLength(4);
  expect(page.url()).toBe(originalUrl);
});

test("blank link labels fall back to the address and malformed imports cannot activate", async ({
  page,
}) => {
  await page.goto("/components/rich-text-input");
  const demo = page.getByTestId("rich-text-demo");
  const editor = demo.getByRole("textbox", { name: "Welcome guide" });
  await editor.fill("   ");
  await editor.press("ControlOrMeta+A");
  await demo.getByRole("button", { name: "Edit link", exact: true }).click();
  const address = page.getByRole("textbox", { name: "Link address" });
  for (const value of [
    "https:",
    "https://",
    "https:/northstar.example",
    "mailto:",
    "tel:letters",
  ]) {
    await address.fill(value);
    await page.getByRole("button", { name: "Apply link" }).click();
    await expect(address).toHaveAttribute("aria-invalid", "true");
    await expect(editor.locator("a")).toHaveCount(0);
  }
  await address.fill("docs/guide?x=1");
  await page.getByRole("button", { name: "Apply link" }).click();
  await expect(editor.locator("a")).toHaveText("docs/guide?x=1");
  await expect(editor.locator("a")).toHaveAttribute("href", "docs/guide?x=1");
  await demo.getByRole("button", { name: "Markdown", exact: true }).click();
  const source =
    "[Relative](docs/guide?x=1) [Query](?mode=1) [Malformed](https:) [SMS](sms:+61355550100)";
  await editor.fill(source);
  await demo.getByRole("button", { name: "Visual", exact: true }).click();
  await expect(editor.getByRole("link", { name: "Relative" })).toHaveAttribute(
    "href",
    "docs/guide?x=1",
  );
  await expect(editor.getByRole("link", { name: "Query" })).toHaveAttribute(
    "href",
    "?mode=1",
  );
  await expect(editor.locator("a:not([href])")).toHaveCount(2);
  await demo.getByRole("button", { name: "Markdown", exact: true }).click();
  await expect(editor).toHaveValue(source);
});

test("inserting a link at a caret leaves surrounding text unlinked", async ({
  page,
}) => {
  await page.goto("/components/rich-text-input");
  const demo = page.getByTestId("rich-text-demo");
  const editor = demo.getByRole("textbox", { name: "Welcome guide" });
  await editor.fill("Before after");
  await demo.getByRole("button", { name: /^Block style:/ }).click();
  await page
    .getByRole("menuitemradio", { name: "Paragraph", exact: true })
    .click();
  await editor.press("Home");
  for (let index = 0; index < 7; index++) await editor.press("ArrowRight");
  await demo.getByRole("button", { name: "Edit link", exact: true }).click();
  await page.getByRole("textbox", { name: "Link address" }).fill("/guide");
  await page.getByRole("button", { name: "Apply link" }).click();
  await expect(editor.locator("a")).toHaveText("/guide");
  await expect(editor).toHaveText("Before /guideafter");
  await expect(demo.getByTestId("rich-text-markdown")).toHaveText(
    "Before [/guide](/guide)after",
  );
});

test("block styles keep the chooser and formatting geometry stable @responsive", async ({
  page,
}, testInfo) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "glass-ux.appearance.v1",
      JSON.stringify({ mode: "light", uiScale: 1.125, density: "comfortable" }),
    ),
  );
  await page.goto("/components/rich-text-input");
  const demo = page.getByTestId("rich-text-demo");
  const root = demo.locator(".fa-rich-text").first();
  const editor = demo.getByRole("textbox", { name: "Welcome guide" });
  const chooser = demo.getByRole("button", { name: /^Block style:/ });
  const italic = demo.getByRole("button", { name: "Italic", exact: true });
  await editor.fill("Stable formatting");
  await expect(italic.locator("svg")).toBeVisible();
  expect(await italic.locator("svg path").getAttribute("d")).toContain(
    "M10 5h9",
  );
  for (const width of testInfo.project.name === "phone"
    ? [320, 360]
    : [360, 650, 800]) {
    await root.evaluate((element, value) => {
      element.style.width = `${value}px`;
    }, width);
    const before = await root.evaluate((element) => {
      const chooser = element.querySelector<HTMLElement>(
        ".fa-rich-text-block",
      )!;
      const italic = element.querySelector<HTMLElement>(
        'button[aria-label="Italic"]',
      )!;
      return {
        width: chooser.getBoundingClientRect().width,
        italicX: italic.getBoundingClientRect().x,
        height: element
          .querySelector(".fa-rich-text-toolbar")!
          .getBoundingClientRect().height,
      };
    });
    for (const label of [
      "Paragraph",
      "Quote",
      "Heading 1",
      "Heading 2",
      "Heading 3",
      "Code block",
    ]) {
      await chooser.click();
      await page
        .getByRole("menuitemradio", { name: label, exact: true })
        .click();
      await expect(chooser.locator("[data-active]")).toHaveText(label);
      const after = await root.evaluate((element) => {
        const chooser = element.querySelector<HTMLElement>(
          ".fa-rich-text-block",
        )!;
        const italic = element.querySelector<HTMLElement>(
          'button[aria-label="Italic"]',
        )!;
        const toolbar = element.querySelector<HTMLElement>(
          ".fa-rich-text-toolbar",
        )!;
        return {
          width: chooser.getBoundingClientRect().width,
          italicX: italic.getBoundingClientRect().x,
          height: toolbar.getBoundingClientRect().height,
          overflow: toolbar.scrollWidth > toolbar.clientWidth + 1,
        };
      });
      expect(
        Math.abs(after.width - before.width),
        `${label} chooser at ${width}`,
      ).toBeLessThanOrEqual(0.5);
      expect(
        Math.abs(after.italicX - before.italicX),
        `${label} formatting at ${width}`,
      ).toBeLessThanOrEqual(0.5);
      expect(
        Math.abs(after.height - before.height),
        `${label} toolbar at ${width}`,
      ).toBeLessThanOrEqual(0.5);
      expect(after.overflow).toBe(false);
    }
    await root.screenshot({
      path: `test-results/rich-text-0.5.1-${testInfo.project.name}-${width}.png`,
    });
  }
});

for (const mode of ["light", "dark"] as const) {
  for (const uiScale of [1, 1.125]) {
    test(`view switch collapses before formatting wraps in ${mode} at UI scale ${uiScale}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.addInitScript(
        (settings) =>
          localStorage.setItem(
            "glass-ux.appearance.v1",
            JSON.stringify(settings),
          ),
        { mode, uiScale, density: "comfortable" },
      );
      await page.goto("/components/rich-text-input");
      const demo = page.getByTestId("rich-text-demo");
      const root = demo.locator(".fa-rich-text").first();
      const modes = root.locator(".fa-rich-text-modes");
      await expect(
        demo.getByRole("textbox", { name: "Welcome guide" }),
      ).toBeVisible();
      for (const width of [320, 360, 480, 640, 650, 800]) {
        await root.evaluate((element, value) => {
          element.style.width = `${value}px`;
        }, width);
        await expect(modes).toHaveAttribute(
          "data-form",
          width >= 800 ? "full" : "icons",
        );
        const geometry = await root.evaluate((element) => {
          const bounds = element.getBoundingClientRect();
          const formatting = element.querySelector<HTMLElement>(
            ".fa-rich-text-formatting",
          )!;
          const toolbar = element.querySelector<HTMLElement>(
            ".fa-rich-text-toolbar",
          )!;
          const buttons = [...formatting.querySelectorAll("button")];
          const rows = new Set(
            buttons.map((button) =>
              Math.round(button.getBoundingClientRect().top),
            ),
          );
          const style = getComputedStyle(toolbar);
          const singleHeight =
            Math.max(
              ...buttons.map((button) => button.getBoundingClientRect().height),
            ) +
            Number.parseFloat(style.paddingTop) +
            Number.parseFloat(style.paddingBottom) +
            Number.parseFloat(style.borderBottomWidth);
          return {
            rows: rows.size,
            height: toolbar.getBoundingClientRect().height,
            singleHeight,
            bounded: [...toolbar.querySelectorAll("button")].every((button) => {
              const control = button.getBoundingClientRect();
              return (
                control.left >= bounds.left && control.right <= bounds.right + 1
              );
            }),
            scrolls: toolbar.scrollWidth > toolbar.clientWidth + 1,
          };
        });
        expect(geometry.bounded, `controls at ${width}px`).toBe(true);
        expect(geometry.scrolls, `toolbar at ${width}px`).toBe(false);
        if (width >= 640) {
          expect(geometry.rows, `formatting rows at ${width}px`).toBe(1);
          expect(geometry.height).toBeLessThanOrEqual(
            geometry.singleHeight + 1,
          );
        }
        if (width === 650)
          await root.screenshot({
            path: `test-results/rich-text-toolbar-${mode}-${uiScale}.png`,
          });
      }
      // The same named controls remain available after growing back to labelled segments.
      await modes
        .getByRole("button", { name: "Markdown", exact: true })
        .click();
      await expect(
        demo.getByRole("textbox", { name: "Welcome guide" }),
      ).toHaveAttribute("spellcheck", "false");
      await modes.getByRole("button", { name: "Visual", exact: true }).click();
      await expect(
        demo.getByRole("textbox", { name: "Welcome guide" }),
      ).toHaveAttribute("contenteditable", "true");
      await page.goto("/components/rich-text-skeleton");
      const slot = page.getByTestId("rich-text-loading-slot");
      await page.getByTestId("rich-text-loading-swap").focus();
      await page.keyboard.press("Tab");
      expect(
        await page.evaluate(
          () =>
            document.activeElement?.closest(".fa-rich-text[data-loading]") !==
            null,
        ),
      ).toBe(false);
      for (const width of [320, 360, 480, 640, 800]) {
        await slot.evaluate((element, value) => {
          element.style.width = `${value}px`;
        }, width);
        const before = await slot
          .locator(".fa-rich-text-toolbar")
          .evaluate((element) => element.getBoundingClientRect().height);
        await page.getByTestId("rich-text-loading-swap").click();
        await expect(slot.locator("[contenteditable='true']")).toBeVisible();
        const after = await slot
          .locator(".fa-rich-text-toolbar")
          .evaluate((element) => element.getBoundingClientRect().height);
        expect(
          Math.abs(before - after),
          `skeleton toolbar at ${width}px`,
        ).toBeLessThanOrEqual(1);
        await page.getByTestId("rich-text-loading-swap").click();
        await expect(slot.locator(".fa-rich-text[data-loading]")).toBeVisible();
      }
    });
  }
}

test("visual formatting and source switching preserve Markdown", async ({
  page,
}) => {
  await page.goto("/components/rich-text-input");
  const demo = page.getByTestId("rich-text-demo");
  const editor = demo.getByRole("textbox", { name: "Welcome guide" });
  await expect(editor).toHaveAttribute("contenteditable", "true");
  await expect(editor.locator("h2")).toHaveText("Northstar welcome guide");
  const original = await demo.getByTestId("rich-text-markdown").textContent();
  await demo.getByRole("button", { name: "Markdown", exact: true }).click();
  await expect(editor).toHaveValue(original!);
  await demo.getByRole("button", { name: "Visual", exact: true }).click();
  await expect(demo.getByTestId("rich-text-markdown")).toHaveText(original!);
  await editor.fill("Shared handover");
  await demo.getByRole("button", { name: /^Block style:/ }).click();
  await page
    .getByRole("menuitemradio", { name: "Paragraph", exact: true })
    .click();
  await editor.press("ControlOrMeta+A");
  await editor.press("ControlOrMeta+B");
  await expect(
    demo.getByRole("button", { name: "Bold", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(demo.getByTestId("rich-text-markdown")).toHaveText(
    "**Shared handover**",
  );
  await demo.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(demo.getByTestId("rich-text-markdown")).toHaveText(
    "Shared handover",
  );
  await demo.getByRole("button", { name: "Redo", exact: true }).click();
  await expect(demo.getByTestId("rich-text-markdown")).toHaveText(
    "**Shared handover**",
  );
  await demo.getByRole("button", { name: "Markdown", exact: true }).click();
  await expect(editor).toHaveValue("**Shared handover**");
  const source =
    "### Clear next steps\n\n**Bold** and *italic*, `code` and ~~old~~.\n\n- One\n- Two\n\n1. First\n2. Second\n\n- [ ] Pending\n- [x] Done\n\n> Quote\n\n```ts\nconst ready = true\n```";
  await editor.fill(source);
  await demo.getByRole("button", { name: "Visual", exact: true }).click();
  await expect(editor.locator("h3")).toHaveText("Clear next steps");
  await expect(editor.locator("blockquote")).toHaveText("Quote");
  await expect(editor.locator(".fa-rich-text-code-block")).toContainText(
    "const ready = true",
  );
  await demo.getByRole("button", { name: "Markdown", exact: true }).click();
  await expect(editor).toHaveValue(source);
});

test("external resets and toolbar keyboard actions use the current document", async ({
  page,
}) => {
  await page.goto("/components/rich-text-input");
  const demo = page.getByTestId("rich-text-demo");
  const editor = demo.getByRole("textbox", { name: "Welcome guide" });
  await editor.fill("Temporary draft");
  await demo.getByRole("button", { name: "Load another document" }).click();
  await expect(editor.locator("h2")).toHaveText("Updated guide");
  await expect(editor).not.toContainText("Temporary draft");
  await demo.getByRole("button", { name: "Markdown", exact: true }).click();
  await expect(editor).toHaveValue(
    "## Updated guide\n\nThis document was replaced by its owner.",
  );
  await demo.getByRole("button", { name: "Visual", exact: true }).click();
  await editor.fill("Keyboard draft");
  await demo.getByRole("button", { name: /^Block style:/ }).click();
  await page
    .getByRole("menuitemradio", { name: "Paragraph", exact: true })
    .click();
  await editor.press("ControlOrMeta+A");
  const bold = demo.getByRole("button", { name: "Bold", exact: true });
  await bold.focus();
  await page.keyboard.press("ArrowRight");
  const italic = demo.getByRole("button", { name: "Italic", exact: true });
  await expect(italic).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(demo.getByTestId("rich-text-markdown")).toHaveText(
    "*Keyboard draft*",
  );
  await demo.getByRole("button", { name: /^Block style:/ }).click();
  await page
    .getByRole("menuitemradio", { name: "Heading 2", exact: true })
    .click();
  await expect(editor.locator("h2")).toHaveText("Keyboard draft");
});

test("unsafe links and raw HTML cannot execute while safe links stay Markdown", async ({
  page,
}) => {
  await page.goto("/components/rich-text-input");
  const demo = page.getByTestId("rich-text-demo");
  const editor = demo.getByRole("textbox", { name: "Welcome guide" });
  await editor.fill("Support guide");
  await editor.press("ControlOrMeta+A");
  await demo.getByRole("button", { name: "Edit link", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Link address" })
    .fill("javascript:alert(1)");
  await page.getByRole("button", { name: "Apply link" }).click();
  await expect(
    page.getByText("Use an https://, http://, mailto:, tel: or relative link"),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Link address" })
    .fill("https://northstar.example/support");
  await page.getByRole("button", { name: "Apply link" }).click();
  await expect(editor.locator("a")).toHaveAttribute(
    "href",
    "https://northstar.example/support",
  );
  await expect(demo.getByTestId("rich-text-markdown")).toContainText(
    "[Support guide](https://northstar.example/support)",
  );
  await demo.getByRole("button", { name: "Markdown", exact: true }).click();
  const unsafe =
    "<script>window.richTextExecuted = true</script>\n\n![Unsafe](data:image/svg+xml,x)\n\n[Unsafe link](javascript:alert)";
  await editor.fill(unsafe);
  await demo.getByRole("button", { name: "Visual", exact: true }).click();
  await expect(
    editor.locator("script, img[src^='data:'], a[href^='javascript:']"),
  ).toHaveCount(0);
  expect(
    await page.evaluate(() => Reflect.get(window, "richTextExecuted")),
  ).toBeUndefined();
  await demo.getByRole("button", { name: "Markdown", exact: true }).click();
  await expect(editor).toHaveValue(unsafe);
});

test("form validates on blur, recovers on change and submits Markdown", async ({
  page,
}) => {
  await page.goto("/components/rich-text-field");
  const demo = page.getByTestId("rich-text-form-demo");
  const editor = demo.getByRole("textbox", { name: "Document", exact: true });
  await editor.focus();
  await editor.press("Tab");
  await expect(
    demo.getByText("Write a document", { exact: true }),
  ).toBeVisible();
  await expect(editor).toHaveAttribute("aria-invalid", "true");
  // Native submission exercises focusFirstInvalid even while the untouched form's
  // save button is disabled by its dirty-state contract.
  await demo
    .locator("form")
    .evaluate((form: HTMLFormElement) => form.requestSubmit());
  await expect(editor).toBeFocused();
  await editor.fill("A shared handover");
  await expect(demo.getByText("Write a document", { exact: true })).toHaveCount(
    0,
  );
  await editor.press("ControlOrMeta+A");
  await editor.press("ControlOrMeta+B");
  await demo
    .getByRole("button", { name: "Save document", exact: true })
    .click();
  await expect(demo.getByTestId("rich-text-saved")).toHaveText(
    "**A shared handover**",
  );
});

test("host attachment adapter inserts a safe Markdown file link", async ({
  page,
}) => {
  await page.goto("/components/rich-text-input");
  const supporting = page.getByRole("textbox", { name: "Supporting files" });
  const root = supporting.locator("xpath=ancestor::div[@data-view][1]");
  await supporting.click();
  await root.locator("input[type=file]").setInputFiles({
    name: "guide.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("Fictional demo file"),
  });
  await expect(supporting.locator("a")).toHaveText("guide.pdf");
  await root.getByRole("button", { name: "Markdown", exact: true }).click();
  await expect(supporting).toHaveValue(
    /\[guide.pdf\]\(https:\/\/files.northstar.example\/guide.pdf\)/,
  );
});

for (const mode of ["light", "dark"] as const) {
  test(`editor follows ${mode} appearance and container bounds @responsive`, async ({
    page,
  }, testInfo) => {
    const phone = testInfo.project.name === "phone";
    await page.setViewportSize(
      phone ? { width: 390, height: 844 } : { width: 1920, height: 1080 },
    );
    await page.addInitScript(
      (settings) =>
        localStorage.setItem(
          "glass-ux.appearance.v1",
          JSON.stringify(settings),
        ),
      {
        mode,
        glass: mode === "dark" ? "solid" : "full",
        density: mode === "dark" ? "compact" : "comfortable",
        uiScale: mode === "dark" ? 1.125 : 1,
        radiusScale: mode === "dark" ? 1.4 : 1,
        borderWidth: mode === "dark" ? 1.5 : 1,
      },
    );
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/components/rich-text-input");
    const demo = page.getByTestId("rich-text-demo");
    const editor = demo.getByRole("textbox", { name: "Welcome guide" });
    await expect(editor).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("data-mode", mode);
    await expect(page.locator("html")).toHaveAttribute(
      "data-glass",
      mode === "dark" ? "solid" : "full",
    );
    const geometry = await demo.evaluate((element) => {
      const root = element.querySelector<HTMLElement>(".fa-rich-text")!;
      const content = root.querySelector<HTMLElement>(
        ".fa-rich-text-editable",
      )!;
      const toolbar = root.querySelector<HTMLElement>(".fa-rich-text-toolbar")!;
      const probe = document.createElement("div");
      probe.style.cssText =
        "position:absolute;visibility:hidden;padding:var(--control-px-md);border-radius:var(--radius-control);border:var(--border-width) solid transparent";
      root.append(probe);
      const expected = getComputedStyle(probe);
      const expectedPadding = expected.paddingLeft;
      const expectedRadius = expected.borderTopLeftRadius;
      const expectedBorder = expected.borderTopWidth;
      probe.remove();
      const measured = getComputedStyle(root);
      const body = getComputedStyle(content);
      const bounds = root.getBoundingClientRect();
      return {
        radius: measured.borderTopLeftRadius,
        expectedRadius,
        border: measured.borderTopWidth,
        expectedBorder,
        padding: body.paddingLeft,
        expectedPadding,
        resize: body.resize,
        min: Number.parseFloat(body.minHeight),
        max: Number.parseFloat(body.maxHeight),
        contentHeight: content.getBoundingClientRect().height,
        overflow: toolbar.scrollWidth > toolbar.clientWidth + 1,
        viewportOverflow: bounds.right > window.innerWidth,
        controlsInside: [...toolbar.querySelectorAll("button")].every(
          (control) =>
            control.getBoundingClientRect().right <= bounds.right + 1,
        ),
      };
    });
    expect(geometry.radius).toBe(geometry.expectedRadius);
    expect(geometry.border).toBe(geometry.expectedBorder);
    expect(geometry.padding).toBe(geometry.expectedPadding);
    expect(geometry.resize).toBe("vertical");
    expect(geometry.contentHeight).toBeGreaterThanOrEqual(geometry.min);
    expect(geometry.contentHeight).toBeLessThanOrEqual(geometry.max + 1);
    expect(geometry.overflow).toBe(false);
    expect(geometry.viewportOverflow).toBe(false);
    expect(geometry.controlsInside).toBe(true);
    const accessibility = await new AxeBuilder({ page })
      .include("[data-testid='rich-text-demo']")
      .analyze();
    expect(
      accessibility.violations.map((item) => ({
        id: item.id,
        targets: item.nodes.map((node) => node.target),
      })),
    ).toEqual([]);
    await demo.screenshot({
      path: `test-results/rich-text-${testInfo.project.name}-${mode}.png`,
    });
    await demo.getByRole("button", { name: "Markdown", exact: true }).click();
    const bounds = await editor.boundingBox();
    expect(bounds).not.toBeNull();
    if (!phone && bounds) {
      await page.mouse.move(
        bounds.x + bounds.width - 8,
        bounds.y + bounds.height - 8,
      );
      await page.mouse.down();
      await page.mouse.move(
        bounds.x + bounds.width - 8,
        bounds.y + bounds.height + 32,
      );
      await page.mouse.up();
      await expect
        .poll(async () => (await editor.boundingBox())?.height ?? 0)
        .toBeGreaterThan(bounds.height + 10);
    }
    await editor.fill(
      Array.from({ length: 80 }, (_, index) => `Line ${index + 1}`).join("\n"),
    );
    await expect
      .poll(() =>
        editor.evaluate(
          (element) => element.scrollHeight > element.clientHeight,
        ),
      )
      .toBe(true);
    expect(
      await editor.evaluate((element) =>
        Number.parseFloat(getComputedStyle(element).maxHeight),
      ),
    ).toBe(420);
    expect(errors).toEqual([]);
  });
}
