import { describe, expect, it } from "vitest";
import { exportCsv, exportTsv } from "./export.js";
const columns = [
  { id: "text", header: "Text", value: (row: { text: unknown }) => row.text },
];
describe("plain table export", () => {
  it("encodes RFC 4180 quotes, commas, embedded CRLF and Unicode", () => {
    expect(
      exportCsv({
        columns,
        rows: [{ text: 'a,"b"\r\nc' }, { text: "雪" }, { text: null }],
      }),
    ).toBe('Text\r\n"a,""b""\r\nc"\r\n雪\r\n\r\n');
  });
  it("supports BOM and optional headers, omitting rendered objects", () => {
    expect(
      exportCsv({
        columns,
        rows: [{ text: { type: "span", props: { children: "JSX" } } }],
        headers: false,
        bom: true,
      }),
    ).toBe("\uFEFF\r\n");
    expect(exportCsv({ columns, rows: [], headers: false })).toBe("");
  });
  it("encodes tabs and line breaks in TSV and raw primitive/date values", () => {
    expect(
      exportTsv({
        columns,
        rows: [
          { text: "a\tb\nc" },
          { text: false },
          { text: 12 },
          { text: new Date("2026-01-01Z") },
        ],
      }),
    ).toBe('Text\r\n"a\tb\nc"\r\nfalse\r\n12\r\n2026-01-01T00:00:00.000Z\r\n');
  });
});
