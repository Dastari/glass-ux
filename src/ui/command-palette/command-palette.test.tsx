// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { Button } from "../button/index.js";
import { TooltipProvider } from "../tooltip/index.js";
import {
  CommandPanel,
  DEFAULT_PALETTE_GROUP_ORDER,
  PaletteProvider,
  usePaletteCommands,
  type PaletteCommand,
} from "./command-palette.js";

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
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
afterAll(() => vi.unstubAllGlobals());

function Commands({ run }: { run: () => void }) {
  usePaletteCommands([
    {
      id: "save",
      label: "Save document",
      group: "Actions",
      shortcut: "mod+s",
      run,
    },
  ]);
  return null;
}

function Host({ run }: { run: () => void }) {
  return (
    <TooltipProvider>
      <PaletteProvider>
        <Commands run={run} />
        <Button disabledReason="Saving is unavailable" onClick={run}>
          Save
        </Button>
        <input
          aria-label="Document"
          onKeyDown={(event) => event.preventDefault()}
        />
      </PaletteProvider>
    </TooltipProvider>
  );
}

describe("global command palette shortcut", () => {
  for (const platform of ["Win32", "MacIntel"]) {
    it(`opens from a focusable disabled button on ${platform} without activating it`, async () => {
      vi.spyOn(navigator, "platform", "get").mockReturnValue(platform);
      const run = vi.fn();
      render(<Host run={run} />);
      const save = screen.getByRole("button", { name: "Save", exact: true });
      save.focus();
      expect(save).toHaveFocus();
      fireEvent.keyDown(save, { key: "Enter" });
      fireEvent.keyDown(save, { key: " " });
      fireEvent.keyUp(save, { key: " " });
      fireEvent.click(save);
      expect(run).not.toHaveBeenCalled();
      fireEvent.keyDown(save, {
        key: "k",
        ctrlKey: platform === "Win32",
        metaKey: platform === "MacIntel",
      });
      expect(
        await screen.findByRole("dialog", { name: "Command palette" }),
      ).toBeVisible();
      expect(run).not.toHaveBeenCalled();
      expect(save).toHaveAttribute("aria-disabled", "true");
    });
  }

  it("respects prevented shortcuts from an ordinary editable control", () => {
    const run = vi.fn();
    render(<Host run={run} />);
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Document" }), {
      key: "k",
      ctrlKey: true,
    });
    expect(
      screen.queryByRole("dialog", { name: "Command palette" }),
    ).toBeNull();
    expect(run).not.toHaveBeenCalled();
  });

  it("does not bypass disabled key handling for another registered action or key repeats", () => {
    const run = vi.fn();
    render(<Host run={run} />);
    const save = screen.getByRole("button", { name: "Save", exact: true });
    fireEvent.keyDown(save, { key: "s", ctrlKey: true });
    fireEvent.keyDown(save, { key: "k", ctrlKey: true, repeat: true });
    expect(
      screen.queryByRole("dialog", { name: "Command palette" }),
    ).toBeNull();
    expect(run).not.toHaveBeenCalled();
  });
});

describe("command panel group order", () => {
  const command = (id: string, group: string): PaletteCommand => ({
    id,
    label: id,
    group,
    run: () => undefined,
  });
  const commands = [
    command("go-home", "Navigation"),
    command("new-item", "Actions"),
    command("alpha", "Projects"),
    command("beta", "Endpoints"),
  ];
  const labels = () =>
    [...document.querySelectorAll(".fa-palette-group .fa-popup-group-label")].map(
      (node) => node.textContent,
    );

  it("places host groups in registration order before the generic groups", () => {
    expect(DEFAULT_PALETTE_GROUP_ORDER).toEqual(["Recent", "*", "Actions", "Navigation"]);
    render(<CommandPanel commands={commands} onRun={() => undefined} />);
    expect(labels()).toEqual(["Projects", "Endpoints", "Actions", "Navigation"]);
  });

  it("accepts a host group order", () => {
    render(
      <CommandPanel
        commands={commands}
        onRun={() => undefined}
        groupOrder={[...DEFAULT_PALETTE_GROUP_ORDER, "Endpoints"]}
      />,
    );
    expect(labels()).toEqual(["Projects", "Actions", "Navigation", "Endpoints"]);
  });
});
