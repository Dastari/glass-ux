import assert from "node:assert/strict";
import { test } from "node:test";
import { publicImports } from "./package-entries.mjs";
import { templateExample, templateIds } from "./template-examples.mjs";

const entries = new Map([["ui/button/index", "glass-ux/button"]]);
const refuse = (source) => {
  throw new Error(`no entry for ${source}`);
};

test("relative imports become package entries; others stay as written", () => {
  const code = `import { Button } from "../../ui/button/index.js";\nimport { useState } from "react";`;
  assert.equal(
    publicImports(code, "src/gallery/templates", entries, refuse),
    `import { Button } from "glass-ux/button";\nimport { useState } from "react";`,
  );
});

test("a module with no public path is refused", () => {
  assert.throws(() => publicImports(`import { x } from "../../ui/button/button.js";`, "src/gallery/templates", entries, refuse), /no entry for ui\/button\/button/);
});

test("every template is public source a project can copy", async () => {
  for (const id of await templateIds()) {
    const code = await templateExample(id);
    assert.doesNotMatch(code, /from\s+["']\./, `${id} has a relative import`);
    assert.doesNotMatch(code, /glass-ux\/gallery/, `${id} imports the gallery`);
    assert.doesNotMatch(code, /\bfa-[a-z]/, `${id} reaches into library class names`);
    assert.doesNotMatch(code, /\bgallery-/, `${id} uses gallery styles`);
  }
});
