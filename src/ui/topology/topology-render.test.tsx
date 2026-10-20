// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TopologyCanvas } from "./topology.js";
import type { TopologyNode } from "./types.js";

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const nodes: TopologyNode<null>[] = [
  { id: "root", parentId: null, label: "Root", data: null },
  { id: "left", parentId: "root", label: "Left", data: null },
  { id: "right", parentId: "root", label: "Right", data: null },
];
const renderNode = () => null;
const node = (name: string) => screen.findByRole("option", { name });

describe("TopologyCanvas selection", () => {
  it("selects on its own when uncontrolled and reports changes with details", async () => {
    const onSelectedIdChange = vi.fn();
    render(<TopologyCanvas label="Sample" nodes={nodes} renderNode={renderNode} defaultSelectedId="left" onSelectedIdChange={onSelectedIdChange} />);
    expect(await node("Left")).toHaveAttribute("aria-selected", "true");

    fireEvent.click(await node("Right"));
    expect(await node("Right")).toHaveAttribute("aria-selected", "true");
    expect(await node("Left")).toHaveAttribute("aria-selected", "false");
    const [id, details] = onSelectedIdChange.mock.calls[0]!;
    expect(id).toBe("right");
    expect(details).toMatchObject({ reason: "item-press", item: nodes[2] });
    expect(details.event).toBeInstanceOf(MouseEvent);

    // Enter on the selected node reports nothing; Space clears it.
    fireEvent.keyDown(await node("Right"), { key: "Enter" });
    expect(onSelectedIdChange).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(await node("Right"), { key: " " });
    expect(onSelectedIdChange).toHaveBeenLastCalledWith(null, expect.objectContaining({ reason: "item-press", item: null }));
    expect(onSelectedIdChange.mock.lastCall![1].event).toBeInstanceOf(KeyboardEvent);
    expect(await node("Right")).toHaveAttribute("aria-selected", "false");
  });

  it("follows selectedId when controlled and reports Escape and empty-canvas clicks as clearing", async () => {
    const onSelectedIdChange = vi.fn();
    const view = render(<TopologyCanvas label="Sample" nodes={nodes} renderNode={renderNode} selectedId="left" onSelectedIdChange={onSelectedIdChange} />);
    fireEvent.click(await node("Right"));
    expect(onSelectedIdChange).toHaveBeenLastCalledWith("right", expect.objectContaining({ item: nodes[2] }));
    expect(await node("Left")).toHaveAttribute("aria-selected", "true");

    fireEvent.keyDown(await node("Left"), { key: "Escape" });
    expect(onSelectedIdChange).toHaveBeenLastCalledWith(null, expect.objectContaining({ reason: "escape-key", item: null }));

    fireEvent.click(screen.getByRole("listbox"));
    expect(onSelectedIdChange).toHaveBeenLastCalledWith(null, expect.objectContaining({ reason: "outside-press", item: null }));

    view.rerender(<TopologyCanvas label="Sample" nodes={nodes} renderNode={renderNode} selectedId={null} onSelectedIdChange={onSelectedIdChange} />);
    expect(await node("Left")).toHaveAttribute("aria-selected", "false");
    // Nothing selected: Escape and empty-canvas clicks report nothing.
    const calls = onSelectedIdChange.mock.calls.length;
    fireEvent.keyDown(await node("Left"), { key: "Escape" });
    fireEvent.click(screen.getByRole("listbox"));
    expect(onSelectedIdChange).toHaveBeenCalledTimes(calls);
  });
});
