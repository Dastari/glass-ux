// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EMPTY_COUNTS } from "./cluster.js";
import type { EngineOptions, MarkerSlot } from "./engine.js";
import type { MapConfig, MapPoint, MapRegion } from "./types.js";
import { GeoMap } from "./map.js";

const engine = vi.hoisted(() => ({
  paints: 0,
  options: null as EngineOptions | null,
}));

vi.mock("./engine.js", () => ({
  configureEngine: async () => {},
  MapEngine: class {
    map = {};
    constructor(options: EngineOptions) {
      engine.options = options;
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
  engine.options = null;
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

describe("GeoMap selection", () => {
  const sites: readonly MapPoint<null>[] = [
    { id: "a", lng: 0.2, lat: 0.2, status: "healthy", label: "Alpha", data: null },
    { id: "b", lng: 0.8, lat: 0.8, status: "warning", label: "Beta", data: null },
  ];
  const props = {
    label: "Sites",
    config,
    home: null,
    points: sites,
    renderPopup: () => null,
  };
  /** The engine reports one marker per point; the map portals its buttons into them. */
  async function showMarkers() {
    await waitFor(() =>
      expect(document.querySelector(".fa-map")).toHaveAttribute("data-phase", "ready"),
    );
    const slots: MarkerSlot[] = sites.map((point) => {
      const element = document.createElement("div");
      document.body.append(element);
      return { key: `p:${point.id}`, element, kind: "point", id: point.id, lng: point.lng, lat: point.lat, counts: EMPTY_COUNTS, size: 1 };
    });
    act(() => engine.options!.callbacks.onMarkers(slots));
  }
  const marker = (name: string) => screen.getByRole("button", { name });
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("selects on its own when uncontrolled and reports changes with details", async () => {
    const onSelectedIdChange = vi.fn();
    render(<GeoMap {...props} defaultSelectedId="a" onSelectedIdChange={onSelectedIdChange} />);
    await showMarkers();
    expect(marker("Alpha, Healthy")).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(marker("Beta, Warning"));
    expect(marker("Beta, Warning")).toHaveAttribute("aria-pressed", "true");
    expect(marker("Alpha, Healthy")).toHaveAttribute("aria-pressed", "false");
    const [id, details] = onSelectedIdChange.mock.calls[0]!;
    expect(id).toBe("b");
    expect(details).toMatchObject({ reason: "item-press", item: sites[1] });
    expect(details.event).toBeInstanceOf(MouseEvent);

    // Pinning the selected point again reports nothing.
    fireEvent.keyDown(marker("Beta, Warning"), { key: "Enter" });
    expect(onSelectedIdChange).toHaveBeenCalledTimes(1);
  });

  it("follows selectedId when controlled, reports keyboard selection and clears with null", async () => {
    const onSelectedIdChange = vi.fn();
    const view = render(<GeoMap {...props} selectedId="a" onSelectedIdChange={onSelectedIdChange} />);
    await showMarkers();
    fireEvent.keyDown(marker("Beta, Warning"), { key: " " });
    expect(onSelectedIdChange).toHaveBeenCalledWith("b", expect.objectContaining({ reason: "item-press", item: sites[1] }));
    expect(onSelectedIdChange.mock.calls[0]![1].event).toBeInstanceOf(KeyboardEvent);
    expect(marker("Alpha, Healthy")).toHaveAttribute("aria-pressed", "true");
    expect(marker("Beta, Warning")).toHaveAttribute("aria-pressed", "false");

    view.rerender(<GeoMap {...props} selectedId={null} onSelectedIdChange={onSelectedIdChange} />);
    expect(marker("Alpha, Healthy")).toHaveAttribute("aria-pressed", "false");
  });
});
