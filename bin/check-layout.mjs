import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

function cssFiles(path) {
  if (!existsSync(path))
    throw new Error(`Stylesheet path does not exist: ${path}`);
  if (!statSync(path).isDirectory()) return path.endsWith(".css") ? [path] : [];
  return readdirSync(path).flatMap((name) => cssFiles(join(path, name)));
}
function codeFiles(path) {
  if (!statSync(path).isDirectory())
    return /\.(?:tsx?|jsx?|mjs)$/.test(path) ? [path] : [];
  return readdirSync(path).flatMap((name) => codeFiles(join(path, name)));
}

/** Catch misspelled theme roles before the browser silently drops a layout declaration. */
export function checkThemeVariables(paths) {
  if (!paths.length)
    throw new Error(
      "Pass your stylesheet files or directories to check-layout.",
    );
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const libraryRoot = join(
    root,
    existsSync(join(root, "src")) ? "src" : "dist",
  );
  const library = cssFiles(libraryRoot);
  const files = [...new Set(paths.flatMap((path) => cssFiles(resolve(path))))];
  if (!files.length)
    throw new Error("No CSS files found in the supplied paths.");
  const sources = new Map(
    [...library, ...files].map((file) => [
      file,
      readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, ""),
    ]),
  );
  const definitions = new Set(
    [...sources.values()].flatMap((source) =>
      [...source.matchAll(/(--[\w-]+)\s*:/g)].map((match) => match[1]),
    ),
  );
  for (const file of [
    ...codeFiles(libraryRoot),
    ...paths.flatMap((path) => codeFiles(resolve(path))),
  ]) {
    for (const match of readFileSync(file, "utf8").matchAll(
      /["'](--[\w-]+)["']\s*:/g,
    ))
      definitions.add(match[1]);
  }
  const errors = [];
  for (const file of files) {
    const source = sources.get(file);
    for (const match of source.matchAll(/var\(\s*(--[\w-]+)\s*([,)])/g)) {
      if (match[2] === "," || definitions.has(match[1])) continue;
      const line = source.slice(0, match.index).split("\n").length;
      errors.push(`${file}:${line}: undefined CSS variable ${match[1]}`);
    }
  }
  if (errors.length) throw new Error(errors.join("\n"));
  return files.length;
}
