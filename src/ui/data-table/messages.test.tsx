// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { MessagesProvider } from "../../lib/i18n/use-messages.js";
import { configureMessages, registerMessagePack } from "../../lib/i18n/i18n.js";
import { useMessages } from "../../lib/i18n/use-messages.js";
import { dataTableMessages } from "./messages.js";
import { summarize } from "./filters/summary.js";
import { filters } from "./filters/kinds.js";
import { formatRelative } from "./format.js";
import { emptyText } from "./search/empty-text.js";
import { SettingsMenu } from "./header.js";
import type { HeaderController } from "./header.js";
afterEach(() => {
  cleanup();
  configureMessages({});
});
it("resolves per-table locale, provider and labels for table summaries and built-in controls", () => {
  registerMessagePack({
    locale: "zz",
    messages: {
      "data-table": {
        columnsDensity: "Columnas",
        summaryContains: (label, value) => `${label} incluye ${value}`,
        justNow: "ahora",
        emptyQuery: (noun, query) => `Sin ${noun}: ${query}`,
      },
    },
  });
  function Fixture() {
    const m = useMessages(dataTableMessages, {
      locale: "zz",
      labels: { clear: "Borrar" },
    });
    return (
      <MessagesProvider messages={{ "data-table": m }}>
        <SettingsMenu
          columns={[]}
          userHidden={new Set()}
          autoHidden={new Set()}
          density="compact"
          controller={{} as HeaderController}
        />
        <p>
          {summarize(
            filters.text({ field: "Name" }),
            "Nombre",
            { op: "contains", value: "Cedar" },
            undefined,
            "zz",
            m,
          )}
        </p>
        <p>{formatRelative(1000, 1000, "zz", m)}</p>
        <p>{emptyText({ other: "filas" }, "x", 0, "", m)}</p>
        <p>{m.clear}</p>
      </MessagesProvider>
    );
  }
  render(<Fixture />);
  expect(screen.getByRole("button", { name: "Columnas" })).toBeTruthy();
  expect(screen.getByText("Nombre incluye Cedar")).toBeTruthy();
  expect(screen.getByText("ahora")).toBeTruthy();
  expect(screen.getByText("Sin filas: x")).toBeTruthy();
  expect(screen.getByText("Borrar")).toBeTruthy();
});
