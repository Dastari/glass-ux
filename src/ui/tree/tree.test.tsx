// @vitest-environment jsdom
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Tree } from "./tree.js";

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

describe("large tree virtualization", () => {
  it("does not revisit every node on scroll and preserves changed node order", () => {
    let reads = 0;
    const nodes = Array.from({ length: 1000 }, (_, index) => ({
      get id() {
        reads++;
        return String(index);
      },
      label: `Node ${index}`,
    }));
    const view = render(<Tree nodes={nodes} aria-label="Nodes" />);
    const scroller = view.getByRole("tree");
    reads = 0;
    act(() => {
      scroller.scrollTop = 400;
      fireEvent.scroll(scroller);
    });
    expect(reads).toBeLessThan(500);
    expect(
      view.container.querySelectorAll("[data-row-id]").length,
    ).toBeLessThan(30);
    const reordered = [...nodes];
    [reordered[10], reordered[11]] = [reordered[11]!, reordered[10]!];
    view.rerender(<Tree nodes={reordered} aria-label="Nodes" />);
    // Probes have no CSS box in jsdom, so the fallback leaf height is 36px.
    expect(
      view.container.querySelector('[data-row-id="11"]')?.getAttribute("style"),
    ).toContain("360px");
  });
});
