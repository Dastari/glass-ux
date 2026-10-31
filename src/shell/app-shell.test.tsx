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

describe("a collapsed docked inspector", () => {
  it("puts its content away once it has slid out, keeping it, and shows it again on open", () => {
    vi.useFakeTimers();
    try {
      render(<Shell />);
      const content = screen.getByRole("button", { name: "Inside inspector" });
      const pane = content.closest("aside")!;
      act(() => fireEvent.click(pane.querySelector<HTMLElement>('[aria-label="Hide inspector"]')!));
      // Still shown while the pane slides out.
      expect(pane.querySelector(".fa-shell-inspector-body")).not.toHaveStyle({ display: "none" });
      act(() => fireEvent.transitionEnd(pane, { propertyName: "transform" }));
      expect(pane.querySelector(".fa-shell-inspector-body")).toHaveStyle({ display: "none" });
      // The same element: kept, not unmounted.
      expect(pane.contains(content)).toBe(true);
      act(() => fireEvent.click(screen.getByRole("button", { name: "Show inspector" })));
      expect(pane.querySelector(".fa-shell-inspector-body")).not.toHaveStyle({ display: "none" });
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("the section drawer on Sidebar's state", () => {
  const stored = () => localStorage.getItem(SHELL_STORAGE_KEY);

  it("toggles with one Ctrl+B listener, kept in the shell preferences, but not in rich text", () => {
    render(
      <>
        <Shell />
        <div contentEditable suppressContentEditableWarning data-testid="editor">
          Text
        </div>
      </>,
    );
    fireEvent.keyDown(window, { key: "b", ctrlKey: true });
    expect(stored()).toBe(JSON.stringify({ drawer: "closed", drawerWidth: null, inspector: null, collapsed: {} }));
    expect(document.documentElement.dataset.shellDrawer).toBe("closed");
    expect(document.querySelector(".fa-shell-slot-drawer")).toHaveAttribute("inert");
    fireEvent.keyDown(screen.getByTestId("editor"), { key: "b", ctrlKey: true });
    expect(document.querySelector(".fa-shell-slot-drawer")).toHaveAttribute("inert");
    fireEvent.keyDown(document.body, { key: "b", ctrlKey: true });
    expect(document.querySelector(".fa-shell-slot-drawer")).not.toHaveAttribute("inert");
    expect(document.documentElement.dataset.shellDrawer).toBeUndefined();
  });

  it("resizes from the handle's keys within 14–28rem, and Enter collapses", () => {
    render(<Shell />);
    const handle = screen.getByRole("separator", { name: "Resize section navigation" });
    fireEvent.keyDown(handle, { key: "ArrowRight" });
    expect(JSON.parse(stored()!).drawerWidth).toBe(17.5);
    fireEvent.keyDown(handle, { key: "ArrowLeft", shiftKey: true });
    expect(JSON.parse(stored()!).drawerWidth).toBe(14);
    fireEvent.keyDown(handle, { key: "End" });
    expect(JSON.parse(stored()!).drawerWidth).toBe(28);
    expect(handle).toHaveAttribute("aria-valuenow", "28");
    expect(document.documentElement.style.getPropertyValue("--shell-drawer")).toBe("28rem");
    fireEvent.keyDown(handle, { key: "Enter" });
    expect(JSON.parse(stored()!)).toMatchObject({ drawer: "closed", drawerWidth: 28 });
    expect(handle).toHaveAttribute("aria-valuenow", "0");
  });

  it("remembers a collapsed group under its id in the shell preferences", () => {
    render(
      <AppShell
        brand={null}
        rail={null}
        topBar={null}
        drawer={
          <SectionDrawer.Root aria-label="Project navigation">
            <SectionDrawer.Body>
              <SectionDrawer.Group id="projects.recent" title="Recent" count={2}>
                <SectionDrawer.List>
                  <SectionDrawer.Item label="Atlas" count={1204} detail="Avery Chen" />
                </SectionDrawer.List>
              </SectionDrawer.Group>
            </SectionDrawer.Body>
          </SectionDrawer.Root>
        }
      >
        <p>Workspace</p>
      </AppShell>,
    );
    const item = screen.getByRole("button", { name: /Atlas/ });
    // The count is part of the row's name, in locale digits; the detail sits under the label.
    expect(item).toHaveTextContent("AtlasAvery Chen1,204");
    expect(item).toHaveAttribute("data-detail");
    const trigger = screen.getByRole("button", { name: /^Recent/ });
    expect(screen.getByRole("group", { name: /^Recent/ })).toContainElement(item);
    fireEvent.click(trigger);
    expect(JSON.parse(stored()!).collapsed).toEqual({ "projects.recent": true });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });
});
