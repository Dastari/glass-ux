// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { AiResult } from "../types.js";
import { ResultTable } from "./table.js";

afterEach(cleanup);

const result: Extract<AiResult, { type: "table" }> = {
  id: "complete",
  type: "table",
  title: "Completed projects",
  columns: [
    { key: "project", header: "Project" },
    { key: "lead", header: "Lead", type: "entity" },
  ],
  rows: [
    {
      project: { kind: "project", id: "p1", label: "Cedar house" },
      lead: { kind: "person", id: "u1", label: "Noah Reed" },
    },
  ],
  total: 1,
};

describe("ResultTable", () => {
  it("shows entity references by label whether or not the column is typed as an entity", () => {
    const { container } = render(<ResultTable result={result} />);
    const cells = [...container.querySelectorAll(".fa-ai-table td")];
    expect(cells.map((cell) => cell.textContent)).toEqual(["Cedar house", "Noah Reed"]);
    expect(container.textContent).not.toContain("[object Object]");
  });
});
