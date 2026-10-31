import { describe, expect, it } from "vitest";
import catalogue from "./catalogue.generated.json";
import {
  componentDestination,
  componentFamilies,
  findComponentFamily,
} from "./component-families.js";

describe("component documentation families", () => {
  it("keeps every public export in exactly one document with its base first", () => {
    const ids = componentFamilies.flatMap((family) => {
      expect(family.components[0]?.id).toBe(family.id);
      return family.components.map((component) => component.id);
    });
    expect(ids.toSorted()).toEqual(catalogue.map((item) => item.id).toSorted());
    expect(new Set(ids).size).toBe(ids.length);
    expect(componentFamilies.length).toBeLessThan(catalogue.length / 2);
  });

  it.each([
    ["panel-header", "panel"],
    ["panel-body", "panel"],
    ["avatar-skeleton", "avatar"],
    ["identity-cell", "data-table"],
    ["filter-editor", "data-table"],
    ["address-input", "address-field"],
    ["composer", "composer"],
    ["attachment-chip", "composer"],
    ["result-table", "result-frame"],
    ["tool-call-skeleton", "tool-group"],
    ["section-drawer", "app-shell"],
    ["inspector", "app-shell"],
    ["inspector-toggle", "app-shell"],
    ["button-link", "button"],
    ["copy-button", "button"],
    ["multi-select", "combobox"],
    ["tag-input", "combobox"],
    ["autocomplete", "combobox"],
    ["context-menu", "menu"],
    ["meter-cell", "data-table"],
    ["tone-dot", "badge"],
    ["reasoning", "assistant-message"],
    ["status-glyph", "tool-group"],
    ["ai-surface-provider", "ai-card"],
    ["redacted", "result-frame"],
    ["ask-record", "ask-card"],
    ["ask-shell", "ask-card"],
    ["keyboard-drawer", "on-screen-keyboard"],
    ["keyboard-toggle", "on-screen-keyboard"],
    ["sidebar-provider", "sidebar"],
    ["sidebar-trigger", "sidebar"],
    ["sidebar-inset", "sidebar"],
  ])("documents %s with %s", (id, parent) => {
    expect(findComponentFamily(id)?.id).toBe(parent);
    expect(componentDestination(id)).toEqual(
      id === parent ? { id } : { id: parent, hash: id },
    );
  });

  it("retains focused chart documents and groups their shared composition helpers", () => {
    for (const id of [
      "area-chart",
      "bar-chart",
      "column-chart",
      "donut-chart",
      "gauge",
      "heatmap",
      "histogram",
      "line-chart",
      "pie-chart",
      "radial-bar",
      "scatter-chart",
      "sunburst",
      "treemap",
    ]) {
      expect(findComponentFamily(id)?.id).toBe(id);
      expect(componentDestination(id)).toEqual({ id });
    }
    expect(findComponentFamily("chart-tooltip")?.id).toBe("chart-frame");
  });

  it("allows a host to search a hidden related export without restoring sidebar clutter", () => {
    expect(componentFamilies.some((item) => item.id === "panel-header")).toBe(
      false,
    );
    const matches = componentFamilies.filter((family) =>
      family.components.some((item) =>
        `${item.id} ${item.name} ${item.description}`
          .toLowerCase()
          .includes("panelheader"),
      ),
    );
    expect(matches.map((family) => family.id)).toEqual(["panel"]);
  });

  it("keeps nested composition helpers next to their parent and preserves independent controls", () => {
    const shell = findComponentFamily("inspector-toggle")!;
    const ids = shell.components.map((item) => item.id);
    expect(ids[ids.indexOf("inspector") + 1]).toBe("inspector-toggle");
    for (const id of [
      "select",
      "pagination",
      "reference-input",
      "surface",
      "panel",
      "entity-header",
      "context-switcher",
      "markdown",
      "json-tree",
    ]) {
      expect(componentDestination(id)).toEqual({ id });
    }
  });

  it("leaves unknown destinations for the host to handle", () => {
    expect(findComponentFamily("unknown-component")).toBeUndefined();
    expect(componentDestination("unknown-component")).toEqual({
      id: "unknown-component",
    });
  });
});
