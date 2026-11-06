// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Toaster, toast, toastManager } from "./toast.js";

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
  act(() => toastManager.close());
  cleanup();
  vi.unstubAllGlobals();
});

describe("Toast semantics", () => {
  it("is a labelled group, not a dialog, in every tone", async () => {
    render(<Toaster />);
    act(() => {
      toast({ title: "Saved" });
      toast({ tone: "danger", title: "Not saved" });
    });
    const saved = await screen.findByText("Saved");
    const root = saved.closest<HTMLElement>(".fa-toast")!;
    expect(root.getAttribute("role")).toBe("group");
    expect(root.hasAttribute("aria-modal")).toBe(false);
    expect(root.getAttribute("aria-labelledby")).toBe(saved.id);
    expect(document.querySelector("[role=dialog], [role=alertdialog]")).toBeNull();
  });
});
