import { describe, expect, it } from "vitest";
import { lineInNextRow, linesAcross, type DrawnLine } from "./card-grid.js";

/* Three columns, 100 apart: a group line, three cards, then two cards in the last row. */
const LINES: DrawnLine[] = [
  { index: 0, top: 0, start: 0 },
  { index: 1, top: 40, start: 0 },
  { index: 2, top: 40, start: 100 },
  { index: 3, top: 40, start: 200 },
  { index: 4, top: 180, start: 0 },
  { index: 5, top: 180, start: 100 },
];

describe("lineInNextRow", () => {
  it("keeps the column", () => {
    expect(lineInNextRow(LINES, 2, 1)).toBe(5);
    expect(lineInNextRow(LINES, 5, -1)).toBe(2);
  });
  it("takes the nearest card when the next row is short", () => {
    expect(lineInNextRow(LINES, 3, 1)).toBe(5);
  });
  it("reaches a line across the list, and the first card from one", () => {
    expect(lineInNextRow(LINES, 3, -1)).toBe(0);
    expect(lineInNextRow(LINES, 0, 1)).toBe(1);
  });
  it("stays put with no row to reach", () => {
    expect(lineInNextRow(LINES, 0, -1)).toBe(0);
    expect(lineInNextRow(LINES, 4, 1)).toBe(4);
  });
  it("treats a fraction of a pixel as the same row", () => {
    const lines = [
      { index: 0, top: 0, start: 0 },
      { index: 1, top: 0.4, start: 100 },
      { index: 2, top: 90, start: 0 },
      { index: 3, top: 90.4, start: 100 },
    ];
    expect(lineInNextRow(lines, 1, 1)).toBe(3);
    expect(linesAcross(lines, 2)).toBe(2);
  });
});

describe("linesAcross", () => {
  it("counts the row's lines", () => {
    expect(linesAcross(LINES, 2)).toBe(3);
    expect(linesAcross(LINES, 0)).toBe(1);
    expect(linesAcross(LINES, 99)).toBe(1);
  });
});
