// @vitest-environment jsdom
import { createRef } from "react";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import type { Row } from "@tanstack/react-table";
import type { Virtualizer } from "@tanstack/react-virtual";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VirtualRows, type VirtualRowsProps } from "./body.js";
import type { DataTableFeatures } from "./features.js";

// The geometry and range use the real virtualizer; the row only exposes its output.
vi.mock("./row.js", () => ({
  DataRow: ({ rowId, top }: { rowId: string; top: number }) => (
    <div data-row-id={rowId} data-top={top} />
  ),
}));
vi.mock("./group-rows.js", () => ({ GroupLine: () => null }));
beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(200);
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(800);
  HTMLElement.prototype.scrollTo = vi.fn();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("virtual row measurement caching", () => {
  it("limits scrolling work to visible rows and invalidates keys after an interior reorder", () => {
    let reads = 0;
    const rows = Array.from({ length: 1000 }, (_, index) => ({
      get id() {
        reads++;
        return String(index);
      },
      original: { name: String(index) },
    })) as Row<DataTableFeatures, { name: string }>[];
    const scrollRef = createRef<HTMLDivElement>();
    const virtualizerRef = createRef<Virtualizer<HTMLDivElement, Element>>();
    const props: VirtualRowsProps<{ name: string }> = {
      rows,
      scrollRef,
      virtualizerRef,
      columns: [],
      hidden: [],
      selection: {},
      selectable: false,
      activeIndex: 0,
      expanded: new Set(),
      expandAll: false,
      rowHeight: 40,
      detailHeight: 80,
      firstRowIndex: 2,
      renderAll: false,
      controller: {} as VirtualRowsProps<{ name: string }>["controller"],
      getLabel: (row) => row.name,
      noun: { one: "row", other: "rows" },
      colSpan: 1,
      containerProps: {},
      wrapContainer: (element) => element,
      revision: {},
    };
    function Body({
      data = rows,
      rowHeight = 40,
      expandAll = false,
    }: {
      data?: typeof rows;
      rowHeight?: number;
      expandAll?: boolean;
    }) {
      return (
        <div ref={scrollRef}>
          <VirtualRows
            {...props}
            rows={data}
            rowHeight={rowHeight}
            expandAll={expandAll}
            hidden={
              expandAll
                ? [{} as VirtualRowsProps<{ name: string }>["hidden"][number]]
                : props.hidden
            }
          />
        </div>
      );
    }
    const view = render(<Body />);
    expect(virtualizerRef.current?.getVirtualItems().length).toBeGreaterThan(0);
    reads = 0;
    act(() => {
      scrollRef.current!.scrollTop = 400;
      fireEvent.scroll(scrollRef.current!);
    });
    // Rebuilding 1,000 measurements on each scroll is a regression; a visible range is <30.
    expect(reads).toBeLessThan(250);
    expect(view.container.querySelector('[data-row-id="10"]')).not.toBeNull();
    const reordered = [...rows];
    [reordered[10], reordered[11]] = [reordered[11]!, reordered[10]!];
    view.rerender(<Body data={reordered} />);
    expect(
      virtualizerRef
        .current!.getVirtualItems()
        .find((item) => item.index === 10)?.key,
    ).toBe("11");
    expect(
      view.container
        .querySelector('[data-row-id="11"]')
        ?.getAttribute("data-top"),
    ).toBe("400");
    view.rerender(<Body data={reordered} rowHeight={50} />);
    expect(
      virtualizerRef
        .current!.getVirtualItems()
        .find((item) => item.index === 10)?.start,
    ).toBe(500);
    view.rerender(<Body data={reordered} rowHeight={50} expandAll />);
    expect(virtualizerRef.current!.getTotalSize()).toBe(1000 * (50 + 80));
  });
});
