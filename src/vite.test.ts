import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { glassUx } from "./vite.js";

const ROOT = join(import.meta.dirname);
// Not page code: tests, and the testing entry that runs under Vitest or Playwright.
const skipped = /\.test\.tsx?$|\.stories\.tsx?$|^(gallery|testing)\//;
// Node's, the package's own entries, test helpers, and assets Vite resolves itself.
const ignored = /^(node:|react-dom\/server|vite$|glass-ux\/|@testing-library\/|\.)|\?(raw|url)$/;

const sources = readdirSync(ROOT, { recursive: true, encoding: "utf8" })
  .map((file) => file.replaceAll("\\", "/"))
  .filter((file) => /\.tsx?$/.test(file) && !skipped.test(file));

function bareImports() {
  const found = new Set<string>();
  const statement = /^\s*(?:import|export)\s+(?!type\b)[\w\s,{}*$]+?from\s+"([^"]+)"|^\s*import\s+"([^"]+)"|\bimport\(\s*"([^"]+)"\s*\)/gm;
  for (const file of sources) {
    for (const match of readFileSync(join(ROOT, file), "utf8").matchAll(statement)) {
      const id = match[1] ?? match[2] ?? match[3] ?? "";
      if (!ignored.test(id)) found.add(id);
    }
  }
  return found;
}

describe("glassUx", () => {
  it("names every dependency a page can reach, so Vite never optimises mid-session", () => {
    const include = glassUx().config().optimizeDeps.include;
    const missing = [...bareImports()].filter((id) => !include.includes(`glass-ux > ${id}`));
    expect(missing).toEqual([]);
  });
});
