// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AiSession } from "../types.js";
import { SessionNav } from "./session-nav.js";

afterEach(cleanup);

const now = Date.now();
const sessions: AiSession[] = [
  { id: "s-1", title: "Sample one", lastActivityAt: now, activity: "idle" },
  { id: "s-2", title: "Sample two", lastActivityAt: now - 1000, activity: "idle" },
];
const rowOf = (title: string) => screen.getByRole("button", { name: title });

describe("SessionNav selection", () => {
  it("marks the clicked session current when uncontrolled and reports it once", () => {
    const onSelectedIdChange = vi.fn();
    render(<SessionNav sessions={sessions} defaultSelectedId="s-1" onSelectedIdChange={onSelectedIdChange} />);
    expect(rowOf("Sample one")).toHaveAttribute("aria-current", "page");
    fireEvent.click(rowOf("Sample two"));
    expect(rowOf("Sample two")).toHaveAttribute("aria-current", "page");
    expect(rowOf("Sample one")).not.toHaveAttribute("aria-current");
    expect(onSelectedIdChange).toHaveBeenCalledTimes(1);
    const [id, details] = onSelectedIdChange.mock.calls[0]!;
    expect(id).toBe("s-2");
    expect(details).toMatchObject({ reason: "item-press", item: sessions[1] });
    expect(details.event).toBeInstanceOf(MouseEvent);
    fireEvent.click(rowOf("Sample two"));
    expect(onSelectedIdChange).toHaveBeenCalledTimes(1);
  });

  it("follows selectedId when controlled and clears with null", () => {
    const onSelectedIdChange = vi.fn();
    const view = render(<SessionNav sessions={sessions} selectedId="s-1" onSelectedIdChange={onSelectedIdChange} />);
    fireEvent.click(rowOf("Sample two"));
    expect(onSelectedIdChange).toHaveBeenCalledWith("s-2", expect.objectContaining({ item: sessions[1] }));
    expect(rowOf("Sample one")).toHaveAttribute("aria-current", "page");
    expect(rowOf("Sample two")).not.toHaveAttribute("aria-current");
    view.rerender(<SessionNav sessions={sessions} selectedId={null} onSelectedIdChange={onSelectedIdChange} />);
    expect(rowOf("Sample one")).not.toHaveAttribute("aria-current");
    expect(rowOf("Sample two")).not.toHaveAttribute("aria-current");
  });
});
