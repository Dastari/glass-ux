// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanup, render } from "@testing-library/react";
import ts from "typescript";
import { build, type Plugin, type Rolldown } from "vite";
import { afterEach, describe, expect, it } from "vitest";
import { IconAccount, IconCheck } from "../../icons/generated/icons.js";
import { createIcon } from "./icon.js";

afterEach(cleanup);

// Vitest runs from the repository root; jsdom replaces import.meta.url with an http URL.
const srcRoot = join(process.cwd(), "src/");

/** Compile library sources the way `tsc -p tsconfig.build.json` does for the package. */
function tscOutput(): Plugin {
  return {
    name: "glass-ux-tsc-output",
    enforce: "pre",
    load(id) {
      if (!id.startsWith(srcRoot) || !/\.tsx?$/.test(id)) return null;
      return ts.transpileModule(readFileSync(id, "utf8"), {
        fileName: id,
        compilerOptions: {
          target: ts.ScriptTarget.ES2022,
          module: ts.ModuleKind.ESNext,
          jsx: ts.JsxEmit.ReactJSX,
        },
      }).outputText;
    },
  };
}

async function bundle(code: string) {
  const result = await build({
    configFile: false,
    logLevel: "silent",
    root: srcRoot,
    plugins: [
      {
        name: "entry",
        enforce: "pre",
        resolveId: (id) => (id === "virtual:entry" ? "\0entry" : null),
        load: (id) => (id === "\0entry" ? code : null),
      },
      tscOutput(),
    ],
    build: {
      write: false,
      minify: true,
      modulePreload: false,
      rollupOptions: {
        input: "virtual:entry",
        preserveEntrySignatures: "strict",
        external: (id) => /^(react|react-dom|clsx)(\/|$)/.test(id),
      },
    },
  });
  const outputs = (Array.isArray(result) ? result : [result]) as Rolldown.RolldownOutput[];
  return outputs
    .flatMap((output) => output.output)
    .filter((chunk) => chunk.type === "chunk")
    .map((chunk) => chunk.code)
    .join("\n");
}

describe("icons", () => {
  it("renders generated content lazily and reuses it", () => {
    let calls = 0;
    const IconSample = createIcon("sample", () => {
      calls += 1;
      return <path d="M4 4H20" />;
    });
    expect(calls).toBe(0);
    const { container } = render(
      <>
        <IconSample label="Sample" />
        <IconSample />
      </>,
    );
    expect(calls).toBe(1);
    expect(container.querySelectorAll('svg[data-icon="sample"] path')).toHaveLength(2);
    expect(container.querySelector('[role="img"]')).toHaveAccessibleName("Sample");
  });

  it("accepts static children", () => {
    const IconStatic = createIcon("static", <circle cx="12" cy="12" r="4" />);
    const { container } = render(<IconStatic size="sm" />);
    expect(container.querySelector("svg circle")).not.toBeNull();
    expect(IconStatic.iconName).toBe("static");
  });

  it("renders generated icons", () => {
    const { container } = render(<IconAccount label="Account" />);
    expect(container.querySelector('svg[data-icon="account"]')?.childElementCount).toBeGreaterThan(0);
    expect(IconCheck.iconName).toBe("check");
  });

  it("tree-shakes the generated set when one icon is imported", async () => {
    const code = await bundle(
      `export { IconAccount } from "${srcRoot}icons/generated/icons.tsx";`,
    );
    const named = (name: string) => new RegExp(`[\`"']${name}[\`"']`);
    expect(code).toMatch(named("account"));
    expect(code).not.toMatch(named("access-point"));
    expect(code).not.toMatch(named("activity"));
    // One icon plus the shared frame; the full set is about 80 KB minified.
    expect(code.length).toBeLessThan(3_000);
  }, 30_000);
});
