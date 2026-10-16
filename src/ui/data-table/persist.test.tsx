// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import {
  EMPTY_PREFERENCES,
  readPreferences,
  useTablePreferences,
} from "./persist.js";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("application column defaults", () => {
  it("seeds server rendering and the initial client preference with hidden columns", () => {
    function ServerTable() {
      const [preferences] = useTablePreferences("defaults", ["serial"]);
      return <output>{preferences.hidden.join(",")}</output>;
    }
    expect(renderToString(<ServerTable />)).toBe("<output>serial</output>");
    const { result, rerender } = renderHook(() =>
      useTablePreferences("defaults", ["serial"]),
    );
    expect(result.current[0].hidden).toEqual(["serial"]);
    rerender();
    expect(result.current[0].hidden).toEqual(["serial"]);
  });

  it("keeps an explicit opt-in to every column across unmount and reload", () => {
    const first = renderHook(() => useTablePreferences("opt-in", ["serial"]));
    act(() =>
      first.result.current[1]((current) => ({ ...current, hidden: [] })),
    );
    expect(
      JSON.parse(localStorage.getItem("glass-ux.table.opt-in.v1")!).hidden,
    ).toEqual([]);
    first.unmount();
    const next = renderHook(() =>
      useTablePreferences("opt-in", ["serial", "ip"]),
    );
    expect(next.result.current[0].hidden).toEqual([]);
  });

  it("prefers a saved hidden set and retains the other table preferences", () => {
    localStorage.setItem(
      "glass-ux.table.saved.v1",
      JSON.stringify({
        widths: { name: 18 },
        hidden: ["ip"],
        pinned: ["name"],
        density: "compact",
      }),
    );
    const { result } = renderHook(() =>
      useTablePreferences("saved", ["serial"]),
    );
    expect(result.current[0]).toEqual({
      widths: { name: 18 },
      hidden: ["ip"],
      pinned: ["name"],
      density: "compact",
    });
  });

  it.each([null, "{", "null", "[]", '{"density":"compact"}'])(
    "uses defaults when stored visibility is absent or invalid: %s",
    (stored) => {
      if (stored !== null)
        localStorage.setItem("glass-ux.table.missing.v1", stored);
      expect(
        readPreferences("missing", { ...EMPTY_PREFERENCES, hidden: ["serial"] })
          .hidden,
      ).toEqual(["serial"]);
    },
  );

  it("keeps preferences independent by table id", () => {
    localStorage.setItem(
      "glass-ux.table.one.v1",
      JSON.stringify({ ...EMPTY_PREFERENCES, hidden: [] }),
    );
    const { result, rerender } = renderHook(
      ({ id }) => useTablePreferences(id, ["serial"]),
      { initialProps: { id: "one" } },
    );
    expect(result.current[0].hidden).toEqual([]);
    rerender({ id: "two" });
    expect(result.current[0].hidden).toEqual(["serial"]);
  });
});
