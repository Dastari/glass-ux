// @vitest-environment jsdom
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { AiResult } from "../types.js";
import { ResultChart } from "./chart.js";

afterEach(cleanup);

const result: Extract<AiResult, { type: "chart" }> = {
  id: "latency",
  type: "chart",
  chart: "line",
  title: "Request latency",
  labels: ["09:00", "10:00", "11:00"],
  series: [{ name: "p95", values: [120, 140, 110] }],
  unit: "ms",
};

describe("ResultChart", () => {
  it("renders its frame at once and fills the reserved plot box when the chart loads", async () => {
    const { container, getByText } = render(<ResultChart result={result} />);
    expect(getByText("Request latency")).toBeInTheDocument();
    const box = container.querySelector(".fa-ai-result-chart");
    expect(box).not.toBeNull();
    expect(box!.querySelector(".fa-skel")).not.toBeNull();
    // The chart is a lazy import: allow for a busy test run.
    await waitFor(() => expect(box!.querySelector(".fa-chart")).not.toBeNull(), { timeout: 5000 });
    expect(box!.querySelector(":scope > .fa-skel")).toBeNull();
  });
});
