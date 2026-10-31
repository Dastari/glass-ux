// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "../tooltip/index.js";
import { createDataTableColumns } from "./columns.js";
import { DataTable } from "./data-table.js";

vi.mock("../../lib/use-element-size.js", () => ({
  useElementSize: () => ({ width: 1200, height: 500 }),
}));
beforeAll(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(function () {
    return this.classList.contains("fa-dt-scroll") ? 400 : 0;
  });
});
beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  cleanup();
  localStorage.clear();
});
afterAll(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

interface Device {
  id: string;
  name: string;
}
const col = createDataTableColumns<Device>();
const columns = col.columns([col.accessor("name", { header: "Name", cardRole: "title" })]);
const ALL: Device[] = [
  { id: "a", name: "Acorn" },
  { id: "b", name: "Birch" },
  { id: "c", name: "Cedar" },
];

/** The host filters the rows (as a server-backed table does) and passes the matching count. */
function Table({ loading = false }: { loading?: boolean }) {
  return (
    <TooltipProvider>
      <DataTable
        id="announce"
        label="Devices"
        rows={ALL}
        rowCount={ALL.length}
        columns={columns}
        getRowId={(row) => row.id}
        getRowLabel={(row) => row.name}
        search={{ fields: ["name"] }}
        loading={loading}
        height="auto"
        selectable={false}
      />
    </TooltipProvider>
  );
}

const live = () => document.querySelector('.fa-dt-announcer[aria-live="polite"]');

describe("announcing search results", () => {
  it("says nothing on first render", () => {
    render(<Table />);
    act(() => void vi.advanceTimersByTime(2000));
    expect(live()?.textContent).toBe("");
  });

  it("announces the count once, 500 ms after the last search change", () => {
    render(<Table />);
    const box = screen.getByRole("searchbox", { name: "Search rows" });
    fireEvent.change(box, { target: { value: "a" } });
    act(() => void vi.advanceTimersByTime(300));
    fireEvent.change(box, { target: { value: "ac" } });
    // 220 ms of typing pause commits the query; 500 ms after that the count is announced.
    act(() => void vi.advanceTimersByTime(220 + 400));
    expect(live()?.textContent).toBe("");
    act(() => void vi.advanceTimersByTime(200));
    expect(live()?.textContent).toBe("Results: 3 rows");
  });

  it("waits for a loading table to settle", () => {
    const view = render(<Table loading />);
    const box = screen.getByRole("searchbox", { name: "Search rows" });
    fireEvent.change(box, { target: { value: "ac" } });
    act(() => void vi.advanceTimersByTime(220 + 600));
    expect(live()?.textContent).toBe("");
    view.rerender(<Table />);
    expect(live()?.textContent).toBe("Results: 3 rows");
  });
});
