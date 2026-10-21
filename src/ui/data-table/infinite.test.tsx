// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "../tooltip/index.js";
import { createDataTableColumns } from "./columns.js";
import { DataTable } from "./data-table.js";
import type { DataTableInfinite, DataTableProps } from "./types.js";

vi.mock("../../lib/use-element-size.js", () => ({
  useElementSize: () => ({ width: 1200, height: 500 }),
}));

/** The end line's observers, newest last; `reach()` brings the end of the list into view. */
const observers: FakeObserver[] = [];
class FakeObserver {
  disconnected = false;
  constructor(private callback: IntersectionObserverCallback) {
    observers.push(this);
  }
  observe() {}
  unobserve() {}
  disconnect() {
    this.disconnected = true;
  }
  fire(isIntersecting: boolean) {
    this.callback([{ isIntersecting } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
  }
}
function reach() {
  const live = observers.filter((observer) => !observer.disconnected);
  act(() => live.at(-1)?.fire(true));
}

beforeAll(() => {
  vi.stubGlobal("ResizeObserver", class {
    observe() {}
    unobserve() {}
    disconnect() {}
  });
  vi.stubGlobal("IntersectionObserver", FakeObserver);
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(function (this: HTMLElement) {
    return this.classList.contains("fa-dt-scroll") ? 400 : 0;
  });
});
afterEach(() => {
  cleanup();
  localStorage.clear();
  observers.length = 0;
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
const columns = col.columns([col.accessor("name", { header: "Name", cardRole: "title", flash: true })]);
const devices = (from: number, to: number): Device[] =>
  Array.from({ length: to - from }, (_, index) => ({ id: `d${from + index}`, name: `Device ${from + index}` }));
const NOUN = { one: "device", other: "devices" };

function Table({ rows, infinite, ...props }: { rows: Device[]; infinite: DataTableInfinite } & Partial<DataTableProps<Device>>) {
  return (
    <TooltipProvider>
      <DataTable<Device>
        id="infinite"
        label="Devices"
        rows={rows}
        columns={columns}
        getRowId={(row) => row.id}
        noun={NOUN}
        infinite={infinite}
        {...props}
      />
    </TooltipProvider>
  );
}

const endLine = (container: HTMLElement) => container.querySelector(".fa-dt-load-row");

describe("DataTable infinite loading", () => {
  it("stands a placeholder row after the rows and counts what is loaded instead of paging", () => {
    const view = render(<Table rows={devices(0, 3)} rowCount={10} infinite={{ hasMore: true, onLoadMore: () => {} }} />);
    expect(endLine(view.container)).toHaveAttribute("aria-hidden", "true");
    expect(view.container.querySelector(".fa-dt-count")).toHaveTextContent("3 of 10 devices");
    expect(view.container.querySelector(".fa-dt-pager")).toBeNull();
    expect(screen.getByRole("grid")).toHaveAttribute("aria-rowcount", "11");
    expect(screen.getByRole("checkbox", { name: "Select all loaded rows" })).toBeInTheDocument();
  });

  it("counts an unknown total as loaded so far, and drops the end line once there is no more", () => {
    const view = render(<Table rows={devices(0, 3)} infinite={{ hasMore: true, onLoadMore: () => {} }} />);
    expect(view.container.querySelector(".fa-dt-count")).toHaveTextContent("3 devices loaded");
    expect(screen.getByRole("grid")).toHaveAttribute("aria-rowcount", "-1");
    view.rerender(<Table rows={devices(0, 5)} infinite={{ hasMore: false, onLoadMore: () => {} }} />);
    expect(endLine(view.container)).toBeNull();
    expect(view.container.querySelector(".fa-dt-count")).toHaveTextContent("5 devices");
    expect(screen.getByRole("grid")).toHaveAttribute("aria-rowcount", "6");
  });

  it("asks for the next batch once as the end comes into view, then again after it arrives", () => {
    const onLoadMore = vi.fn();
    const view = render(<Table rows={devices(0, 3)} infinite={{ hasMore: true, onLoadMore }} />);
    reach();
    reach();
    expect(onLoadMore).toHaveBeenCalledTimes(1);
    view.rerender(<Table rows={devices(0, 3)} infinite={{ hasMore: true, loadingMore: true, onLoadMore }} />);
    reach();
    expect(onLoadMore).toHaveBeenCalledTimes(1);
    view.rerender(<Table rows={devices(0, 6)} infinite={{ hasMore: true, onLoadMore }} />);
    reach();
    expect(onLoadMore).toHaveBeenCalledTimes(2);
  });

  it("holds further requests while the returned promise is pending", async () => {
    let finish = () => {};
    const onLoadMore = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
    const view = render(<Table rows={devices(0, 3)} infinite={{ hasMore: true, onLoadMore }} />);
    reach();
    // A new result (sorted) while the batch is in flight does not start another.
    view.rerender(<Table rows={devices(0, 3)} state={{ sorting: [{ id: "name", desc: true }] }} infinite={{ hasMore: true, onLoadMore }} />);
    reach();
    expect(onLoadMore).toHaveBeenCalledTimes(1);
    await act(async () => finish());
    reach();
    expect(onLoadMore).toHaveBeenCalledTimes(2);
  });

  it("asks for nothing while the rows are being replaced by a new result", () => {
    const onLoadMore = vi.fn();
    const view = render(<Table rows={devices(0, 3)} refetching infinite={{ hasMore: true, onLoadMore }} />);
    reach();
    expect(onLoadMore).not.toHaveBeenCalled();
    view.rerender(<Table rows={devices(10, 13)} infinite={{ hasMore: true, onLoadMore }} />);
    reach();
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it("says a rejected batch failed, keeps the rows, and retries", async () => {
    const onLoadMore = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue(undefined);
    const view = render(<Table rows={devices(0, 3)} infinite={{ hasMore: true, onLoadMore }} />);
    await act(async () => reach());
    expect(endLine(view.container)).toHaveTextContent("Couldn't load more devices");
    expect(view.container.querySelectorAll(".fa-dt-row[data-row-id]").length).toBe(3);
    reach();
    expect(onLoadMore).toHaveBeenCalledTimes(1);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Retry" })));
    expect(onLoadMore).toHaveBeenCalledTimes(2);
    expect(endLine(view.container)).not.toHaveTextContent("Couldn't load more");
  });

  it("shows the host's error with Retry", () => {
    const onLoadMore = vi.fn();
    render(<Table rows={devices(0, 3)} infinite={{ hasMore: true, onLoadMore, error: "The device service timed out" }} />);
    reach();
    expect(onLoadMore).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it("appends a live table's next batch at once instead of holding it as new rows", () => {
    const view = render(<Table live rows={devices(0, 3)} infinite={{ hasMore: true, onLoadMore: () => {} }} />);
    const scroller = view.container.querySelector<HTMLElement>(".fa-dt-scroll")!;
    Object.defineProperty(scroller, "scrollTop", { configurable: true, value: 200 });
    view.rerender(<Table live rows={devices(0, 6)} infinite={{ hasMore: true, onLoadMore: () => {} }} />);
    expect(screen.queryByRole("button", { name: /new/ })).toBeNull();
    expect(view.container.querySelectorAll(".fa-dt-row[data-row-id]").length).toBe(6);
    // A row arriving above the loaded ones is still held behind the pill.
    view.rerender(<Table live rows={[{ id: "n1", name: "New device" }, ...devices(0, 6)]} infinite={{ hasMore: true, onLoadMore: () => {} }} />);
    expect(screen.getByRole("button", { name: "1 new" })).toBeInTheDocument();
  });

  it("is ignored by a grouped table", () => {
    const view = render(
      <Table
        rows={devices(0, 2)}
        grouping={{ groups: [{ id: "all", label: "All", count: 2 }], groupOf: () => "all" }}
        infinite={{ hasMore: true, onLoadMore: () => {} }}
      />,
    );
    expect(endLine(view.container)).toBeNull();
  });
});
