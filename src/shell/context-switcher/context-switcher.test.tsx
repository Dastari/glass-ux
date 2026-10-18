// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "../../ui/tooltip/index.js";
import { ContextAvatar, ContextSwitcher, ContextSwitcherPanel } from "./context-switcher.js";
import { switcherLabels, type ContextItem } from "./model.js";

vi.mock("../../lib/use-media-query.js", () => ({ useMediaQuery: () => false }));
beforeAll(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  }));
});
afterEach(cleanup);
afterAll(() => vi.unstubAllGlobals());

const Folder = () => <svg data-testid="folder" />;
const PROJECTS: ContextItem[] = [
  { id: "atlas", name: "Atlas redesign", icon: <Folder /> },
  { id: "atlas-web", name: "Atlas website", parentId: "atlas" },
  { id: "harbour", name: "Harbour survey" },
];
const labels = switcherLabels({ one: "project", other: "projects" });

describe("ContextSwitcher for another kind of context", () => {
  it("names the trigger with the noun and reads Choose a project until one is chosen", () => {
    const view = render(
      <TooltipProvider>
        <ContextSwitcher items={PROJECTS} value={null} onValueChange={vi.fn()} labels={labels} all={false} />
      </TooltipProvider>,
    );
    expect(screen.getByRole("combobox", { name: "Project: Choose a project" })).toBeInTheDocument();
    view.rerender(
      <TooltipProvider>
        <ContextSwitcher items={PROJECTS} value="atlas" onValueChange={vi.fn()} labels={labels} all={false} />
      </TooltipProvider>,
    );
    expect(
      screen.getByRole("combobox", { name: "Project: Atlas redesign and 1 project under it" }),
    ).toHaveAttribute("data-scope", "atlas");
    expect(document.querySelector(".fa-context-switcher .fa-context-avatar [data-testid='folder']")).not.toBeNull();
  });

  it("lists projects without an all row and labels search, groups and empty results", () => {
    const choose = vi.fn();
    render(
      <TooltipProvider>
        <ContextSwitcherPanel items={PROJECTS} value="harbour" onValueChange={choose} labels={labels} all={false} />
      </TooltipProvider>,
    );
    expect(screen.queryByRole("option", { name: /^All/ })).not.toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Projects" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Harbour survey" })).toHaveAttribute("aria-selected", "true");
    fireEvent.click(screen.getByRole("option", { name: "Atlas website" }));
    expect(choose).toHaveBeenCalledWith("atlas-web");
    fireEvent.change(screen.getByRole("combobox", { name: "Search projects" }), { target: { value: "zzz" } });
    expect(screen.getByText("No projects match “zzz”")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Search projects" })).toHaveAttribute("placeholder", "Find a project");
  });

  it("keeps the organisation defaults when no labels are given", () => {
    render(
      <TooltipProvider>
        <ContextSwitcher items={PROJECTS} value={null} onValueChange={vi.fn()} />
      </TooltipProvider>,
    );
    expect(screen.getByRole("combobox", { name: "Organisation: All organisations" })).toBeInTheDocument();
  });

  it("draws an avatar from a logo, an icon or initials, and the all glyph", () => {
    render(
      <>
        <ContextAvatar item={{ id: "a", name: "Atlas redesign", icon: <Folder /> }} decorative={false} />
        <ContextAvatar item={{ id: "h", name: "Harbour survey" }} decorative={false} />
        <ContextAvatar item={null} icon={<Folder />} allLabel="All projects" decorative={false} />
      </>,
    );
    expect(screen.getByRole("img", { name: "Atlas redesign" }).querySelector(".fa-context-avatar-icon")).not.toBeNull();
    expect(screen.getByRole("img", { name: "Harbour survey" })).toHaveTextContent("HS");
    expect(screen.getByRole("img", { name: "All projects" })).toHaveAttribute("data-tint", "all");
  });
});
