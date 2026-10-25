// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { MessagesProvider } from "../../lib/i18n/index.js";
import { Spinner } from "./index.js";

afterEach(cleanup);

it("announces a translated default and allows a decorative spinner", () => {
  const { rerender } = render(
    <MessagesProvider messages={{ spinner: { loading: "Laden" } }}>
      <Spinner size="lg" tone="accent" />
    </MessagesProvider>,
  );
  expect(screen.getByRole("status")).toHaveTextContent("Laden");
  expect(screen.getByRole("status").querySelector("svg")).toHaveAttribute(
    "data-size",
    "lg",
  );
  rerender(<Spinner label="" />);
  expect(screen.queryByRole("status")).toBeNull();
  expect(document.querySelector(".fa-spinner")).toHaveAttribute(
    "aria-hidden",
    "true",
  );
});

it("keeps a custom status label visually hidden", () => {
  render(<Spinner label="Loading records" />);
  expect(
    screen.getByRole("status").querySelector(".fa-visually-hidden"),
  ).toHaveTextContent("Loading records");
  expect(screen.getByRole("status").querySelector("svg")).toHaveAttribute(
    "aria-hidden",
    "true",
  );
});
