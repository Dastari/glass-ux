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
