import ts from "typescript";
import { exportMap, sourceFile } from "./entries.mjs";

/** A collection's generated module is documented collectively by this file-level comment. */
export const ICON_DOC_MARKER = "@packageDocumentation";

/** Source entry files behind the concrete (non-pattern) JavaScript exports in package.json. */
export function publicEntries(kit) {
  const files = [];
  for (const target of Object.values(exportMap(kit.pkg))) {
    const file = typeof target === "string" ? target : target.import;
    if (!file || file.includes("*") || !file.endsWith(".js")) continue;
    const source = sourceFile(file, kit);
    if (source) files.push(source);
  }
  return [...new Set(files)];
}

/**
 * Runtime exports (functions, components, hooks, constants and classes) reachable from a
 * public entry without TSDoc. Type-only exports are covered by TypeDoc and the prop check.
 */
export function undocumentedExports(kit) {
  const generated = new Set(kit.collections.map((item) => item.file));
  const config = ts.readConfigFile("tsconfig.json", ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, process.cwd());
  const entries = publicEntries(kit);
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
      if (generated.has(file)) {
        if (!declaration.getSourceFile().text.includes(ICON_DOC_MARKER))
          failures.push(`${file}: generated exports lack the shared ${ICON_DOC_MARKER} comment`);
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
