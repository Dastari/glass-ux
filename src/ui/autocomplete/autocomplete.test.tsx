// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Autocomplete } from "./autocomplete.js";

const OPTIONS = [
  { value: "alpha", label: "Alpha" },
  { value: "beta", label: "Beta" },
];

beforeEach(() => {
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
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

describe("Autocomplete with nothing to show", () => {
  it("keeps the popup shut until a suggestion matches", async () => {
    const user = userEvent.setup();
    render(<Autocomplete aria-label="Host" options={OPTIONS} />);
    const input = screen.getByRole("combobox");

    await user.type(input, "zzz");
    expect(document.querySelector(".fa-combobox-popup")).toBeNull();
    expect(input.getAttribute("aria-expanded")).toBe("false");

    await user.clear(input);
    await user.type(input, "al");
    expect(await screen.findByRole("option", { name: "Alpha" })).toBeTruthy();
    expect(input.getAttribute("aria-expanded")).toBe("true");
  });

  it("stays shut when a field held shut is emptied", async () => {
    const user = userEvent.setup();
    render(<Autocomplete aria-label="Host" options={OPTIONS} />);
    const input = screen.getByRole("combobox");
    await user.type(input, "zz");
    await user.clear(input);
    expect(document.querySelector(".fa-combobox-popup")).toBeNull();
  });

  it("opens to say so when a host supplies the empty text", async () => {
    const user = userEvent.setup();
    render(<Autocomplete aria-label="Host" options={OPTIONS} empty={(query) => `No host named ${query}`} />);
    await user.type(screen.getByRole("combobox"), "zzz");
    expect(await screen.findByText("No host named zzz")).toBeTruthy();
  });
});
