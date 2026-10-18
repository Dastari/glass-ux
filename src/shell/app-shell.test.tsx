// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { AppShell } from "./app-shell.js";
import { Inspector } from "./inspector.js";
import { Rail } from "./rail.js";
import { SectionDrawer } from "./section-drawer.js";
import { SHELL_STORAGE_KEY } from "./shell-state.js";
import { InspectorToggle } from "./top-bar.js";

beforeAll(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  // A wide desktop: the drawer and the inspector are docked and open.
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: !query.includes("<"),
    addEventListener() {},
    removeEventListener() {},
  }));
});
beforeEach(() => localStorage.removeItem(SHELL_STORAGE_KEY));
afterEach(cleanup);
afterAll(() => vi.unstubAllGlobals());

function Shell({ railActive = true }: { railActive?: boolean }) {
  return (
    <AppShell
      brand={<span>Brand</span>}
      rail={
        <Rail.Root aria-label="Sections">
          <Rail.Item icon={<span />} label="Projects" active={railActive} />
        </Rail.Root>
      }
      drawer={
        <SectionDrawer.Root aria-label="Project navigation">
          <SectionDrawer.Header title="Projects" />
        </SectionDrawer.Root>
      }
      topBar={<InspectorToggle />}
      inspector={
        <Inspector title="Details">
          <button type="button">Inside inspector</button>
        </Inspector>
      }
    >
      <p>Workspace</p>
    </AppShell>
  );
}

describe("collapsing a docked pane from inside it", () => {
  it("returns focus to the inspector toggle when the inspector is hidden", () => {
    render(<Shell />);
    // The pane's own close button (the top-bar toggle is also named "Hide inspector").
    const close = screen.getAllByRole("button", { name: "Hide inspector" }).find((button) => button.closest(".fa-shell-inspector"))!;
    act(() => close.focus());
    act(() => fireEvent.click(close));
    const toggle = document.querySelector<HTMLElement>(".fa-shell-topbar-inspector-toggle")!;
    expect(document.activeElement).toBe(toggle);
    expect(toggle).toHaveAccessibleName("Show inspector");
    expect(document.querySelector(".fa-shell-slot-inspector")).toHaveAttribute("inert");
  });

  it("returns focus to the current rail item when the section drawer collapses", () => {
    render(<Shell />);
    const collapse = screen.getByRole("button", { name: "Collapse section navigation" });
    act(() => collapse.focus());
    act(() => fireEvent.click(collapse));
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Projects" }));
    expect(document.querySelector(".fa-shell-slot-drawer")).toHaveAttribute("inert");
  });

  it("falls back to the drawer handle when no rail item is current", () => {
    render(<Shell railActive={false} />);
    const collapse = screen.getByRole("button", { name: "Collapse section navigation" });
    act(() => collapse.focus());
    act(() => fireEvent.click(collapse));
    expect(document.activeElement).toBe(screen.getByRole("separator", { name: "Resize section navigation" }));
  });

  it("leaves focus alone when it is outside the pane", () => {
    render(<Shell />);
    const toggle = document.querySelector<HTMLElement>(".fa-shell-topbar-inspector-toggle")!;
    const outside = screen.getByRole("button", { name: "Projects" });
    act(() => outside.focus());
    act(() => fireEvent.click(toggle));
    expect(document.activeElement).toBe(outside);
  });
});
