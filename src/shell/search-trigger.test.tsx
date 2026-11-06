// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SearchTrigger } from "./top-bar.js";

beforeEach(() => {
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const mount = (props: { "aria-label"?: string; placeholder?: string }) =>
  render(<SearchTrigger onOpen={() => {}} {...props} />);

describe("SearchTrigger name", () => {
  it("takes a host's aria-label", () => {
    mount({ "aria-label": "Search files", placeholder: "Find in files" });
    expect(screen.getByRole("button", { name: "Search files" })).toBeTruthy();
  });

  it("follows a custom placeholder, so the name holds the visible text", () => {
    mount({ placeholder: "Find in files" });
    expect(screen.getByRole("button", { name: "Find in files" })).toBeTruthy();
  });

  it("keeps the default name otherwise", () => {
    mount({});
    expect(screen.getByRole("button", { name: /search/i })).toBeTruthy();
  });
});
