// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { JsonTree } from "./json-tree.js";

afterEach(cleanup);

const press = (element: HTMLElement, key: string) =>
  fireEvent.keyDown(element, { key });
describe("JSON keyboard traversal", () => {
  it("keeps one tab stop and supports entering, returning, collapsing, typeahead and activation", () => {
    render(
      <JsonTree
        label="Arguments"
        value={{ alpha: { first: 1, second: 2 }, beta: true }}
      />,
    );
    const root = screen.getByRole("treeitem", { name: "object, 2 keys" });
    act(() => root.focus());
    press(root, "ArrowRight");
    const alpha = screen.getByRole("treeitem", {
      name: "alpha: object, 2 keys",
    });
    expect(alpha).toHaveFocus();
    expect(root).toHaveAttribute("tabindex", "-1");
    press(alpha, "ArrowRight");
    expect(alpha).toHaveAttribute("aria-expanded", "true");
    press(alpha, "ArrowRight");
    const first = screen.getByRole("treeitem", { name: "first: 1" });
    expect(first).toHaveFocus();
    press(first, "ArrowLeft");
    expect(alpha).toHaveFocus();
    press(alpha, "ArrowLeft");
    expect(alpha).toHaveAttribute("aria-expanded", "false");
    press(alpha, "b");
    expect(screen.getByRole("treeitem", { name: "beta: true" })).toHaveFocus();
    press(document.activeElement as HTMLElement, "Home");
    expect(root).toHaveFocus();
    press(root, "Enter");
    expect(root).toHaveAttribute("aria-expanded", "false");
    expect(screen.getAllByRole("treeitem")).toHaveLength(1);
  });
  it("pages large arrays from the tree keyboard and returns focus to the retained branch", () => {
    render(
      <JsonTree
        label="Large result"
        value={Array.from({ length: 44 }, (_, index) => index)}
      />,
    );
    const root = screen.getByRole("treeitem", { name: "array, 44 items" });
    act(() => root.focus());
    press(root, "End");
    const more = screen.getByRole("treeitem", { name: "Show more of root" });
    expect(more).toHaveFocus();
    press(more, "Enter");
    expect(screen.getAllByRole("treeitem")).toHaveLength(45);
    expect(root).toHaveFocus();
    expect(screen.queryByRole("button", { name: /Show.*more/ })).toBeNull();
  });
});
