// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ActionProvider, useActionServices } from "./action-provider.js";
function NavigateButton() {
  const services = useActionServices();
  return (
    <button onClick={() => services.navigate("/exhibitions")}>
      Open exhibition
    </button>
  );
}
beforeEach(() =>
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  ),
);
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
describe("host navigation", () => {
  it("accepts a custom router without requiring TanStack Router context", () => {
    const navigate = vi.fn();
    const warnings = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(
      <ActionProvider navigate={navigate}>
        <NavigateButton />
      </ActionProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Open exhibition" }));
    expect(navigate).toHaveBeenCalledWith("/exhibitions");
    expect(warnings).not.toHaveBeenCalledWith(
      expect.stringContaining("RouterProvider"),
    );
  });
  it("inherits the host adapter through nested providers", () => {
    const navigate = vi.fn();
    render(
      <ActionProvider navigate={navigate}>
        <ActionProvider>
          <NavigateButton />
        </ActionProvider>
      </ActionProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Open exhibition" }));
    expect(navigate).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith("/exhibitions");
  });
});
