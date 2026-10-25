// @vitest-environment jsdom
import { useRef } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useHotkeys } from "./index.js";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it("matches aliases, exposes aria-keyshortcuts and uses the current handler", () => {
  const first = vi.fn(),
    second = vi.fn();
  function Example({ handler }: { handler: () => void }) {
    const keys = useHotkeys(["mod+shift+k", "escape"], handler);
    return <button aria-keyshortcuts={keys}>Open</button>;
  }
  const { rerender, unmount } = render(<Example handler={first} />);
  expect(screen.getByRole("button")).toHaveAttribute(
    "aria-keyshortcuts",
    "Control+Shift+K Escape",
  );
  const event = new KeyboardEvent("keydown", {
    key: "K",
    ctrlKey: true,
    shiftKey: true,
    bubbles: true,
    cancelable: true,
  });
  document.dispatchEvent(event);
  expect(first).toHaveBeenCalledTimes(1);
  expect(event.defaultPrevented).toBe(true);
  rerender(<Example handler={second} />);
  fireEvent.keyDown(document, { key: "Escape" });
  expect(second).toHaveBeenCalledTimes(1);
  unmount();
  fireEvent.keyDown(document, { key: "Escape" });
  expect(second).toHaveBeenCalledTimes(1);
});

it("maps Mod to Meta on Apple platforms", () => {
  vi.spyOn(navigator, "platform", "get").mockReturnValue("MacIntel");
  const handler = vi.fn();
  function Example() {
    return (
      <button aria-keyshortcuts={useHotkeys("mod+k", handler)}>Open</button>
    );
  }
  render(<Example />);
  expect(screen.getByRole("button")).toHaveAttribute(
    "aria-keyshortcuts",
    "Meta+K",
  );
  fireEvent.keyDown(document, { key: "k", ctrlKey: true });
  expect(handler).not.toHaveBeenCalled();
  fireEvent.keyDown(document, { key: "k", metaKey: true });
  expect(handler).toHaveBeenCalledOnce();
});

it("limits scope, ignores editable and composition events, and supports disable", () => {
  const handler = vi.fn();
  function Example({ enabled = true, allowInInputs = false }) {
    const scope = useRef<HTMLDivElement>(null);
    useHotkeys("escape", handler, {
      scope,
      enabled,
      allowInInputs,
      preventDefault: false,
    });
    return (
      <div ref={scope}>
        <button>Inside</button>
        <input aria-label="Input" />
        <div
          contentEditable
          suppressContentEditableWarning
          data-testid="editable"
        >
          <span>Edit</span>
        </div>
      </div>
    );
  }
  const { rerender } = render(<Example />);
  fireEvent.keyDown(document, { key: "Escape" });
  fireEvent.keyDown(screen.getByRole("textbox", { name: "Input" }), {
    key: "Escape",
  });
  fireEvent.keyDown(screen.getByText("Edit"), { key: "Escape" });
  fireEvent.keyDown(screen.getByRole("button"), {
    key: "Escape",
    isComposing: true,
  });
  expect(handler).not.toHaveBeenCalled();
  fireEvent.keyDown(screen.getByRole("button"), { key: "Escape" });
  expect(handler).toHaveBeenCalledTimes(1);
  rerender(<Example allowInInputs />);
  fireEvent.keyDown(screen.getByRole("textbox", { name: "Input" }), {
    key: "Escape",
  });
  expect(handler).toHaveBeenCalledTimes(2);
  rerender(<Example enabled={false} />);
  fireEvent.keyDown(screen.getByRole("button"), { key: "Escape" });
  expect(handler).toHaveBeenCalledTimes(2);
});

it("ignores shortcuts already handled by a child", () => {
  const handler = vi.fn();
  function Example() {
    useHotkeys("escape", handler);
    return (
      <button onKeyDown={(event) => event.preventDefault()}>Handled</button>
    );
  }
  render(<Example />);
  fireEvent.keyDown(screen.getByRole("button"), { key: "Escape" });
  expect(handler).not.toHaveBeenCalled();
});
