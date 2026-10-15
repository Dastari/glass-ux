// @vitest-environment jsdom
import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { EngineOptions } from "./engine.js";
import type { MapConfig, MapPoint, MapRegion } from "./types.js";
import { GeoMap } from "./map.js";

const engine = vi.hoisted(() => ({ paints: 0 }));

vi.mock("./engine.js", () => ({
  configureEngine: async () => {},
  MapEngine: class {
    map = {};
    constructor(options: EngineOptions) {
      queueMicrotask(options.callbacks.onLoad);
    }
    zoom() {
      return 2;
    }
    bounds() {
      return [-180, -90, 180, 90];
    }
    setStyleInput() {
      if (++engine.paints > 10) throw new Error("Unbounded map repaint loop");
    }
    fit() {}
    resize() {}
    destroy() {}
  },
  createPopupHost: () => ({
    element: document.createElement("div"),
    open() {},
    close() {},
    destroy() {},
  }),
}));
vi.mock("./theme.js", () => ({
  readMapTheme: () => ({ mode: "light" }),
  readLength: (_root: HTMLElement, _token: string, fallback: number) =>
    fallback,
  observeAppearance: () => () => {},
}));

beforeEach(() => {
  engine.paints = 0;
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const config: MapConfig = {
  basemap: null,
  regions: "/geo/{country}/{code}.json",
  regionAttribution: { label: "Synthetic outlines" },
  minZoom: 1,
  maxZoom: 18,
};
const points: readonly MapPoint<never>[] = [];
const region: MapRegion = {
  type: "Feature",
  bbox: [0, 0, 1, 1],
  properties: {
    code: "ZZ-TEST",
    country: "ZZ",
    name: "Test region",
    focus: [0, 0, 1, 1],
  },
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 0],
      ],
    ],
  },
};

it("settles with omitted regions and still repaints when regions change", async () => {
  const props = {
    label: "Sites",
    config,
    home: null,
    points,
    renderPopup: () => null,
  };
  const { container, rerender } = render(<GeoMap {...props} />);
  await waitFor(() =>
    expect(container.querySelector(".fa-map")).toHaveAttribute(
      "data-phase",
      "ready",
    ),
  );
  // The ready DOM can precede the passive data effect that paints the engine.
  await waitFor(() => expect(engine.paints).toBeGreaterThan(0));
  const initial = engine.paints;
  await act(async () => {
    rerender(<GeoMap {...props} label="Updated map label" />);
  });
  expect(engine.paints).toBe(initial);
  await act(async () => {
    rerender(<GeoMap {...props} regions={[region]} />);
  });
  expect(engine.paints).toBe(initial + 1);
});
