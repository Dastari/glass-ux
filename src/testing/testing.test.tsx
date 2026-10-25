// @vitest-environment jsdom
import { cleanup, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, afterEach, beforeAll, expect, it, vi } from "vitest";
import {
  renderWithGlass,
  installGlassTestEnvironment,
  selectOption,
  chooseFromCombobox,
  openMenu,
  chooseMenuItem,
  pickDate,
  toggleSwitch,
  getTableRows,
  getCell,
  expectToast,
} from "./index.js";
import TestingSection from "../gallery/sections/testing.section.js";
import { Spinner } from "../ui/spinner/index.js";
import { useLocale } from "../lib/locale/index.js";

let restore: () => void;
beforeAll(() => {
  restore = installGlassTestEnvironment();
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(
    function () {
      return this.classList.contains("fa-dt-scroll") ? 300 : 32;
    },
  );
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(1200);
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
    function () {
      return {
        width: 1200,
        height: 32,
        top: 0,
        left: 0,
        right: 1200,
        bottom: 32,
        x: 0,
        y: 0,
        toJSON() {},
      };
    },
  );
});
afterEach(cleanup);
afterAll(() => {
  vi.restoreAllMocks();
  restore();
});

it("uses provider settings and restores the previous appearance on cleanup", () => {
  localStorage.setItem("glass-ux.appearance.v1", "previous");
  const originalMode = document.documentElement.getAttribute("data-mode");
  function Example() {
    return (
      <>
        <Spinner />
        <span>{useLocale()}</span>
      </>
    );
  }
  const { unmount } = renderWithGlass(<Example />, {
    locale: "de-DE",
    appearance: { mode: "light" },
    messages: { spinner: { loading: "Laden" } },
  });
  expect(screen.getByRole("status")).toHaveTextContent("Laden");
  expect(screen.getByText("de-DE")).toBeTruthy();
  expect(document.documentElement).toHaveAttribute("data-mode", "light");
  unmount();
  expect(localStorage.getItem("glass-ux.appearance.v1")).toBe("previous");
  expect(document.documentElement.getAttribute("data-mode")).toBe(originalMode);
  localStorage.clear();
});

it("chooses real Select and Combobox options through their portals", async () => {
  renderWithGlass(<TestingSection />);
  const select = screen.getByRole("combobox", { name: "Organisation" });
  await selectOption(select, "Northstar Studio");
  expect(select).toHaveTextContent("Northstar Studio");
  const combo = screen.getByRole("combobox", { name: "Find organisation" });
  await chooseFromCombobox(combo, "Harbour Workshop", "Harbour");
  expect(combo).toHaveValue("Harbour Workshop");
});

it("operates real menus, dates, switches, data rows and toasts", async () => {
  renderWithGlass(<TestingSection />);
  const menu = await openMenu(
    screen.getByRole("button", { name: "Record actions" }),
  );
  await chooseMenuItem(menu, "Archive record");
  expect(screen.getByText("Record archived")).toBeTruthy();
  await pickDate(
    screen.getByRole("textbox", { name: "Review date" }),
    "2026-10-13",
    "en-AU",
  );
  expect(screen.getByRole("textbox", { name: "Review date" })).toHaveValue(
    "13/10/2026",
  );
  const setting = screen.getByRole("switch", { name: "Send reports" });
  await toggleSwitch(setting, true);
  await toggleSwitch(setting, true);
  expect(setting).toHaveAttribute("aria-checked", "true");
  const table = await screen.findByRole("grid", { name: "Sample records" });
  expect(getTableRows(table)).toHaveLength(2);
  expect(getCell(table, 0, "Name")).toHaveTextContent("Northstar Studio");
  await userEvent
    .setup()
    .click(screen.getByRole("button", { name: "Queue reports" }));
  expect(await expectToast("Reports queued")).toHaveClass("fa-toast");
});

it("preserves installed browser mocks and restores only missing APIs", () => {
  const existing = window.matchMedia;
  const original = Object.getOwnPropertyDescriptor(
    Element.prototype,
    "setPointerCapture",
  );
  Reflect.deleteProperty(Element.prototype, "setPointerCapture");
  const undo = installGlassTestEnvironment();
  expect(window.matchMedia).toBe(existing);
  const div = document.createElement("div");
  div.setPointerCapture(42);
  expect(div.hasPointerCapture(42)).toBe(true);
  undo();
  expect(Element.prototype.setPointerCapture).toBeUndefined();
  if (original)
    Object.defineProperty(Element.prototype, "setPointerCapture", original);
});
