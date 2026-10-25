// @vitest-environment jsdom
import { createContext, useContext, useRef } from "react";
import { renderToString } from "react-dom/server";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { Portal } from "./index.js";

afterEach(cleanup);
const Context = createContext("default");
function Child() {
  return <span>{useContext(Context)}</span>;
}

it("is empty during SSR, then portals to body with React context", () => {
  expect(
    renderToString(
      <Portal>
        <span>Client content</span>
      </Portal>,
    ),
  ).toBe("");
  render(
    <Context value="Provided">
      <Portal>
        <Child />
      </Portal>
    </Context>,
  );
  expect(screen.getByText("Provided").parentElement).toBe(document.body);
});

it("accepts a container ref and removes portal content on unmount", () => {
  function Example() {
    const target = useRef<HTMLDivElement>(null);
    return (
      <>
        <div ref={target} data-testid="target" />
        <Portal container={target}>Destination content</Portal>
      </>
    );
  }
  const { unmount } = render(<Example />);
  expect(screen.getByTestId("target")).toHaveTextContent("Destination content");
  unmount();
  expect(screen.queryByText("Destination content")).toBeNull();
});

it("waits for an explicitly null destination and can switch containers", () => {
  const first = document.createElement("div"),
    second = document.createElement("div");
  const { rerender } = render(<Portal container={null}>Moved</Portal>);
  expect(first).toBeEmptyDOMElement();
  rerender(<Portal container={first}>Moved</Portal>);
  expect(first).toHaveTextContent("Moved");
  rerender(<Portal container={second}>Moved</Portal>);
  expect(first).toBeEmptyDOMElement();
  expect(second).toHaveTextContent("Moved");
});
