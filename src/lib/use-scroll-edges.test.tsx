// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import { useRef } from "react";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { useScrollEdges } from "./use-scroll-edges.js";

beforeAll(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});
afterEach(cleanup);
afterAll(() => vi.unstubAllGlobals());

function Frame() {
  const ref = useRef<HTMLDivElement>(null);
  const edges = useScrollEdges(ref, { root: ".frame" });
  return (
    <section className="frame">
      <div ref={ref} className="body" data-top={edges.top ? "" : undefined}>
        content
      </div>
    </section>
  );
}

const nextFrame = () => act(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));

describe("useScrollEdges root mirroring", () => {
  it("writes the scrolled edges onto the nearest matching ancestor", async () => {
    const { container, unmount } = render(<Frame />);
    const root = container.querySelector<HTMLElement>(".frame")!;
    const body = container.querySelector<HTMLElement>(".body")!;
    Object.defineProperties(body, {
      scrollHeight: { configurable: true, value: 400 },
      clientHeight: { configurable: true, value: 100 },
    });
    body.scrollTop = 50;
    body.dispatchEvent(new Event("scroll"));
    await nextFrame();
    expect(root).toHaveAttribute("data-scrolled-top");
    expect(root).toHaveAttribute("data-scrolled-bottom");
    expect(body).toHaveAttribute("data-top");

    body.scrollTop = 0;
    body.dispatchEvent(new Event("scroll"));
    await nextFrame();
    expect(root).not.toHaveAttribute("data-scrolled-top");
    expect(root).toHaveAttribute("data-scrolled-bottom");

    unmount();
    expect(root).not.toHaveAttribute("data-scrolled-bottom");
  });
});
