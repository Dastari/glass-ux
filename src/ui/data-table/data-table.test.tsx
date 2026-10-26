// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { TooltipProvider } from "../tooltip/index.js";
import { createDataTableColumns } from "./columns.js";
import { DataTable } from "./data-table.js";

const dimensions = vi.hoisted(() => ({ width: 1200 }));
vi.mock("../../lib/use-element-size.js", () => ({
  useElementSize: () => ({ width: dimensions.width, height: 500 }),
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
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(
    function () {
      return this.classList.contains("fa-dt-scroll") ? 400 : 0;
    },
  );
});
afterEach(() => {
  cleanup();
  localStorage.clear();
  dimensions.width = 1200;
});
afterAll(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

interface Device {
  id: string;
  name: string;
  serial: string;
}
const col = createDataTableColumns<Device>();
const columns = col.columns([
  col.accessor("name", { header: "Name", pin: true, cardRole: "title" }),
  col.accessor("serial", { header: "Serial", cardRole: "meta" }),
]);
const rows: Device[] = [
  { id: "a", name: "Acorn workstation", serial: "ACORN-42" },
];
const defaults = ["name", "serial", "unknown"] as const;
function Table() {
  return (
    <TooltipProvider>
      <DataTable
        id="default-columns"
        label="Devices"
        rows={rows}
        columns={columns}
        getRowId={(row) => row.id}
        getRowLabel={(row) => row.name}
        rowCount={1}
        height="auto"
        selectable={false}
        defaultHiddenColumns={defaults}
      />
    </TooltipProvider>
  );
}

describe("default-hidden table columns", () => {
  it("omits hidden headers in SSR but retains required columns and a detail control", () => {
    const html = renderToString(<Table />);
    const root = document.createElement("div");
    root.innerHTML = html;
    expect(root.querySelector('.fa-dt-th[data-col="name"]')).not.toBeNull();
    expect(root.querySelector('.fa-dt-th[data-col="serial"]')).toBeNull();
    expect(
      root.querySelector(
        '[aria-label="Show 1 more fields for Acorn workstation"]',
      ),
    ).not.toBeNull();
  });

  it("keeps hidden fields in +N and in the chooser; reset restores the application defaults", () => {
    const view = render(<Table />);
    expect(
      view.container.querySelector('.fa-dt-th[data-col="serial"]'),
    ).toBeNull();
    fireEvent.click(
      screen.getByRole("button", {
        name: "Show 1 more fields for Acorn workstation",
      }),
    );
    expect(
      view.container.querySelector('.fa-dt-detail [data-col="serial"]'),
    ).toHaveTextContent("ACORN-42");
    fireEvent.click(
      screen.getByRole("button", { name: "Columns and density" }),
    );
    const serial = screen.getByRole("menuitemcheckbox", {
      name: "Serial",
      exact: true,
    });
    expect(serial).toHaveAttribute("aria-checked", "false");
    fireEvent.click(serial);
    expect(
      view.container.querySelector('.fa-dt-th[data-col="serial"]'),
    ).not.toBeNull();
    fireEvent.click(screen.getByRole("menuitem", { name: "Reset columns" }));
    expect(
      view.container.querySelector('.fa-dt-th[data-col="serial"]'),
    ).toBeNull();
    expect(
      JSON.parse(localStorage.getItem("glass-ux.table.default-columns.v1")!)
        .hidden,
    ).toEqual([...defaults]);
  });

  it("honours an explicitly saved all-visible choice", () => {
    localStorage.setItem(
      "glass-ux.table.default-columns.v1",
      JSON.stringify({ hidden: [] }),
    );
    const view = render(<Table />);
    expect(
      view.container.querySelector('.fa-dt-th[data-col="serial"]'),
    ).not.toBeNull();
  });

  it("keeps hidden fields and the column chooser available in cards", () => {
    dimensions.width = 320;
    const view = render(<Table />);
    expect(
      view.container.querySelector('.fa-dt[data-mode="cards"]'),
    ).not.toBeNull();
    expect(screen.queryByText("ACORN-42")).not.toBeInTheDocument();
    const more = screen.getByRole("button", {
      name: "Show 1 more fields for Acorn workstation",
    });
    fireEvent.click(more);
    expect(
      view.container.querySelector('.fa-dt-card-details [data-col="serial"]'),
    ).toHaveTextContent("ACORN-42");
    fireEvent.click(
      screen.getByRole("button", {
        name: "Hide 1 more fields for Acorn workstation",
      }),
    );
    expect(screen.queryByText("ACORN-42")).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Columns and density" }),
    );
    fireEvent.click(
      screen.getByRole("menuitemcheckbox", { name: "Serial", exact: true }),
    );
    expect(
      screen.getByRole("menuitemcheckbox", { name: "Serial", exact: true }),
    ).toHaveAttribute("aria-checked", "true");
    expect(
      view.container.querySelector('.fa-dt-card-meta [data-col="serial"]'),
    ).toHaveTextContent("ACORN-42");
  });
});

describe("status bar update time", () => {
  it("reads a refresh newer than the shared clock as just now", () => {
    render(
      <TooltipProvider>
        <DataTable
          id="updated-at"
          label="Devices"
          rows={rows}
          columns={columns}
          getRowId={(row) => row.id}
          rowCount={1}
          height="auto"
          selectable={false}
          updatedAt={Date.now() + 5_000}
        />
      </TooltipProvider>,
    );
    expect(screen.getByText("Updated just now")).toBeInTheDocument();
    expect(screen.queryByText(/Updated in/)).not.toBeInTheDocument();
  });
});

describe("rowOpen", () => {
  function OpenTable({
    onRowOpen,
    rowOpen,
  }: {
    onRowOpen: (row: Device) => void;
    rowOpen?: "click" | "double-click";
  }) {
    return (
      <TooltipProvider>
        <DataTable
          id="row-open"
          label="Devices"
          rows={rows}
          columns={columns}
          getRowId={(row) => row.id}
          getRowLabel={(row) => row.name}
          rowCount={1}
          height="auto"
          onRowOpen={onRowOpen}
          rowOpen={rowOpen}
        />
      </TooltipProvider>
    );
  }
  const row = (container: HTMLElement) =>
    container.querySelector<HTMLElement>("[data-item='row']")!;
  const cell = (container: HTMLElement) =>
    row(container).querySelector<HTMLElement>("[role='gridcell'], [role='cell']") ?? row(container);

  it("opens on double-click by default, not on a click", () => {
    const open = vi.fn();
    const { container } = render(<OpenTable onRowOpen={open} />);
    fireEvent.click(cell(container), { detail: 1 });
    expect(open).not.toHaveBeenCalled();
    fireEvent.doubleClick(cell(container), { detail: 2 });
    expect(open).toHaveBeenCalledWith(rows[0]);
    expect(container.querySelector("[data-row-open]")).toBeNull();
  });

  it("opens on one primary click in click mode, once for a double-click", () => {
    const open = vi.fn();
    const { container } = render(<OpenTable onRowOpen={open} rowOpen="click" />);
    expect(container.querySelector("[data-row-open='click']")).not.toBeNull();
    fireEvent.click(cell(container), { detail: 1 });
    expect(open).toHaveBeenCalledTimes(1);
    expect(open).toHaveBeenCalledWith(rows[0]);
    fireEvent.click(cell(container), { detail: 2 });
    fireEvent.doubleClick(cell(container), { detail: 2 });
    expect(open).toHaveBeenCalledTimes(1);
  });

  it("ignores modified, non-primary and control clicks in click mode", () => {
    const open = vi.fn();
    const { container } = render(<OpenTable onRowOpen={open} rowOpen="click" />);
    for (const modifier of ["shiftKey", "ctrlKey", "metaKey", "altKey"])
      fireEvent.click(cell(container), { detail: 1, [modifier]: true });
    fireEvent.click(cell(container), { detail: 1, button: 1 });
    const checkbox = row(container).querySelector("[role='checkbox'], input, button");
    expect(checkbox).not.toBeNull();
    fireEvent.click(checkbox!, { detail: 1 });
    expect(open).not.toHaveBeenCalled();
  });

  it("ignores a click that ends a text selection in the row", () => {
    const open = vi.fn();
    const { container } = render(<OpenTable onRowOpen={open} rowOpen="click" />);
    const text = screen.getAllByText("ACORN-42")[0]!;
    const range = document.createRange();
    range.selectNodeContents(text);
    window.getSelection()!.removeAllRanges();
    window.getSelection()!.addRange(range);
    fireEvent.click(cell(container), { detail: 1 });
    expect(open).not.toHaveBeenCalled();
    window.getSelection()!.removeAllRanges();
    fireEvent.click(cell(container), { detail: 1 });
    expect(open).toHaveBeenCalledTimes(1);
  });

  it("still opens on Enter in click mode", () => {
    const open = vi.fn();
    const { container } = render(<OpenTable onRowOpen={open} rowOpen="click" />);
    fireEvent.keyDown(row(container), { key: "Enter" });
    expect(open).toHaveBeenCalledWith(rows[0]);
  });
});

describe("column header names", () => {
  it("names each header by its label alone; its controls keep their own names", () => {
    const filterable = col.columns([
      col.accessor("name", { header: "Name", pin: true, cardRole: "title" }),
      col.accessor("serial", {
        header: "Serial",
        cardRole: "meta",
        filter: { type: "text" },
      }),
    ]);
    render(
      <TooltipProvider>
        <DataTable
          id="header-names"
          label="Devices"
          rows={rows}
          columns={filterable}
          getRowId={(row) => row.id}
          rowCount={1}
          height="auto"
          selectable={false}
          defaultState={{ filters: [{ id: "serial", value: "ACORN" }] }}
        />
      </TooltipProvider>,
    );
    expect(
      screen.getByRole("columnheader", { name: "Name" }),
    ).toBeInTheDocument();
    // A filtered header is still named by its label; the state stays in its text.
    const serial = screen.getByRole("columnheader", { name: "Serial" });
    expect(serial).toHaveAttribute("data-filtered");
    expect(serial).toHaveTextContent("Serial, filtered");
    expect(
      screen.getByRole("button", { name: "Serial column options" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("separator", { name: "Resize Serial column" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Reorder Serial column")).toBeInTheDocument();
  });
});
