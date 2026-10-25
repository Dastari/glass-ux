import ts from "typescript";
import {
  cpSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { bucketCss } from "./css-buckets.mjs";
import { libraryTransformer } from "./client-boundaries.mjs";
// Inputs for the repository's documentation scripts only; nothing imports them at runtime.
// Stylesheets ship with selector lists split so Chromium can bucket them (css-buckets.mjs).
const SCRIPT_ONLY = new Set([
  "src/gallery/api.generated.json",
  "src/gallery/demo-coverage.generated.json",
]);
rmSync("dist", { recursive: true, force: true });
const config = ts.readConfigFile("tsconfig.build.json", ts.sys.readFile);
const parsed = ts.parseJsonConfigFileContent(
  config.config,
  ts.sys,
  process.cwd(),
);
const program = ts.createProgram(parsed.fileNames, parsed.options);
const diagnostics = [
  ...(config.error ? [config.error] : []),
  ...parsed.errors,
  ...ts.getPreEmitDiagnostics(program),
];
if (diagnostics.length) {
  console.error(
    ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCanonicalFileName: (file) => file,
      getCurrentDirectory: ts.sys.getCurrentDirectory,
      getNewLine: () => "\n",
    }),
  );
  process.exit(1);
}
let clientModules = 0;
const result = program.emit(undefined, undefined, undefined, false, {
  before: [libraryTransformer(() => clientModules++)],
});
if (result.emitSkipped || result.diagnostics.length)
  throw new Error("TypeScript could not emit the release");
console.log(`build: ${clientModules} client module boundaries`);
function assets(dir) {
  for (const f of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, f.name);
    if (f.isDirectory()) assets(p);
    else if (!/\.tsx?$/.test(f.name) && !SCRIPT_ONLY.has(p)) {
      const out = p.replace(/^src/, "dist");
      mkdirSync(out.slice(0, out.lastIndexOf("/")), { recursive: true });
      if (p.endsWith(".css"))
        writeFileSync(out, bucketCss(readFileSync(p, "utf8")));
      else cpSync(p, out);
    }
  }
}
assets("src");
