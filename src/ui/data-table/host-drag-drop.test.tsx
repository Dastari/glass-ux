// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { DragDropProvider, Draggable } from "../drag-drop/index.js";
import { TooltipProvider } from "../tooltip/index.js";
import { createDataTableColumns } from "./columns.js";
import { DataTable } from "./data-table.js";
import { dataTableMessages } from "./messages.js";

vi.mock("../../lib/use-element-size.js", () => ({ useElementSize: () => ({ width: 1200, height: 500 }) }));
beforeAll(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  Element.prototype.scrollIntoView = () => {};
  // jsdom has no layout: give the body a height so its rows render.
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(function (this: HTMLElement) {
    return this.classList.contains("fa-dt-scroll") ? 400 : 0;
  });
});
afterEach(cleanup);
afterAll(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

interface Job { id: string; title: string }
const col = createDataTableColumns<Job>();
const columns = col.columns([
  col.accessor("title", { header: "Job", cell: ({ row }) => <Draggable id={`job:${row.original.id}`} type="job" label={row.original.title}>{row.original.title}</Draggable> }),
  col.accessor("id", { header: "Reference" }),
]);
const rows: Job[] = [{ id: "14", title: "August service" }];
const table = <DataTable<Job> id="jobs" label="Jobs to book" rows={rows} columns={columns} getRowId={(row) => row.id} getRowLabel={(row) => row.title} rowCount={1} />;
const described = (element: Element | null) => document.getElementById(element?.getAttribute("aria-describedby") ?? "")?.textContent;

describe("DataTable inside a host DragDropProvider", () => {
  it("joins it: one drag and drop system, cells use the host's instructions, columns keep their own", () => {
    render(
      <TooltipProvider>
        <DragDropProvider instructions="Drag a job onto a technician's day.">{table}</DragDropProvider>
      </TooltipProvider>,
    );
    expect(document.querySelectorAll(".fa-dnd-announcer")).toHaveLength(1);
    const cellHandle = document.querySelector(".fa-dt-cell [data-dnd-handle]");
    expect(described(cellHandle)).toBe("Drag a job onto a technician's day.");
    const columnHandle = document.querySelector(".fa-dt-head-row [data-dnd-handle]");
    expect(described(columnHandle)).toBe(dataTableMessages.defaults.columnDragInstructions);
  });

  it("brings its own without one", () => {
    render(<TooltipProvider>{table}</TooltipProvider>);
    expect(document.querySelectorAll(".fa-dnd-announcer")).toHaveLength(1);
    expect(described(document.querySelector(".fa-dt-head-row [data-dnd-handle]"))).toBe(dataTableMessages.defaults.columnDragInstructions);
  });
});
