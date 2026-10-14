import { describe, expect, it } from "vitest";
import { dateInTimezone, resolveDateTime } from "./date-time.js";

describe("ask date/time zone semantics", () => {
  it("resolves wall time in the host's zone, independent of the browser zone", () => {
    expect(resolveDateTime("2026-10-17T09:00", "Australia/Hobart")).toEqual({
      time: Date.parse("2026-10-16T22:00:00Z"),
    });
    expect(resolveDateTime("2026-06-17T09:00", "Australia/Hobart")).toEqual({
      time: Date.parse("2026-06-16T23:00:00Z"),
    });
    expect(
      dateInTimezone(Date.parse("2026-10-16T22:00Z"), "Australia/Hobart"),
    ).toBe("2026-10-17");
  });
  it("preserves explicit instants and rejects invalid dates and zones", () => {
    expect(
      resolveDateTime("2026-10-17T09:00+11:00", "Australia/Hobart"),
    ).toEqual({ time: Date.parse("2026-10-16T22:00Z") });
    expect(
      resolveDateTime("2026-02-30T09:00", "Australia/Hobart").error,
    ).toMatch(/valid/);
    expect(
      resolveDateTime("2026-10-17T09:00", "Australia/Hobart (AEDT)").error,
    ).toMatch(/time zone/);
  });
  it("rejects nonexistent and ambiguous DST wall times", () => {
    expect(
      resolveDateTime("2026-10-04T02:30", "Australia/Hobart").error,
    ).toMatch(/does not exist/);
    expect(
      resolveDateTime("2026-04-05T02:30", "Australia/Hobart").error,
    ).toMatch(/occurs twice/);
    expect(
      resolveDateTime("2026-10-04T02:15", "Australia/Lord_Howe").error,
    ).toMatch(/does not exist/);
  });
});
