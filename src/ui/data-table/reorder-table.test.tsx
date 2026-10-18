// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState, type ReactNode } from "react";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "../tooltip/index.js";
import { createDataTableColumns } from "./columns.js";
import { DataTable } from "./data-table.js";
import { moveRow } from "./reorder.js";
import type { DataTableReorder, DataTableRowMove, DataTableState } from "./types.js";

vi.mock("../../lib/use-element-size.js", () => ({
  useElementSize: () => ({ width: 1200, height: 500 }),
}));
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
  // jsdom has no layout. Give the real virtualizer a nonempty scroll viewport.
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(function (this: HTMLElement) {
    return this.classList.contains("fa-dt-scroll") ? 400 : 0;
  });
});
afterEach(() => {
  cleanup();
  localStorage.clear();
});
afterAll(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

interface Track {
  id: string;
  title: string;
  album: string;
}
const col = createDataTableColumns<Track>();
const columns = col.columns([
  col.accessor("title", { header: "Title", cardRole: "title", sortable: true }),
  col.accessor("album", { header: "Album" }),
]);
const TRACKS: Track[] = [
  { id: "a", title: "Alpha", album: "One" },
  { id: "b", title: "Beta", album: "One" },
  { id: "c", title: "Gamma", album: "Two" },
  { id: "d", title: "Delta", album: "Two" },
];

type Reorder = Partial<DataTableReorder<Track>>;
function Host({
  reorder,
  state,
  initial = TRACKS,
  children,
  extra,
}: {
  reorder?: Reorder;
  state?: Partial<DataTableState>;
  initial?: Track[];
  children?: ReactNode;
  extra?: Partial<Parameters<typeof DataTable<Track>>[0]>;
}) {
  const [rows, setRows] = useState(initial);
  return (
    <TooltipProvider>
      <DataTable<Track>
        id="reorder-test"
        label="Playlist"
        rows={rows}
        rowCount={rows.length}
        columns={columns}
        getRowId={(row) => row.id}
        getRowLabel={(row) => row.title}
        height="auto"
        state={state}
        reorder={{
          onReorder: (move) => setRows(move.rows),
          ...reorder,
        }}
        {...extra}
      />
      {children}
    </TooltipProvider>
  );
}

const order = (container: HTMLElement) =>
  [...container.querySelectorAll('.fa-dt-row[data-item="row"] [data-col="title"]')].map(
    (cell) => cell.textContent,
  );
const announcer = (container: HTMLElement) =>
  container.querySelector(".fa-dt-announcer")?.textContent?.trim();
const grip = (name: string) => screen.getByRole("button", { name: `Reorder ${name}` });

describe("DataTable reorder", () => {
  it("adds an accessible grip before the checkbox and a column header", () => {
    const view = render(<Host />);
    const handle = grip("Beta");
    const row = handle.closest('[role="row"]')!;
    const cells = row.querySelectorAll('[role="gridcell"]');
    expect(cells[0]).toHaveClass("fa-dt-grip");
    expect(cells[1]).toHaveClass("fa-dt-select");
    expect(handle).not.toHaveAttribute("aria-disabled");
    const help = document.getElementById(handle.getAttribute("aria-describedby")!);
    expect(help?.textContent).toMatch(/Space to lift/);
    expect(view.container.querySelector('.fa-dt-th.fa-dt-grip')).toHaveTextContent("Row order");
    expect(view.container.querySelector(".fa-dt-grid")).toHaveAttribute("aria-colcount", "5");
  });

  it("lifts, moves and drops with the keyboard, announcing each step and keeping focus", () => {
    const onReorder = vi.fn<(move: DataTableRowMove<Track>) => void>();
    const view = render(<Host reorder={{ onReorder }} />);
    const handle = grip("Beta");
    handle.focus();
    fireEvent.keyDown(handle, { key: " " });
    expect(announcer(view.container)).toMatch(/^Lifted Beta, position 2 of 4\./);
    expect(handle.closest('[role="row"]')).toHaveAttribute("data-reorder-lifted");
    fireEvent.keyDown(handle, { key: "ArrowDown" });
    expect(announcer(view.container)).toBe("Beta, position 3 of 4.");
    fireEvent.keyDown(handle, { key: "ArrowDown" });
    fireEvent.keyDown(handle, { key: "ArrowDown" });
    expect(announcer(view.container)).toBe("Beta, position 4 of 4.");
    fireEvent.keyDown(handle, { key: "ArrowUp" });
    fireEvent.keyDown(handle, { key: " " });
    expect(onReorder).toHaveBeenCalledTimes(1);
    const move = onReorder.mock.calls[0]![0];
    expect(move).toMatchObject({ rowId: "b", from: 1, to: 2, previousId: "c", nextId: "d", source: "keyboard" });
    expect(move.rows.map((row) => row.id)).toEqual(["a", "c", "b", "d"]);
    expect(announcer(view.container)).toBe("Dropped Beta at position 3 of 4.");
    // The host did not update rows: the table shows the move until it does.
    expect(order(view.container)).toEqual(["Alpha", "Gamma", "Beta", "Delta"]);
    expect(document.activeElement).toBe(grip("Beta"));
    expect(grip("Beta").closest('[role="row"]')).not.toHaveAttribute("data-reorder-lifted");
  });

  it("applies the host's new rows and keeps the moved row active", () => {
    const view = render(<Host />);
    const handle = grip("Delta");
    handle.focus();
    fireEvent.keyDown(handle, { key: "Enter" });
    fireEvent.keyDown(handle, { key: "Home" });
    fireEvent.keyDown(handle, { key: "Enter" });
    expect(order(view.container)).toEqual(["Delta", "Alpha", "Beta", "Gamma"]);
    expect(grip("Delta").closest('[role="row"]')).toHaveAttribute("tabindex", "0");
    expect(document.activeElement).toBe(grip("Delta"));
  });

  it("cancels with Escape and on blur without reporting a move", () => {
    const onReorder = vi.fn();
    const view = render(<Host reorder={{ onReorder }} />);
    const handle = grip("Alpha");
    handle.focus();
    fireEvent.keyDown(handle, { key: " " });
    fireEvent.keyDown(handle, { key: "ArrowDown" });
    fireEvent.keyDown(handle, { key: "Escape" });
    expect(announcer(view.container)).toBe("Reorder cancelled. Alpha returned to position 1 of 4.");
    fireEvent.keyDown(handle, { key: " " });
    fireEvent.blur(handle);
    expect(announcer(view.container)).toMatch(/^Reorder cancelled/);
    expect(onReorder).not.toHaveBeenCalled();
    expect(order(view.container)).toEqual(["Alpha", "Beta", "Gamma", "Delta"]);
  });

  it("moves one place at once with Alt+Arrow", () => {
    const onReorder = vi.fn<(move: DataTableRowMove<Track>) => void>();
    render(<Host reorder={{ onReorder }} />);
    fireEvent.keyDown(grip("Gamma"), { key: "ArrowUp", altKey: true });
    expect(onReorder.mock.calls[0]![0]).toMatchObject({ rowId: "c", from: 2, to: 1, previousId: "a", nextId: "b" });
    fireEvent.keyDown(grip("Alpha"), { key: "ArrowUp", altKey: true });
    expect(onReorder).toHaveBeenCalledTimes(1);
  });

  it("disables every grip while sorted and says why", () => {
    const onReorder = vi.fn();
    const view = render(<Host reorder={{ onReorder }} state={{ sorting: [{ id: "title", desc: false }] }} />);
    const handle = grip("Beta");
    expect(handle).toHaveAttribute("aria-disabled", "true");
    expect(document.getElementById(handle.getAttribute("aria-describedby")!)?.textContent).toBe("Clear sorting to reorder");
    fireEvent.keyDown(handle, { key: " " });
    expect(announcer(view.container)).toBe("Clear sorting to reorder");
    fireEvent.keyDown(handle, { key: "ArrowDown", altKey: true });
    expect(onReorder).not.toHaveBeenCalled();
  });

  it("disables reordering on one page of several unless withinPage", () => {
    const { rerender } = render(<Host extra={{ rowCount: 40 }} />);
    expect(grip("Beta")).toHaveAttribute("aria-disabled", "true");
    rerender(<Host extra={{ rowCount: 40 }} reorder={{ withinPage: true }} />);
    expect(grip("Beta")).not.toHaveAttribute("aria-disabled");
  });

  it("locks rows with canReorder and explains with lockedReason", () => {
    render(<Host reorder={{ canReorder: (row) => row.id !== "a", lockedReason: () => "Now playing" }} />);
    const locked = grip("Alpha");
    expect(locked).toHaveAttribute("aria-disabled", "true");
    expect(document.getElementById(locked.getAttribute("aria-describedby")!)?.textContent).toBe("Now playing");
    expect(grip("Beta")).not.toHaveAttribute("aria-disabled");
  });

  it("shows a pending move, blocks the next one and reverts when the promise rejects", async () => {
    let reject: (error: Error) => void = () => {};
    const onError = vi.fn();
    const view = render(
      <Host
        reorder={{
          onReorder: () => new Promise((_, fail) => (reject = fail)),
          onError,
        }}
      />,
    );
    fireEvent.keyDown(grip("Alpha"), { key: "ArrowDown", altKey: true });
    expect(order(view.container)).toEqual(["Beta", "Alpha", "Gamma", "Delta"]);
    expect(grip("Gamma")).toHaveAttribute("aria-disabled", "true");
    expect(document.getElementById(grip("Gamma").getAttribute("aria-describedby")!)?.textContent).toBe("Saving the previous move…");
    await act(async () => {
      reject(new Error("Offline"));
      await Promise.resolve();
    });
    expect(order(view.container)).toEqual(["Alpha", "Beta", "Gamma", "Delta"]);
    expect(announcer(view.container)).toBe("Alpha could not be moved: Offline. Returned to position 1 of 4.");
    expect(onError).toHaveBeenCalledWith(expect.any(Error), expect.objectContaining({ rowId: "a", to: 1 }));
    expect(grip("Gamma")).not.toHaveAttribute("aria-disabled");
  });

  it("keeps a resolved move until the host's rows arrive", async () => {
    let resolve: () => void = () => {};
    function Server() {
      const [rows, setRows] = useState(TRACKS);
      return (
        <DataTable<Track>
          id="reorder-server"
          label="Playlist"
          rows={rows}
          rowCount={rows.length}
          columns={columns}
          getRowId={(row) => row.id}
          getRowLabel={(row) => row.title}
          height="auto"
          reorder={{
            onReorder: (move) =>
              new Promise<void>((done) => {
                resolve = () => {
                  done();
                  setRows((current) => moveRow(current, move.from, move.to));
                };
              }),
          }}
        />
      );
    }
    const view = render(<Server />);
    fireEvent.keyDown(grip("Delta"), { key: "ArrowUp", altKey: true });
    expect(order(view.container)).toEqual(["Alpha", "Beta", "Delta", "Gamma"]);
    await act(async () => {
      resolve();
      await Promise.resolve();
    });
    expect(order(view.container)).toEqual(["Alpha", "Beta", "Delta", "Gamma"]);
    expect(grip("Alpha")).not.toHaveAttribute("aria-disabled");
  });

  it("moves within a group with withinGroups, and is disabled when grouped otherwise", () => {
    const grouping = {
      groupOf: (row: Track) => row.album,
      groups: [
        { id: "One", label: "One", count: 2 },
        { id: "Two", label: "Two", count: 2 },
      ],
    };
    const onReorder = vi.fn<(move: DataTableRowMove<Track>) => void>();
    const { rerender, container } = render(<Host reorder={{ onReorder }} extra={{ grouping }} />);
    expect(grip("Gamma")).toHaveAttribute("aria-disabled", "true");
    rerender(<Host reorder={{ onReorder, withinGroups: true }} extra={{ grouping }} />);
    const handle = grip("Gamma");
    handle.focus();
    fireEvent.keyDown(handle, { key: " " });
    expect(announcer(container)).toMatch(/position 1 of 2 in Two/);
    // Cannot leave its group.
    fireEvent.keyDown(handle, { key: "ArrowUp" });
    fireEvent.keyDown(handle, { key: "End" });
    fireEvent.keyDown(handle, { key: "ArrowDown" });
    fireEvent.keyDown(handle, { key: " " });
    expect(onReorder.mock.calls[0]![0]).toMatchObject({ rowId: "c", from: 2, to: 3, previousId: "d", nextId: null, group: "Two" });
  });
});

describe("DataTable row renderers", () => {
  it("redraws memoised rows when row-level renderers change (permissions arrive)", () => {
    const columnsOnly = (label: string) => (row: Track) => <button type="button">{`${label} ${row.title}`}</button>;
    const table = (render: (row: Track) => ReactNode) => (
      <DataTable<Track>
        id="renderers"
        label="Playlist"
        rows={TRACKS}
        rowCount={TRACKS.length}
        columns={columns}
        getRowId={(row) => row.id}
        height="auto"
        renderRowActions={render}
      />
    );
    const view = render(table(columnsOnly("View")));
    expect(screen.getByRole("button", { name: "View Alpha" })).toBeInTheDocument();
    view.rerender(table(columnsOnly("Edit")));
    expect(screen.getByRole("button", { name: "Edit Alpha" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "View Alpha" })).not.toBeInTheDocument();
  });

  it("marks a selected row followed by a selected row with data-selected-next", () => {
    const view = render(
      <DataTable<Track>
        id="selection-band"
        label="Playlist"
        rows={TRACKS}
        rowCount={TRACKS.length}
        columns={columns}
        getRowId={(row) => row.id}
        height="auto"
        state={{ selection: { a: true, b: true, d: true } }}
      />,
    );
    const row = (id: string) => view.container.querySelector(`[data-row-id="${id}"]`);
    expect(row("a")).toHaveAttribute("data-selected-next");
    expect(row("b")).not.toHaveAttribute("data-selected-next");
    expect(row("d")).not.toHaveAttribute("data-selected-next");
  });
});
