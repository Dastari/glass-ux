// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "../tooltip/index.js";
import { Switch } from "./switch.js";

beforeEach(() => {
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const mount = (node: React.ReactNode) => render(<TooltipProvider>{node}</TooltipProvider>);

describe("Switch disabled and reachable", () => {
  it("with a reason: focusable, says it is disabled and why, and does not change", () => {
    const change = vi.fn();
    mount(<Switch aria-label="Sign-on" disabledReason="Not on this plan" onCheckedChange={change} />);
    const control = screen.getByRole("switch", { name: "Sign-on" });
    control.focus();
    expect(document.activeElement).toBe(control);
    expect(control).toHaveProperty("disabled", false);
    expect(control.getAttribute("aria-disabled")).toBe("true");
    expect(control.getAttribute("aria-description")).toBe("Not on this plan");
    expect(control.hasAttribute("data-disabled")).toBe(true);
    expect(control.hasAttribute("aria-readonly")).toBe(false);
    fireEvent.click(control);
    fireEvent.keyDown(control, { key: " " });
    expect(change).not.toHaveBeenCalled();
    expect(control.getAttribute("aria-checked")).toBe("false");
  });

  it("focusableWhenDisabled keeps a disabled switch reachable", () => {
    const change = vi.fn();
    mount(<Switch aria-label="Audit" disabled focusableWhenDisabled defaultChecked onCheckedChange={change} />);
    const control = screen.getByRole("switch", { name: "Audit" });
    expect(control).toHaveProperty("disabled", false);
    expect(control.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(control);
    expect(change).not.toHaveBeenCalled();
    expect(control.getAttribute("aria-checked")).toBe("true");
  });

  it("plain disabled stays out of the Tab order, and focusableWhenDisabled alone changes nothing", () => {
    const { rerender } = mount(<Switch aria-label="Plain" disabled />);
    expect(screen.getByRole("switch", { name: "Plain" })).toHaveProperty("disabled", true);
    rerender(<TooltipProvider><Switch aria-label="Plain" focusableWhenDisabled /></TooltipProvider>);
    const live = screen.getByRole("switch", { name: "Plain" });
    expect(live.hasAttribute("aria-disabled")).toBe(false);
    fireEvent.click(live);
    expect(live.getAttribute("aria-checked")).toBe("true");
  });

  it("names a labelled row the same way", () => {
    mount(<Switch label="Sign-on" disabledReason="Not on this plan" />);
    const control = screen.getByRole("switch", { name: /Sign-on/ });
    expect(control.getAttribute("aria-disabled")).toBe("true");
    expect(document.querySelector("[data-disabled].fa-switch")).toBe(control);
  });
});
