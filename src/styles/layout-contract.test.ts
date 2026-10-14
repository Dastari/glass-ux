import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, test } from "vitest";
import { checkThemeVariables } from "../../bin/check-layout.mjs";

const temporary: string[] = [];
function stylesheet(source: string) {
  const dir = mkdtempSync(join(tmpdir(), "glass-ux-layout-"));
  temporary.push(dir);
  const file = join(dir, "host.css");
  writeFileSync(file, source);
  return file;
}
afterEach(() =>
  temporary
    .splice(0)
    .forEach((dir) => rmSync(dir, { recursive: true, force: true })),
);

test("rejects the padding utility name incorrectly used as a CSS variable", () => {
  const file = stylesheet(".drawer { padding: var(--p-panel); }");
  expect(() => checkThemeVariables([file])).toThrow(
    "undefined CSS variable --p-panel",
  );
});

test("accepts theme roles, host definitions and explicit fallback values", () => {
  const file = stylesheet(
    ":root { --host-gap: 0; } .drawer { padding: var(--inset-panel); gap: var(--host-gap); margin: var(--optional, 0); }",
  );
  expect(checkThemeVariables([file])).toBe(1);
});
