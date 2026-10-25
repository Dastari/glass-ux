import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";
import { needsClientBoundary } from "./client-boundaries.mjs";

if (!process.env.GLASS_UX_SKIP_TEST_BUILD)
  execFileSync("pnpm", ["build"], { stdio: "pipe" });
const directive = /^["']use client["'];/;
const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)],
  );

test("client-feature modules start with a directive, including source-map line offsets", () => {
  let checked = 0;
  for (const file of walk("dist").filter(
    (file) => file.endsWith(".js") && !file.startsWith("dist/gallery/"),
  )) {
    const emitted = readFileSync(file, "utf8");
    // Inspect emitted code independently of source classification: tsc can introduce aliases
    // and preserve imported hook names. Ignore comments, strings and hook names in exports.
    const hasHookCall = /\b(?:use[A-Z]\w*|createContext)\s*\(/.test(
      emitted.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, ""),
    );
    if (hasHookCall) {
      assert.match(emitted, directive, file);
      checked++;
    }
    if (directive.test(emitted) && existsSync(`${file}.map`)) {
      assert.ok(
        JSON.parse(readFileSync(`${file}.map`, "utf8")).mappings.startsWith(
          ";",
        ),
        file,
      );
    }
  }
  assert.ok(checked > 100, `checked ${checked} client modules`);
  for (const file of walk("src").filter(
    (file) => /\.tsx?$/.test(file) && !/\.test\.tsx?$/.test(file),
  )) {
    const out = file.replace(/^src\//, "dist/").replace(/\.tsx?$/, ".js");
    if (
      existsSync(out) &&
      needsClientBoundary(readFileSync(file, "utf8"), file)
    )
      assert.match(readFileSync(out, "utf8"), directive, out);
  }
});

test("server-safe modules and re-export barrels remain directive-free", () => {
  for (const file of [
    "lib/appearance/appearance",
    "lib/appearance/fonts",
    "lib/appearance/custom-colour",
    "lib/appearance/index",
    "lib/locale/locale",
    "lib/locale/index",
    "ui/data-table/format",
    "ui/file-icon/file-kind",
    "ui/email-field/schema",
    "ui/money-field/money",
    "ui/form/rules",
    "icons/generated/icons",
    "ui/icon/icon",
    "ui/button/index",
    "ui/visually-hidden/visually-hidden",
  ]) {
    assert.doesNotMatch(
      readFileSync(`dist/${file}.js`, "utf8"),
      directive,
      file,
    );
  }
});

test("published runtime development checks are portable outside Vite", () => {
  for (const file of walk("dist").filter(
    (file) => file.endsWith(".js") && !file.startsWith("dist/gallery/"),
  )) {
    assert.doesNotMatch(readFileSync(file, "utf8"), /import\.meta\.env/, file);
  }
  assert.match(
    readFileSync("dist/ui/button/button.js", "utf8"),
    /process\.env\.NODE_ENV !== "production"/,
  );
});

test("classification distinguishes runtime behaviour from pure exports and types", () => {
  for (const code of [
    'import { useState as state } from "react"; function Demo() { return state(0) }',
    "function Demo() { return <button onClick={() => {}}>Save</button> }",
    "const root = document.body",
    'import { Field } from "@base-ui/react/field"; export const Root = Field.Root',
  ]) {
    assert.equal(needsClientBoundary(code), true, code);
  }
  for (const code of [
    'export { Button } from "./button.js"',
    'import type { Field } from "@base-ui/react/field"; export type Props = Field.Root.Props',
    'export function boot() { return "document.body" }',
  ]) {
    assert.equal(needsClientBoundary(code), false, code);
  }
});
