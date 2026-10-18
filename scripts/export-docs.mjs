import ts from "typescript";
import { existsSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

/** Generated icon modules are documented collectively by this file-level comment. */
export const ICON_DOC_MARKER = "@packageDocumentation";
const ICONS = "src/icons/generated/icons.tsx";

/** Source entry files behind the concrete (non-pattern) JavaScript exports in package.json. */
export function publicEntries(pkg = JSON.parse(readFileSync("package.json", "utf8"))) {
  const files = [];
  for (const target of Object.values(pkg.exports)) {
    const file = typeof target === "string" ? target : target.import;
    if (!file || file.includes("*") || !file.endsWith(".js")) continue;
    const base = file.replace("./dist/", "src/").replace(/\.js$/, "");
    const source = [`${base}.ts`, `${base}.tsx`].find((f) => existsSync(f));
    if (source) files.push(source);
  }
  return [...new Set(files)];
}

/**
 * Runtime exports (functions, components, hooks, constants and classes) reachable from a
 * public entry without TSDoc. Type-only exports are covered by TypeDoc and the prop check.
 */
export function undocumentedExports() {
  const config = ts.readConfigFile("tsconfig.json", ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, process.cwd());
  const entries = publicEntries();
  const program = ts.createProgram(
    [...new Set([...parsed.fileNames, ...entries])],
    parsed.options,
  );
  const checker = program.getTypeChecker();
  const failures = [];
  const seen = new Set();
  for (const entry of entries) {
    const source = program.getSourceFile(entry);
    const module = source && checker.getSymbolAtLocation(source);
    if (!module) continue;
    for (const exported of checker.getExportsOfModule(module)) {
      const symbol =
        exported.flags & ts.SymbolFlags.Alias
          ? checker.getAliasedSymbol(exported)
          : exported;
      if (!(symbol.flags & ts.SymbolFlags.Value) || seen.has(symbol)) continue;
      seen.add(symbol);
      const declaration = symbol.valueDeclaration ?? symbol.declarations?.[0];
      if (!declaration) continue;
      const file = declaration
        .getSourceFile()
        .fileName.replaceAll("\\", "/")
        .replace(`${process.cwd().replaceAll("\\", "/")}/`, "");
      if (file.includes("node_modules")) continue;
      if (file === ICONS) {
        if (!declaration.getSourceFile().text.includes(ICON_DOC_MARKER))
          failures.push(`${file}: generated icons lack the shared ${ICON_DOC_MARKER} comment`);
        continue;
      }
      if (symbol.getDocumentationComment(checker).length) continue;
      // `export const { a, b } = create()`: one statement comment documents every name.
      if (ts.isBindingElement(declaration)) {
        let node = declaration;
        while (node && !ts.isVariableStatement(node)) node = node.parent;
        if (node && ts.getJSDocCommentsAndTags(node).length) continue;
      }
      const line =
        declaration.getSourceFile().getLineAndCharacterOfPosition(declaration.getStart()).line + 1;
      failures.push(`${file}:${line}: public export ${exported.getName()} (via ${entry}) has no TSDoc`);
    }
  }
  return [...new Set(failures)];
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const failures = undocumentedExports();
  console.log(failures.join("\n"));
  console.log(`${failures.length} undocumented public runtime exports`);
}
